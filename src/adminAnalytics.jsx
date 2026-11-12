import {useEffect,useState} from 'react';
import {ArrowClockwise,ArrowSquareOut,ChartLine,GlobeHemisphereWest,Compass,Devices,Files} from '@phosphor-icons/react';
import './adminAnalytics.css';

const number=value=>new Intl.NumberFormat('zh-CN').format(value);
const dateLabel=value=>value?.length===10?value.slice(5).replace('-','/'):value;
function displayLabel(value,title){if(title==='访问国家/地区'&&/^[A-Z]{2}$/.test(value)){try{return new Intl.DisplayNames(['zh-CN'],{type:'region'}).of(value);}catch{}}return ({desktop:'电脑',mobile:'手机',tablet:'平板','(not set)':'未识别','':'直接访问'})[value]||value;}
function Failure(){return <p role="status" className="traffic-section-error">读取失败</p>;}
function Breakdown({title,Icon,section,metric,label,waiting}){
 const items=(section?.items||[]).filter(row=>row[metric]>0),max=Math.max(1,...items.map(row=>row[metric]));
 return <section className="admin-panel traffic-breakdown"><header><h2><Icon size={22}/>{title}</h2><span>{label} · 前 10 项</span></header>{section?.status!=='ready'?(waiting?<p className="traffic-empty">{waiting}</p>:<Failure/>):items.length?<ol>{items.map((row,i)=><li key={i}><div><span title={row.label}>{displayLabel(row.label,title)}</span><strong>{number(row[metric])}</strong></div><div className="traffic-meter" aria-hidden="true"><i style={{width:Math.max(1,row[metric]/max*100)+'%'}}/></div></li>)}</ol>:<p className="traffic-empty">暂无数据</p>}</section>;
}
export default function AdminAnalytics({location,api,go}){
 const raw=new URLSearchParams(location.search).get('days'),days=['1','7','30'].includes(raw)?Number(raw):1;
 const range=new URLSearchParams(location.search).get('range')==='24h'?'24h':'';
 const [state,setState]=useState({loading:true}),[version,setVersion]=useState(0);
 useEffect(()=>{let active=true;setState({loading:true});api('/analytics?days='+days+(range?'&range=24h':'')).then(data=>{if(active)setState({data});}).catch(e=>{if(active)setState({error:e.message});});return()=>{active=false;};},[days,range,version,api]);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setVersion(v=>v+1);},60000);return()=>clearInterval(timer);},[]);
 const data=state.data,summary=data?.sections?.summary,trend=data?.sections?.trend,items=trend?.items||[],max=Math.max(1,...items.map(row=>row.visits));
 const waiting=state.loading?'读取中…':data?.status==='not_configured'?'未连接':state.error||data?.status==='error'?'读取失败':null;
 return <div className="admin-traffic"><div className="traffic-toolbar"><div className="admin-range" role="group" aria-label="访问统计日期">{[[1,'今天',''],[1,'近 24 小时','24h'],[7,'近 7 天',''],[30,'近 30 天','']].map(([value,text,id])=><button key={value+id} aria-pressed={days===value&&range===id} onClick={()=>go('/admin/analytics/?days='+value+(id?'&range=24h':''))}>{text}</button>)}</div><button disabled={state.loading} onClick={()=>setVersion(v=>v+1)}><ArrowClockwise size={18}/>{state.loading?'读取中…':'刷新数据'}</button></div>
 <div className="traffic-source"><span className="traffic-source-label">Cloudflare</span>{waiting?<span role="status">{waiting}</span>:<span>{data?.timeZone||'UTC'} · {data?.status==='partial'?'部分数据暂不可用':'已连接'}</span>}{data?.status==='not_configured'&&<a href="https://dash.cloudflare.com/77bc392d46985cd3425691358f5e8a77/web-analytics/overview?siteTag~in=5af3291a59604376a2e07b572175a6e3&excludeBots=Yes" target="_blank" rel="noopener noreferrer">CF 原始报表 <ArrowSquareOut size={14}/></a>}</div>
 <div className="admin-metrics traffic-metrics">{[['访问次数','visits','CF Web Analytics Visits，并非独立访客人数'],['页面浏览量','pageViews','CF Web Analytics Page views']].map(([title,key,note])=><article key={key}><span title={note}>{title}</span><strong>{summary?.status==='ready'?number(summary.values[key]):'—'}</strong>{summary?.status!=='ready'&&<small>{waiting||'读取失败'}</small>}</article>)}</div>
  <section className="admin-panel traffic-trend"><header><h2><ChartLine size={22}/>每日访问趋势</h2><span>访问次数</span></header>{trend?.status!=='ready'?(waiting?<p className="traffic-empty">{waiting}</p>:<Failure/>):!items.length?<p className="traffic-empty">暂无访问记录</p>:<><div className="traffic-chart" role="img" aria-label="每日访问次数，完整数值见下方表格">{items.map(row=><div className="traffic-bar-column" key={row.label}><span>{number(row.visits)}</span><i style={{height:Math.max(2,row.visits/max*130)}}/><small>{dateLabel(row.label)}</small></div>)}</div><details><summary>查看每日数值</summary><div className="traffic-table-wrap"><table><thead><tr><th>日期</th><th>访问次数</th><th>页面浏览量</th></tr></thead><tbody>{items.map(row=><tr key={row.label}><td>{row.label}</td><td>{number(row.visits)}</td><td>{number(row.pageViews)}</td></tr>)}</tbody></table></div></details></>}</section>
 <div className="traffic-grid"><Breakdown title="访问国家/地区" Icon={GlobeHemisphereWest} waiting={waiting} section={data?.sections?.countries} metric="visits" label="访问次数"/><Breakdown title="通过什么渠道访问" Icon={Compass} waiting={waiting} section={data?.sections?.sources} metric="visits" label="访问次数"/><Breakdown title="热门页面" Icon={Files} waiting={waiting} section={data?.sections?.pages} metric="pageViews" label="页面浏览量"/><Breakdown title="使用什么设备" Icon={Devices} waiting={waiting} section={data?.sections?.devices} metric="visits" label="访问次数"/></div>
 {data?.updatedAt&&<p className="traffic-footnote">更新于 {new Date(data.updatedAt).toLocaleString('zh-CN',{timeZone:'UTC',hour12:false})} UTC{data.sampled?' · CF 抽样统计':''}</p>}
 </div>;
}
