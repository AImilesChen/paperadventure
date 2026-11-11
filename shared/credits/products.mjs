export const pointsTermsVersion='ai-credits-2026-11-11-v1';
export const pointsPurchaseNotice='I request immediate supply of this one-time AI credits pack after confirmed payment. Credits can be used across supported credit-enabled features, including Sudoku and all six online escape puzzles. This purchase does not renew automatically or guarantee a cleared game.';
export const pointsProducts=Object.freeze([
 {sku:'ai_credits_100',name:'100 AI credits',points:100,unitAmount:299,currency:'usd',priceEnv:'STRIPE_AI_CREDITS_100_PRICE_ID'},
 {sku:'ai_credits_300',name:'300 AI credits',points:300,unitAmount:699,currency:'usd',priceEnv:'STRIPE_AI_CREDITS_300_PRICE_ID'},
]);
export function safeGameReturn(raw){try{const u=new URL(raw||'/en/escape-room-puzzles/','https://paperadventure.app');if(u.origin!=='https://paperadventure.app'||!['/en/sudoku/','/en/sudoku/play/','/en/sudoku/levels/','/en/escape-room-puzzles/'].includes(u.pathname))return'/en/escape-room-puzzles/';let q='';const level=Number(u.searchParams.get('level'));if(u.pathname==='/en/sudoku/play/'&&Number.isInteger(level)&&level>0&&level<=100000)q='?level='+level;const hash=u.pathname==='/en/escape-room-puzzles/'&&/^#(?:stamp-code|signal-shift|parcel-queue|shared-parcel|forest-trail|harbour-route)$/.test(u.hash)?u.hash:'';return u.pathname+q+hash;}catch{return'/en/escape-room-puzzles/';}}
export const pointsPath=returnTo=>'/en/credits/?returnTo='+encodeURIComponent(safeGameReturn(returnTo));
export const pointsMoney=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
