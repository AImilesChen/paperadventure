import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import {routeLocale,htmlLanguage} from '../shared/locale.mjs';
import {registerMessages} from '../shared/locale-text.mjs';
import "./styles.css";

async function start(){
const locale=routeLocale(window.location.pathname);
document.documentElement.lang=htmlLanguage(locale);
if(locale!=='en'){
  const response=await fetch(`/locales/${locale}.json?v=${__LOCALE_REVISION__}`);
  if(!response.ok)throw Error('Language dictionary unavailable');
  registerMessages(locale,await response.json());
}
const [{App},{AnalyticsChoices},{startAnalytics,wireAnalyticsEvents}]=await Promise.all([import('./App.jsx'),import('./AnalyticsChoices.jsx'),import('./analytics.js')]);
wireAnalyticsEvents();
startAnalytics();
const root = document.getElementById("root");
const app =
<React.StrictMode>
    <App />
    <AnalyticsChoices />
  </React.StrictMode>;

if (root.hasChildNodes()) hydrateRoot(root, app);else
createRoot(root).render(app);
}
start().catch(()=>{
  // Keep pre-rendered content readable if a dictionary/chunk cannot load.
  const notice=document.createElement('p');notice.setAttribute('role','alert');
  notice.textContent=routeLocale(window.location.pathname)==='zh'?'页面交互暂时未能加载，请刷新重试。':'Page controls could not load. Please refresh to retry.';
  document.getElementById('root').prepend(notice);
});
