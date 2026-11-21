import {readyDocumentLabel} from '../shared/ready-document-editions.mjs';
import {useState} from 'react';
import {currentLocale} from './i18n/index.mjs';
import {prepareReadyLanguageDownload,readyDocumentUrl} from './readyDocumentDownload.mjs';
export default function ReadyLocalizedDownloads({order,paper,setPaper}){
 const zh=currentLocale()==='zh';
 const choices=order.documentEditions||[];
 const initial=choices.some(e=>e.locale===order.documentLocale)?order.documentLocale:'en';
 const [selected,setSelected]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const chosen=choices.find(e=>e.locale===selected)||choices[0];
 async function download(){
  setBusy(true);setError('');setNotice('');
  try{
   const {blob,filename}=await prepareReadyLanguageDownload({orderId:order.id,themeId:order.themeId||'ocean',paper,locale:chosen.locale,edition:chosen.version});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   setNotice(zh?'完整 ZIP 已开始下载，请解压后先阅读教师指南。':'Your complete ZIP download has started. Extract it and read the Teacher Guide first.');
  }catch(e){setError(zh?'下载未完成，未保存不完整 ZIP。请刷新订单后重试，或选择其他可用语言。':e.message);}finally{setBusy(false);}
 }
 return <section className="order-package" aria-labelledby="localized-package-title">
  <h2 id="localized-package-title">{zh?'选择资料语言并下载':'Choose your PDF language and download'}</h2>
  <p>{zh?'购买时选择的资料语言：':'PDF language selected at purchase: '}{order.documentLocale==='zh'?'简体中文':'English'}。</p>
  <p>{zh?'下方列出本订单当前可用的资料语言，使用原有购买权限，无需再次付款。界面语言与PDF语言分别选择。':'The options below show PDF languages currently available under this order’s existing purchase access. No new payment is required. PDF language is separate from interface language.'}</p>
  <label>{zh?'PDF 语言':'PDF language'}<select value={chosen?.locale||'en'} disabled={busy} onChange={e=>{setSelected(e.target.value);setError('');setNotice('');}}>{choices.map(e=><option key={e.locale} value={e.locale}>{e.locale==='zh'?'简体中文':'English'}</option>)}</select></label>
  <label>{zh?'纸张尺寸':'Paper size'}<select value={paper} disabled={busy} onChange={e=>{setPaper(e.target.value);setError('');setNotice('');}}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label>
  <p>{chosen&&readyDocumentLabel(order.themeId||'ocean',chosen.locale,chosen.version,zh?'zh':'en')} · {chosen?.version}</p>
  <button className="button" disabled={busy||!chosen} onClick={download}>{busy?(zh?'正在准备……':'Preparing…'):(zh?'下载完整游戏 · ZIP':'Download complete game · ZIP')}</button>
  <div className="live-downloads">{chosen&&['player','guide'].map(role=><a key={role} href={readyDocumentUrl(order.id,role,paper,chosen.locale,chosen.version)}>{role==='player'?(zh?'玩家材料':'Player Pack'):(zh?'教师指南':'Teacher Guide')} · {chosen.locale==='zh'?'简体中文':'English'} · {paper}</a>)}</div>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
