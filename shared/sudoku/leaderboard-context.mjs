import {publicCatalog} from './catalog.mjs';
// Only public UI context is carried across sign-in, never arbitrary return URLs.
export function rankingContext(search='',published=publicCatalog.publishedCount){
 const params=new URLSearchParams(search),level=Number(params.get('level'));
 return {mode:params.get('mode')==='speed'?'speed':'all',level:Number.isInteger(level)&&level>0&&level<=published?level:1,profile:params.get('profile')==='1'};
}
export function rankingPath({mode='all',level=1,profile=false}={},published=publicCatalog.publishedCount){
 const safe=rankingContext(new URLSearchParams({mode,level:String(level)}),published),params=new URLSearchParams();
 if(safe.mode==='speed'){params.set('mode','speed');params.set('level',safe.level);}
 if(profile)params.set('profile','1');
 return '/en/sudoku/leaderboard/'+(params.size?'?'+params:'')+(profile?'#my-results':'');
}
export const rankingSignIn=(context,published)=>'/en/account/?returnTo='+encodeURIComponent(rankingPath({...context,profile:true},published));
export function participation({profile,highest=0,speedLevel,best,latest,locked=false}){
 if(locked)return {id:'locked',title:'This level is locked',text:'Continue your next unlocked level first. You can inspect records here while progressing.'};
 if(latest?.status==='pending')return {id:'pending',title:'Time awaiting review',text:'Your clear is saved. Any earlier valid best still counts while this attempt is reviewed.'};
 const hasResult=speedLevel?best!=null:highest>0;
 if(!profile.authenticated)return {id:hasResult?'guest-result':'guest',title:hasResult?'Your result is saved privately':'Start as a guest',text:hasResult?'Sign in to keep this result across devices, then choose whether to share it.':'Play without signing in. Public ranking is optional after you complete a level.'};
 if(!profile.listed)return {id:'private',title:'Your profile is private',text:hasResult?'Choose a public nickname and enable sharing to list your eligible results.':'You can choose public sharing now. Complete a level to add an eligible result.'};
 if(!hasResult)return {id:'no-result',title:speedLevel?'No timed result yet':'Ready for your first clear',text:speedLevel?'Start a timed attempt. If this is an older save, restart the level to record a time; existing clears remain on All clears.':'Complete your next level to add your first public score.'};
 return {id:'public',title:'Your result is public',text:'Your best eligible result is included. Revisit a level or continue your adventure.'};
}
