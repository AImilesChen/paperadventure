import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(process.argv[2],'utf8'));
const row=(Array.isArray(data)?data:[data]).flatMap(item=>item.results||[])[0];
const orderId='612a56bd-494a-4265-984f-f4ecb3eb7407';
if(row?.status==='ready'){console.log('The existing paid remake is already published.');process.exit(0);}
if(!row||!['queued','generating'].includes(row.status)||!row.blueprint_ready)throw Error('Only the existing checked blueprint can resume.');
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Existing queue credentials are required.');
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/queues`;
async function api(path,options={}){
  const response=await fetch(base+path,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}});
  const body=await response.json();
  if(!response.ok||body.success!==true)throw Error(`Queue operation failed with HTTP ${response.status}; codes ${(body.errors||[]).map(error=>error.code).join(',')}`);
  return body.result;
}
const queues=await api(''),queue=queues.find(item=>item.queue_name==='paper-adventure-stage-generation');
if(!queue?.queue_id)throw Error('The existing generation queue was not found.');
const result=await api(`/${queue.queue_id}/messages`,{method:'POST',body:JSON.stringify({body:{type:'pack_remake',orderId},content_type:'json'})});
console.log(JSON.stringify({existingQueueMessage:'sent',backlog:result?.metadata?.metrics?.backlog_count??null}));
