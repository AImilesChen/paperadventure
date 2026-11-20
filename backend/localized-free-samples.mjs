import {ApiError} from './domain.mjs';

export function sampleLocale(request) {
 const values=new URL(request.url).searchParams.getAll('locale');
 if(values.length>1||values.length===1&&!['en','zh'].includes(values[0]))throw new ApiError(400,'INVALID_SAMPLE_LOCALE','Choose a supported PDF language.');
 return values[0]||'en';
}

export async function localizedFreePack(env,setting,locale='zh') {
 if(locale!=='zh'||env.FREE_SAMPLE_ENABLED!=='true'||env.FREE_SAMPLE_ZH_ENABLED!=='true'||!env.DB||!env.PRIVATE_FILES)return null;
 return env.DB.prepare(`SELECT p.* FROM localized_free_packs p
  JOIN theme_worlds w ON w.id='celebration' AND w.status='published'
  WHERE p.locale=? AND p.setting=? AND p.status='published'
   AND (SELECT COUNT(*) FROM localized_free_pack_files f WHERE f.pack_id=p.id)=4
  ORDER BY p.published_at DESC,p.id DESC LIMIT 1`).bind(locale,setting).first();
}

export async function localizedFreeSample(request,env,setting,paper,role,verifyPdf) {
 const locale=sampleLocale(request),pack=await localizedFreePack(env,setting,locale);
 if(!pack)throw new ApiError(404,'SAMPLE_LANGUAGE_NOT_PUBLISHED','The Chinese game PDF is not available yet.');
 const file=await env.DB.prepare('SELECT * FROM localized_free_pack_files WHERE pack_id=? AND paper=? AND role=?').bind(pack.id,paper,role).first();
 if(!file)throw new ApiError(404,'FILE_NOT_FOUND','The sample file is unavailable.');
 const bytes=await verifyPdf(env,file);
 return new Response(bytes,{headers:{
  'content-type':'application/pdf',
  'content-disposition':`attachment; filename="celebration-${setting}-${role}-zh-${paper}.pdf"`,
  'cache-control':'public, max-age=300','x-content-type-options':'nosniff',
  'x-paper-adventure-locale':locale,'x-paper-adventure-pack-version':pack.version,
 }});
}
