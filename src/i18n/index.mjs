import {translate} from '../../shared/locale-text.mjs';
import {routeLocale,localePath,switchLanguage} from '../../shared/locale.mjs';
export const currentLocale=()=>routeLocale(typeof window==='undefined'?'/en/':window.location.pathname);
export const localHref=(value,locale=currentLocale())=>{
 const result=localePath(value,locale);
 if(typeof result!=='string'||!/^\/(?:en|zh)(?:\/|\?)/.test(result)||!/[?&](?:returnTo|next)=/.test(result))return result;
 const url=new URL(result,'https://local.invalid');
 return switchLanguage(url.pathname,url.search,url.hash,locale);
};
export const t=(value,variables={},locale=currentLocale())=>translate(value,typeof variables==='string'?variables:locale,typeof variables==='object'&&variables?variables:{});
export function useLocale(){const locale=currentLocale();return {locale,t:value=>translate(value,locale),href:value=>localePath(value,locale)};}
