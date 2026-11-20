// Add a locale only when its dictionary and route coverage are ready.
export const LOCALES=Object.freeze({en:{label:'English',html:'en',prefix:'/en'},zh:{label:'简体中文',html:'zh-Hans',prefix:'/zh'}});
export const localeCodes=Object.freeze(Object.keys(LOCALES));
export const routeLocale=(path='/')=>localeCodes.find(code=>path===LOCALES[code].prefix||path.startsWith(LOCALES[code].prefix+'/'))||'en';
export const basePath=(value='/')=>typeof value==='string'?value.replace(new RegExp('^/('+localeCodes.join('|')+')(?=/|$)'),'/en'):value;
export function localePath(value,locale='en'){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return value;
 const match=value.match(/^([^?#]*)([?#].*)?$/),pathname=match[1];
 if(!localeCodes.some(code=>pathname===LOCALES[code].prefix||pathname.startsWith(LOCALES[code].prefix+'/')))return value;
 return basePath(pathname).replace(/^\/en(?=\/|$)/,LOCALES[locale]?.prefix||'/en')+(match[2]||'');
}
export function switchLanguage(path,search='',hash='',locale='en'){
 const params=new URLSearchParams(search);
 for(const key of ['returnTo','next'])if(params.has(key))params.set(key,localePath(params.get(key),locale));
 return localePath(path,locale)+(params.size?'?'+params:'')+(/^#[a-zA-Z0-9_-]*$/.test(hash)?hash:'');
}
export const htmlLanguage=locale=>LOCALES[locale]?.html||'en';
