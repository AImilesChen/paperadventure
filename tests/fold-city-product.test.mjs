import test from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';import {escapeProducts} from '../shared/escape-products.mjs';import {pageFor} from '../shared/page-manifest.mjs';
const path='/en/escape-room-games/the-secret-of-fold-city/';
test('Fold City page and owned-order delivery match the continuous paper game',async()=>{const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});try{
 const {EscapeFoldCityDetail}=await vite.ssrLoadModule('/src/escapeFoldCity.jsx');const {OrderPackage}=await vite.ssrLoadModule('/src/livePages.jsx');
 const Link=({to,children,...p})=>createElement('a',{href:to,...p},children);const product=escapeProducts.find(p=>p.id==='fold-city');assert.equal(product.version,'v2.0');assert.equal(product.unitAmount,999);assert.equal(pageFor(path).indexable,true);
 assert.deepEqual(escapeProducts.map(p=>p.id),['seventh-carriage','midnight-masquerade','thirteenth-hour','last-letter','fold-city']);
 const catalog={escapeGames:[{...product,home:{readyStatus:'published'}}],offers:[{sku:'ready_home',saleEnabled:true}]};const html=renderToStaticMarkup(createElement(EscapeFoldCityDetail,{Link,catalog}));
 for(const re of [/theme=fold-city/,/10 player sheets/,/12-page Adult Guide/,/glue stick/,/176 mm/,/88 mm/,/2–4 players/,/one continuous spatial challenge/i,/not yet been verified/,/provisional/,/five optional/,/digital download/])assert.match(html,re);
 assert.doesNotMatch(html,/A2F|B2F|C1F|28 puzzles|six acts|40.60 minutes/i);
 const paused=renderToStaticMarkup(createElement(EscapeFoldCityDetail,{Link,catalog:{...catalog,offers:[]}}));assert.doesNotMatch(paused,/href="[^\"]*checkout/);
 for(const paper of ['A4','Letter']){const order={id:'fold-fixture',kind:'ready',sku:'ready_home',themeId:product.id,status:'published',filesReady:true,amountTotal:999};const h=renderToStaticMarkup(createElement(OrderPackage,{order,orderId:order.id,selectedPaper:paper}));assert.ok(h.includes('/api/v1/files/'+order.id+'/player?paper='+paper));assert.ok(h.includes('/api/v1/files/'+order.id+'/guide?paper='+paper));assert.match(h,/escape\/companion/);assert.match(h,/Download complete game/);}
}finally{await vite.close();}});
