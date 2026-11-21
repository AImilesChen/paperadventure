import {ApiError} from './domain.mjs';
import {paidDocumentGame,readyEnglishRepairGame} from '../shared/ready-document-editions.mjs';
const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const COMPLETE=`(SELECT COUNT(*) FROM localized_ready_pack_files f WHERE f.pack_id=l.id AND length(f.sha256)=64 AND f.sha256 NOT GLOB '*[^0-9a-f]*' AND f.bytes>0 AND substr(f.r2_key,1,length('ready-localized/'||p.theme_world_id||'/classroom/'||l.locale||'/'||l.version||'/'))='ready-localized/'||p.theme_world_id||'/classroom/'||l.locale||'/'||l.version||'/')=4`;
// Immutable language/repair revisions supplement original slots and entitlements.
export async function readyLanguageEdition(env,readyPackId,locale,version=null){
 if(!['en','zh'].includes(locale))throw new ApiError(400,'INVALID_DOCUMENT_LOCALE','Choose English or Simplified Chinese for the PDF files.');
 const ocean=env.PAID_READY_ZH_ENABLED==='true',museum=env.PAID_MUSEUM_EDITIONS_ENABLED==='true',library=env.PAID_LIBRARY_EDITIONS_ENABLED==='true';
 if(!ocean&&!museum&&!library)return null;
 try{return await q(env,`SELECT l.id,l.locale,l.version,l.ready_pack_id,p.theme_world_id,p.setting FROM localized_ready_packs l JOIN ready_packs p ON p.id=l.ready_pack_id JOIN theme_worlds w ON w.id=p.theme_world_id
  WHERE l.ready_pack_id=? AND l.locale=? AND l.status='published' AND p.status='published' AND w.status='published' AND p.setting='classroom'
  AND ((p.theme_world_id='ocean' AND ?=1 AND l.locale='zh') OR (p.theme_world_id='museum' AND ?=1) OR (p.theme_world_id='library' AND ?=1))
  AND l.source_english_version=p.version AND ${COMPLETE} ${version?'AND l.version=?':''}
  ORDER BY l.published_at DESC,l.version DESC LIMIT 1`,readyPackId,locale,Number(ocean),Number(museum),Number(library),...(version?[version]:[])).first();
 }catch(error){if(/no such table/.test(error.message))return null;throw error;}
}
export async function readyDocumentEditions(env,pack){
 const editions=[{locale:'en',version:pack.version}];if(!paidDocumentGame(pack.theme_world_id,pack.setting))return editions;
 if(readyEnglishRepairGame(pack.theme_world_id)){
  const repaired=await readyLanguageEdition(env,pack.id,'en');if(repaired)editions[0]={locale:'en',version:repaired.version};
 }
 const zh=await readyLanguageEdition(env,pack.id,'zh');if(zh)editions.push({locale:'zh',version:zh.version});return editions;
}
export async function readyLanguageFile(env,readyPackId,locale,version,paper,role){
 const edition=await readyLanguageEdition(env,readyPackId,locale,version);
 if(!edition)throw new ApiError(409,'DOCUMENT_EDITION_UNAVAILABLE','The selected PDF language edition is unavailable. Choose an available language or retry.');
 const file=await q(env,'SELECT r2_key,sha256,bytes FROM localized_ready_pack_files WHERE pack_id=? AND paper=? AND role=?',edition.id,paper,role).first();
 const prefix=`ready-localized/${edition.theme_world_id}/classroom/${locale}/${edition.version}/`;
 if(!file?.r2_key.startsWith(prefix)||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isInteger(file.bytes)||file.bytes<1)throw new ApiError(503,'DOCUMENT_FILE_INCOMPLETE','The selected language file is not ready.');
 return {file,edition};
}
