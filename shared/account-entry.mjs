import {basePath,localePath,routeLocale} from './locale.mjs';
import {accountReturnPath} from './account-return.mjs';
import {pointsProducts} from './credits/products.mjs';

export function accountEntryContext(requested){
 const destination=accountReturnPath(requested),url=new URL(destination,'https://paperadventure.app');
 const base={destination,note:'',backPath:'/en/',backLabel:'Back to Paper Adventure'};
 if(basePath(url.pathname)==='/en/credits/'){
  const pack=pointsProducts.find(p=>p.sku===url.searchParams.get('pack'));
  return{...base,note:pack?`Your ${pack.points}-credit pack is selected. After signing in, you can review the purchase.`:'After signing in, continue to your shared AI credits wallet.',backPath:destination,backLabel:'Back to AI credits'};
 }
 if(basePath(url.pathname)==='/en/account/billing/')return{...base,note:'After signing in, see your purchases and payment updates.'};
 if(basePath(url.pathname).startsWith('/en/sudoku/'))return{...base,note:'After signing in, return to Sudoku and link your saved progress.',backPath:destination,backLabel:'Back to Sudoku'};
 if(basePath(url.pathname)==='/en/escape-room-puzzles/')return{...base,note:'After signing in, return to your online puzzle. Your moves stay in this browser.',backPath:destination,backLabel:'Back to your puzzle'};
 if(/^\/en\/(checkout|orders|create)\//.test(basePath(url.pathname)))return{...base,note:'After signing in, continue where you left off.'};
 return base;
}
