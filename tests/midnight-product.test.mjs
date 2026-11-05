import test from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';import {escapeProducts} from '../shared/escape-products.mjs';import {pageFor} from '../shared/page-manifest.mjs';
const path='/en/escape-room-games/the-midnight-masquerade/';
test('midnight public page and order files match the household delivery contract',async()=>{const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});try{
 const {EscapeMidnightDetail}=await vite.ssrLoadModule('/src/escapeMidnight.jsx');const {OrderPackage}=await vite.ssrLoadModule('/src/livePages.jsx');
 const Link=({to,children,...p})=>createElement('a',{href:to,...p},children);const product=escapeProducts.find(p=>p.id==='midnight-masquerade');assert.equal(product.version,'v2.0');assert.equal(product.unitAmount,999);assert.equal(pageFor(path).indexable,true);
 const catalog={escapeGames:[{...product,home:{readyStatus:'published'}}],offers:[{sku:'ready_home',saleEnabled:true}]};const html=renderToStaticMarkup(createElement(EscapeMidnightDetail,{Link,catalog}));
 assert.match(html,/theme=midnight-masquerade/);assert.match(html,/22 player sheets/);assert.match(html,/not yet been verified/);assert.match(html,/adult host/);assert.doesNotMatch(html,/Iris|MOON.*FELT.*LOWER/);
 const paused=renderToStaticMarkup(createElement(EscapeMidnightDetail,{Link,catalog:{...catalog,offers:[]}}));assert.doesNotMatch(paused,/href="[^\"]*checkout/);
 for(const paper of ['A4','Letter']){const order={id:'midnight-fixture',kind:'ready',sku:'ready_home',themeId:product.id,status:'published',filesReady:true,amountTotal:999};const h=renderToStaticMarkup(createElement(OrderPackage,{order,orderId:order.id,selectedPaper:paper}));for(const role of ['setup','role-A','role-B','role-C'])assert.ok(h.includes(`/escape/${paper}-${role}.pdf`));assert.match(h,/escape\/companion/);assert.match(h,/Download complete game/);}
}finally{await vite.close();}});

