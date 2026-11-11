// Explicit local-only simulator. Neither deployed Worker imports this file.
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {pointsProducts,pointsTermsVersion} from '../shared/sudoku/point-products.mjs';
export class LocalPointsProvider {
 constructor(origin,file=null){this.origin=origin;this.file=file;this.sessions={};this.refunds=[];this.keys={};this.calls=[];}
 async load(){if(this.file)try{Object.assign(this,JSON.parse(await readFile(this.file,'utf8')));}catch{}}
 async save(){if(this.file)await writeFile(this.file,JSON.stringify({sessions:this.sessions,refunds:this.refunds,keys:this.keys}));}
 env(db){return{DB:db,PUBLIC_ORIGIN:this.origin,SUDOKU_LOCAL:'true',AI_CREDITS_ENABLED:'true',SUDOKU_POINTS_LEGAL_READY:'true',AI_CREDITS_TERMS_VERSION:pointsTermsVersion,STRIPE_SECRET_KEY:'sk_test_local_simulator_not_a_stripe_key',STRIPE_WEBHOOK_SECRET:'whsec_local_simulator_not_a_stripe_secret',STRIPE_AI_CREDITS_100_PRICE_ID:'price_local100',STRIPE_AI_CREDITS_300_PRICE_ID:'price_local300',FETCH:this.fetch.bind(this)};}
 async fetch(url,options={}){const u=new URL(url),path=u.pathname.replace('/v1/',''),form=new URLSearchParams(options.body),key=options.headers?.['Idempotency-Key'];this.calls.push(path);let result;
  if(path.startsWith('prices/')){const p=pointsProducts[path.endsWith('300')?1:0];result={id:path.split('/')[1],active:true,type:'one_time',currency:'usd',unit_amount:p.unitAmount,livemode:false};}
  else if(path==='customers'){this.keys[key]??={id:'cus_local_'+crypto.randomUUID().replaceAll('-','')};result=this.keys[key];}
  else if(path==='checkout/sessions'&&options.method==='POST'){let id=this.keys[key];if(!id){id='cs_test_local_'+crypto.randomUUID().replaceAll('-','');this.keys[key]=id;const p=pointsProducts[form.get('line_items[0][price]').endsWith('300')?1:0];this.sessions[id]={id,url:this.origin+'/__points-test/'+id,mode:'payment',status:'open',payment_status:'unpaid',livemode:false,currency:'usd',amount_total:p.unitAmount,amount_subtotal:p.unitAmount,customer:form.get('customer'),client_reference_id:form.get('client_reference_id'),metadata:{purpose:form.get('metadata[purpose]'),points_order:form.get('metadata[points_order]')},payment_intent:'pi_local_'+crypto.randomUUID().replaceAll('-',''),line_items:{has_more:false,data:[{quantity:1,price:{id:form.get('line_items[0][price]')}}]},success_url:form.get('success_url'),cancel_url:form.get('cancel_url')};}result=this.sessions[id];}
  else if(path.startsWith('checkout/sessions/'))result=this.sessions[path.split('/')[2]];
  else if(path==='refunds')result={has_more:false,data:this.refunds.filter(r=>r.payment_intent===u.searchParams.get('payment_intent'))};
  else if(path.startsWith('charges/')){const s=Object.values(this.sessions).find(x=>x.payment_intent===path.slice(8));result=s?{id:path.slice(8),payment_intent:s.payment_intent,metadata:s.metadata}:null;}
  if(!result)return Response.json({error:{code:'resource_missing'}},{status:404});await this.save();return Response.json(result);
 }
 async pay(id){const s=this.sessions[id];if(!s)throw Error('Unknown local checkout');s.status='complete';s.payment_status='paid';await this.save();return s;}
 async refund(id,amount,status='succeeded'){const s=this.sessions[id],r={id:'re_local_'+crypto.randomUUID().replaceAll('-',''),amount,currency:'usd',payment_intent:s.payment_intent,status,metadata:s.metadata};this.refunds.push(r);await this.save();return r;}
 event(object,type='checkout.session.completed',id='evt_local_'+crypto.randomUUID().replaceAll('-','')){const body=JSON.stringify({id,type,livemode:false,data:{object}}),t=Math.floor(Date.now()/1000),sig=createHmac('sha256','whsec_local_simulator_not_a_stripe_secret').update(t+'.'+body).digest('hex');return new Request(this.origin+'/api/v1/stripe/webhook',{method:'POST',headers:{'stripe-signature':`t=${t},v1=${sig}`},body});}
}
