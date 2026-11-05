import {ApiError} from './domain.mjs';
import {escapeProduct} from '../shared/escape-products.mjs';
export async function serveEscapeExtra(request,env,orderId,role,deps){
 const attachment=role.match(/^(A4|Letter)-(setup|role-[ABC])\.pdf$/);
 if(!['bundle','companion'].includes(role)&&!attachment)throw new ApiError(404,'FILE_NOT_FOUND','File not found.');
 const hash=await deps.authenticate(request,env);
 if(!hash)throw new ApiError(401,'EMAIL_VERIFICATION_REQUIRED','Sign in with your purchase account first.');
 if(!env.DB||!env.PRIVATE_FILES)throw new ApiError(503,'FILES_NOT_READY','Private files are unavailable.');
 const q=(sql,...v)=>env.DB.prepare(sql).bind(...v);
 const order=await q('SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ?',orderId,hash).first();
 if(!order||order.status!=='published'||order.product_kind!=='ready')throw new ApiError(404,'FILE_NOT_FOUND','File not found.');
 let spec;try{spec=JSON.parse(order.purchase_spec_json);}catch{throw new ApiError(404,'FILE_NOT_FOUND','File not found.');}
 if(!escapeProduct(spec.themeId))throw new ApiError(404,'FILE_NOT_FOUND','File not found.');
 if(attachment&&spec.themeId!=='midnight-masquerade')throw new ApiError(404,'FILE_NOT_FOUND','File not found.');
 const right=await q("SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'",orderId).first();
 if(!deps.accessActive(right)||!right.ready_pack_id||right.ready_pack_id!==spec.readyPackId)throw new ApiError(403,'ACCESS_EXPIRED','Online access is unavailable for this order.');
 await deps.assertNotRefunded(env,orderId);
 const file=attachment
  ? await q('SELECT r2_key,sha256,bytes FROM ready_pack_attachments WHERE ready_pack_id = ? AND paper = ? AND role = ?',right.ready_pack_id,attachment[1],attachment[2]).first()
  : await q('SELECT r2_key,sha256,bytes FROM ready_pack_extras WHERE ready_pack_id = ? AND role = ?',right.ready_pack_id,role).first();
 if(!file)throw new ApiError(404,'FILE_NOT_FOUND','Your complete package is not ready.');
 const object=await env.PRIVATE_FILES.get(file.r2_key);
 if(!object)throw new ApiError(503,'FILE_NOT_READY','The file is temporarily unavailable. Please retry.');
 const bytes=await object.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(bytes.byteLength!==file.bytes||digest!==file.sha256)throw new ApiError(503,'FILE_INTEGRITY_FAILED','The file could not be verified.');
 await deps.assertNotRefunded(env,orderId);
 await deps.record(env,orderId,'file_served',`escape:${role}:${digest}`,{role,sha256:digest});
 const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','referrer-policy':'no-referrer'};
 if(attachment)return new Response(bytes,{headers:{...headers,'content-type':'application/pdf','content-disposition':`attachment; filename="${role}"`}});
 if(role==='bundle')return new Response(bytes,{headers:{...headers,'content-type':'application/zip','content-disposition':`attachment; filename="${spec.themeId==='fold-city'?'The-Secret-of-Fold-City':spec.themeId==='last-letter'?'The-Last-Letter-Before-the-Storm':spec.themeId==='thirteenth-hour'?'The-Clockmakers-Thirteenth-Hour':spec.themeId==='midnight-masquerade'?'The-Midnight-Masquerade':'The-Missing-Seventh-Carriage'}-v2.zip"`}});
 let html=new TextDecoder().decode(bytes);
 return new Response(html,{headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"}});
}
