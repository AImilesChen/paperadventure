import {dictionaries} from './locale-messages.mjs';
export {dictionaries};
export function registerMessages(locale,messages){dictionaries[locale]=messages;}
export function translate(value,locale='en',variables={}){
 if(typeof value!=='string')return value;
 const key=value.trim(),messages=dictionaries[locale]||{};
 const translated=Object.hasOwn(messages,key)?value.replace(key,messages[key]):value;
 return translated.replace(/\{(value\d+)\}/g,(match,key)=>Object.hasOwn(variables,key)?String(variables[key]??''):match);
}
