export const pointsTermsVersion='sudoku-points-2026-11-10-v1';
export const pointsPurchaseNotice='I request immediate supply of this one-time Sudoku points pack after confirmed payment. It does not renew automatically or guarantee a cleared level. Purchased points accumulate without monthly clearing.';
export const pointsProducts=Object.freeze([
 {sku:'sudoku_points_100',name:'A little help',points:100,unitAmount:299,currency:'usd',priceEnv:'STRIPE_SUDOKU_POINTS_100_PRICE_ID'},
 {sku:'sudoku_points_300',name:'Keep exploring',points:300,unitAmount:699,currency:'usd',priceEnv:'STRIPE_SUDOKU_POINTS_300_PRICE_ID'},
]);
export function safeGameReturn(raw){try{const u=new URL(raw||'/en/sudoku/','https://paperadventure.app');if(u.origin!=='https://paperadventure.app'||!['/en/sudoku/','/en/sudoku/play/','/en/sudoku/levels/'].includes(u.pathname))return'/en/sudoku/';const level=Number(u.searchParams.get('level'));return u.pathname+(u.pathname.endsWith('/play/')&&Number.isInteger(level)&&level>0&&level<=100000?'?level='+level:'');}catch{return'/en/sudoku/';}}
export const pointsPath=returnTo=>'/en/sudoku/points/?returnTo='+encodeURIComponent(safeGameReturn(returnTo));
export const pointsMoney=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
