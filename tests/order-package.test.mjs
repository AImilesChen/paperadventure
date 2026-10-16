import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('a delivered order renders its original download card during theme correction', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { OrderPackage, PackRemake } = await vite.ssrLoadModule('/src/livePages.jsx');
    const order = {
      id: 'example-order', kind: 'custom', sku: 'custom_classroom', status: 'published',
      filesReady: true, paper: 'A4', plan: { title: 'A classroom adventure' },
      planReview: { confirmedVersion: 1, themeReplanAttempts: 1, themeReplanFailed: true },
      themePlanRepairAvailable: true, contentReviewPassed: true,
    };
    const html = renderToStaticMarkup(createElement(OrderPackage, { order, orderId: order.id, selectedPaper: 'A4' }));
    assert.match(html, /Original pack ready to download/);
    assert.match(html, /corrected theme plan and replacement PDFs have not been delivered/);
    assert.match(html, /Player Pack/);
    assert.match(html, /Teacher Guide/);
    const retryHtml = renderToStaticMarkup(createElement(PackRemake, { order: {
      ...order, paidAt: '2026-10-16', gamePackVersion: 2,
      planReview: { ...order.planReview, themeReplanAttempts: 2, themeReplanFailureCode: null },
    }, refresh: () => {} }));
    assert.match(retryHtml, /one final explicit attempt/);
    assert.match(retryHtml, /did not record a specific failure reason/);
    assert.match(retryHtml, /Retry corrected theme plan at no charge/);
  } finally {
    await vite.close();
  }
});
