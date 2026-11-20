import {routeLocale} from './locale.mjs';
import {translate} from './locale-text.mjs';
// For deterministic, source-owned teaching explanations only. Customer data
// and generated stories are rendered directly, outside this helper.
export const uiText=(value,variables={})=>translate(value,routeLocale(typeof window==='undefined'?'/en/':window.location.pathname),variables);
