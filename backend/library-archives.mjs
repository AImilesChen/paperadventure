const statement=(db,sql,...values)=>db.prepare(sql).bind(...values);

export async function archivedDrafts(db,hash) {
  const rows=await statement(db,'SELECT id,draft_json,removed_at FROM library_draft_archives WHERE email_hash=? AND restored_at IS NULL ORDER BY removed_at DESC LIMIT 50',hash).all();
  return (rows.results||[]).map(row=>{
    let spec={};try{spec=JSON.parse(row.draft_json);}catch{}
    return {id:row.id,title:spec.customIdea||spec.themeId||'Saved idea',setting:spec.setting,removedAt:row.removed_at};
  });
}

export async function removedDraftSpecs(db,hash) {
  const rows=await statement(db,'SELECT draft_json FROM library_draft_archives WHERE email_hash=? AND restored_at IS NULL ORDER BY removed_at DESC LIMIT 50',hash).all();
  return (rows.results||[]).flatMap(row=>{try{return [JSON.parse(row.draft_json)];}catch{return [];}});
}

export async function archiveSavedDraft(db,hash) {
  const id=crypto.randomUUID();
  await db.batch([
    statement(db,'INSERT INTO library_draft_archives(id,email_hash,draft_json,source_updated_at) SELECT ?,email_hash,draft_json,updated_at FROM adult_drafts WHERE email_hash=?',id,hash),
    statement(db,'DELETE FROM adult_drafts WHERE email_hash=? AND EXISTS(SELECT 1 FROM library_draft_archives a WHERE a.id=? AND a.email_hash=adult_drafts.email_hash AND a.draft_json=adult_drafts.draft_json AND a.source_updated_at=adult_drafts.updated_at)',hash,id),
  ]);
}

export async function restoreSavedDraft(db,hash,id) {
  const row=await statement(db,'SELECT draft_json FROM library_draft_archives WHERE id=? AND email_hash=? AND restored_at IS NULL',id,hash).first();
  if(!row)return {missing:true};
  const result=await db.batch([
    statement(db,'INSERT INTO adult_drafts(email_hash,draft_json) SELECT email_hash,draft_json FROM library_draft_archives WHERE id=? AND email_hash=? AND restored_at IS NULL ON CONFLICT(email_hash) DO NOTHING',id,hash),
    statement(db,'UPDATE library_draft_archives SET restored_at=CURRENT_TIMESTAMP WHERE id=? AND email_hash=? AND restored_at IS NULL AND changes()=1',id,hash),
  ]);
  if(!result[0]?.meta?.changes)return {conflict:true};
  return {draft:JSON.parse(row.draft_json)};
}
