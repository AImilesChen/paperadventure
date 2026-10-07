import { pageFor } from '../shared/page-manifest.mjs';

// No vendor script loads until IDs, the privacy release gate, and the visitor's
// explicit choice are all present. Events never include form text or query data.
const gaId = import.meta.env.VITE_GA4_ID?.trim() || '';
const clarityId = import.meta.env.VITE_CLARITY_ID?.trim() || '';
const released = import.meta.env.VITE_ANALYTICS_RELEASED === 'true';
const consentKey = 'paw-analytics-choice-v1';
let started = false;
let lastPath = '';

export function analyticsAvailable() {
  return released && /^G-[A-Z0-9]+$/.test(gaId) && /^[a-z0-9]+$/i.test(clarityId);
}

export function analyticsChoice() {
  try {
    const value = localStorage.getItem(consentKey);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch { return null; }
}

export function saveAnalyticsChoice(value) {
  if (value !== 'granted' && value !== 'denied') throw new Error('Invalid analytics choice');
  try { localStorage.setItem(consentKey, value); } catch { /* Session-only choice if storage is unavailable. */ }
  if (value === 'granted') startAnalytics();
  else if (started) window.location.reload(); // Unloads both vendors after withdrawal.
}

function loadScript(src) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function startAnalytics() {
  if (started || !analyticsAvailable() || analyticsChoice() !== 'granted') return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false });
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);

  window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
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
