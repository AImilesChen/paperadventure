import { pageFor } from '../shared/page-manifest.mjs';
import { analyticsConfig } from './analytics-config.js';

// No vendor script loads until the privacy release gate and the visitor's
// explicit choice are both present. Custom events omit form text and queries.
const gaId = import.meta.env.VITE_GA4_ID?.trim() || analyticsConfig.ga4Id;
const clarityId = import.meta.env.VITE_CLARITY_ID?.trim() || analyticsConfig.clarityId;
const ahrefsKey = import.meta.env.VITE_AHREFS_KEY?.trim() || analyticsConfig.ahrefsKey;
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim() || analyticsConfig.plausibleDomain;
const released = import.meta.env.VITE_ANALYTICS_RELEASED === 'true';
// Adding two vendors requires a new opt-in; never reuse the earlier choice.
const consentKey = 'paw-analytics-choice-v2';
let sessionChoice = null;
let started = false;
let lastPath = '';

export function analyticsAvailable() {
  return released && /^G-[A-Z0-9]+$/.test(gaId) && /^[a-z0-9]+$/i.test(clarityId)
    && /^[A-Za-z0-9]+$/.test(ahrefsKey) && plausibleDomain === 'paperadventure.app';
}

export function analyticsChoice() {
  try {
    const value = localStorage.getItem(consentKey);
    if (value === 'granted' || value === 'denied') return value;
  } catch { /* Use this page's in-memory choice when storage is unavailable. */ }
  return sessionChoice;
}

export function saveAnalyticsChoice(value) {
  if (value !== 'granted' && value !== 'denied') throw new Error('Invalid analytics choice');
  sessionChoice = value;
  try { localStorage.setItem(consentKey, value); } catch { /* Session-only choice if storage is unavailable. */ }
  if (value === 'granted') startAnalytics();
  else if (started) {
    window.gtag?.('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    window.location.reload(); // Unloads all four vendor scripts after withdrawal.
  }
}

function loadScript(src, attributes = {}) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

export function startAnalytics() {
  if (started || !analyticsAvailable() || analyticsChoice() !== 'granted') return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false });
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);

  window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
  loadScript('https://analytics.ahrefs.com/analytics.js', { 'data-key': ahrefsKey });
  loadScript(analyticsConfig.plausibleScript, { 'data-domain': plausibleDomain });
  trackPageView();
}

export function trackPageView() {
  if (!started) return;
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
  if (!started || !/^[a-z][a-z0-9_]{1,39}$/.test(name)) return;
  const safe = Object.fromEntries(Object.entries(properties).filter(([key, value]) =>
    /^[a-z_]+$/.test(key) && typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value)));
  window.gtag('event', name, { ...safe, page_path: window.location.pathname });
  window.clarity('event', name);
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
      if (anchor.closest('.hero') && url.pathname === '/en/create/') trackEvent('hero_cta_click', { location: 'hero' });
      else if (anchor.closest('.theme-card, .product-theme-card') && url.pathname.startsWith('/en/themes/')) trackEvent('theme_open', { theme: url.pathname.split('/')[3] || 'unknown' });
      else if (url.pathname === '/en/pricing/') trackEvent('pricing_open', { location: current === '/en/' ? 'home' : 'other' });
      else if (url.pathname.startsWith('/en/checkout/')) trackEvent('checkout_preview_open');
      return;
    }
    const button = target.closest('button');
    if (button?.closest('.faq-item') && button.getAttribute('aria-expanded') === 'false') trackEvent('faq_open');
  });
}
