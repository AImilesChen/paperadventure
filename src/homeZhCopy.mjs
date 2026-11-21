import {t,currentLocale} from './i18n/index.mjs';
import copy from './homeZhCopy.json';
export function homeCopy(key,values){return currentLocale()==='zh'&&Object.hasOwn(copy,key)?copy[key]:t(key,values);}
