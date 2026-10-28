import { pageFor } from '../shared/page-manifest.mjs';
import { analyticsConfig } from './analytics-config.js';
import { isAnalyticsPage } from './analytics-route.mjs';
import { conversionProperties } from './conversionEvents.mjs';

// Cookieless traffic measurement starts on eligible public pages unless opted out.
// Cookie analytics and recordings require a separate, current explicit grant.
const gaId = import.meta.env.VITE_GA4_ID?.trim() || analyticsConfig.ga4Id;
const clarityId = import.meta.env.VITE_CLARITY_ID?.trim() || analyticsConfig.clarityId;
const ahrefsKey = import.meta.env.VITE_AHREFS_KEY?.trim() || analyticsConfig.ahrefsKey;
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim() || analyticsConfig.plausibleDomain;
const released = import.meta.env.VITE_ANALYTICS_RELEASED === undefined
  ? analyticsConfig.released === true : import.meta.env.VITE_ANALYTICS_RELEASED === 'true';
export const enabledAnalyticsProviders = Object.freeze({
  ga4: released && /^G-[A-Z0-9]+$/.test(gaId),
  clarity: released && /^[a-z0-9]+$/i.test(clarityId),
  ahrefs: released && /^[A-Za-z0-9]+$/.test(ahrefsKey),
  plausible: released && plausibleDomain === 'paperadventure.app',
});
const consentKey = 'paw-analytics-choice-v3';
const basicChoiceKey = 'paw-basic-analytics-choice-v1';
let sessionChoice = null;
let sessionBasicChoice = null;
let basicStarted = false;
let enhancedStarted = false;
let lastPath = '';

export function analyticsAvailable() {
  return Object.values(enabledAnalyticsProviders).some(Boolean);
}

export function analyticsProviderNames(group = 'all') {
  const names={ga4:'Google Analytics 4',clarity:'Microsoft Clarity',ahrefs:'Ahrefs Web Analytics',plausible:'Plausible'};
  return Object.entries(enabledAnalyticsProviders).filter(([name,enabled])=>enabled && (group==='all'||(group==='basic'?['ahrefs','plausible']:['ga4','clarity']).includes(name))).map(([name])=>names[name]);
}

function safeMeasurementUrl(url) {
  // Ahrefs includes URL parameters. Only known non-personal campaign/setting
  // values are eligible; never send arbitrary tokens, emails or URL fragments.
  if(url.hash)return false;
  return [...url.searchParams].every(([key,value])=>key==='setting'
    ? /^(home|classroom)$/.test(value)
    : key==='ref' ? value==='producthunt'
    : /^utm_(source|medium|campaign|term|content|id)$/.test(key)&&/^[a-z0-9_-]{1,80}$/i.test(value));
}

export function analyticsLocationAllowed() {
  if(typeof window==='undefined'||window.location.origin!=='https://paperadventure.app'||!isAnalyticsPage(window.location.pathname))return false;
  if(!safeMeasurementUrl(new URL(window.location.pathname+(window.location.search||'')+(window.location.hash||''),window.location.origin)))return false;
  // A private same-site page can leave its order/account URL in document.referrer.
  // Skip that document rather than passing a private referrer to a vendor.
  if(document.referrer){
    try {const previous=new URL(document.referrer);if(!safeMeasurementUrl(previous)||(previous.origin===window.location.origin&&previous.pathname!=='/'&&!isAnalyticsPage(previous.pathname)))return false;}
    catch {return false;}
  }
  return true;
}

export function basicAnalyticsAllowed() {
  try {const value=localStorage.getItem(basicChoiceKey);if(value==='granted'||value==='denied')return value==='granted';}
  catch { /* Fall back to the current document's preference. */ }
  return sessionBasicChoice !== 'denied';
}

export function analyticsChoice() {
  try {
    const value = localStorage.getItem(consentKey);
    if (value === 'granted' || value === 'denied') return value;
  } catch { /* Use this page's in-memory choice when storage is unavailable. */ }
  return sessionChoice;
}

export function saveAnalyticsChoice(value) {
  saveAnalyticsPreferences({basic:basicAnalyticsAllowed(),enhanced:value});
}

export function saveAnalyticsPreferences({basic,enhanced:value}) {
  if (value !== 'granted' && value !== 'denied') throw new Error('Invalid analytics choice');
  if(typeof basic!=='boolean')throw new Error('Invalid basic analytics choice');
  sessionChoice = value;
  sessionBasicChoice = basic ? 'granted' : 'denied';
  try { localStorage.setItem(consentKey, value); } catch { /* Session-only choice if storage is unavailable. */ }
  try { localStorage.setItem(basicChoiceKey, sessionBasicChoice); } catch { /* Session-only preference. */ }
  if ((!basic&&basicStarted)||(value==='denied'&&enhancedStarted)) {
    window.gtag?.('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    window.location.reload(); // Persist first, then unload collectors already in this document.
    return;
  }
  startAnalytics();
}

function loadScript(src, attributes = {}) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

export function startAnalytics() {
  if (!analyticsAvailable() || !analyticsLocationAllowed()) return;
  if(!basicStarted&&basicAnalyticsAllowed()){
    basicStarted=true;
    if(enabledAnalyticsProviders.ahrefs)loadScript('https://analytics.ahrefs.com/analytics.js', { 'data-key': ahrefsKey });
    if(enabledAnalyticsProviders.plausible){
      // Preserve actions made before the existing async tracker has loaded.
      window.plausible = window.plausible || function plausible() { (window.plausible.q = window.plausible.q || []).push(arguments); };
      loadScript(analyticsConfig.plausibleScript, { 'data-domain': plausibleDomain });
    }
  }
  if(enhancedStarted||analyticsChoice()!=='granted')return;
  enhancedStarted=true;
  if(enabledAnalyticsProviders.ga4){
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
  }
  if(enabledAnalyticsProviders.clarity){
    window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
  }
  trackPageView();
}

export function trackPageView() {
  if (!enhancedStarted || analyticsChoice()!=='granted' || !enabledAnalyticsProviders.ga4 || !analyticsLocationAllowed()) return;
  const page = window.location.pathname;
  if (page === lastPath) return;
  const previous = lastPath ? `${window.location.origin}${lastPath}` : document.referrer;
  lastPath = page;
  window.gtag('event', 'page_view', {
    page_title: pageFor(page)?.title || document.title,
    page_location: `${window.location.origin}${page}`,
    page_referrer: previous,
  });
}

export function trackEvent(name, properties = {}) {
  if (!enhancedStarted || analyticsChoice()!=='granted' || !analyticsLocationAllowed() || !/^[a-z][a-z0-9_]{1,39}$/.test(name)) return;
  const safe = Object.fromEntries(Object.entries(properties).filter(([key, value]) =>
    /^[a-z_]+$/.test(key) && typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value)));
  if(enabledAnalyticsProviders.ga4)window.gtag?.('event', name, { ...safe, page_path: window.location.pathname });
  if(enabledAnalyticsProviders.clarity)window.clarity?.('event', name);
}

export function wireAnalyticsEvents() {
  if (typeof window === 'undefined') return;
  window.addEventListener('popstate', trackPageView);
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const anchor = target.closest('a[href]');
    if (anchor) {
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const current = window.location.pathname;
      const setting = url.searchParams.get('setting');
      if (anchor.closest('.home-funnel') && /^\/en\/samples\/(home|classroom)\/$/.test(url.pathname)) {
        trackConversionEvent('home_sample_click', { setting: url.pathname.split('/')[3] });
      } else if (anchor.closest('.sample-download-page') && ['/en/for-home/','/en/for-classroom/'].includes(url.pathname)) {
        trackConversionEvent('sample_browse_themes', { setting: url.pathname === '/en/for-home/' ? 'home' : 'classroom' });
      } else if (anchor.closest('.theme-detail-page') && url.pathname === '/en/checkout/' && url.searchParams.get('kind') === 'ready') {
        trackConversionEvent('product_checkout_click', { setting, theme: url.searchParams.get('theme') });
      }
      if (anchor.closest('.hero') && url.pathname === '/en/create/') trackEvent('hero_cta_click', { location: 'hero' });
      else if (anchor.closest('.theme-card, .product-theme-card') && url.pathname.startsWith('/en/themes/')) trackEvent('theme_open', { theme: url.pathname.split('/')[3] || 'unknown' });
      else if (url.pathname === '/en/pricing/') trackEvent('pricing_open', { location: current === '/en/' ? 'home' : 'other' });
      else if (url.pathname.startsWith('/en/checkout/')) trackEvent('checkout_preview_open');
      return;
    }
    const button = target.closest('button');
    if (button?.closest('.faq-item') && button.getAttribute('aria-expanded') === 'false') trackEvent('faq_open');
  }, { capture: true });
}

export function trackConversionEvent(name, properties = {}) {
  const safe = conversionProperties(name, properties);
  if (!safe || !analyticsLocationAllowed()) return;
  // Independent preferences: declining cookies does not disable opted-in basic
  // measurement; opting out of basic does not enable it through enhanced consent.
  try {
    if (basicStarted && enabledAnalyticsProviders.plausible && basicAnalyticsAllowed()) window.plausible?.(name, { props: safe });
  } catch { /* Measurement must never interrupt navigation or file delivery. */ }
  try { trackEvent(name, safe); } catch { /* Optional enhanced measurement. */ }
}
