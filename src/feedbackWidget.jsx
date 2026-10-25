import {useEffect,useRef,useState} from 'react';
import {ChatCircleDots,CheckCircle,X} from '@phosphor-icons/react';
import {useModalFocus} from './useModalFocus.js';
import {feedbackTypes,feedbackPagePath,feedbackPayloadSignature} from '../shared/feedback.mjs';
import './feedbackWidget.css';

function browserCategory() {
  const agent=navigator.userAgent;
  return /Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'Other';
}
export default function FeedbackWidget({enabled=false,Link='a'}) {
  const [open,setOpen]=useState(false),[blocked,setBlocked]=useState(false),[type,setType]=useState('suggestion');
  const [message,setMessage]=useState(''),[wantsReply,setWantsReply]=useState(true),[email,setEmail]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null);
  const pending=useRef(false),attempt=useRef(null),page=useRef('/'),trigger=useRef(null);
  const dismiss=()=>{if(!pending.current){setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}};
  const dialog=useModalFocus(open,dismiss);
  useEffect(()=>{
    if(!enabled)return;
    const update=()=>setBlocked(Boolean(document.querySelector('[aria-modal="true"]:not([data-feedback-dialog])')));
    update();const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-modal']});
    return()=>observer.disconnect();
  },[enabled]);
  useEffect(()=>{
    if(!open)return;
    const original=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=original;};
  },[open]);
  function begin() {
    if(pending.current)return;
    page.current=feedbackPagePath(window.location.pathname);setError('');setReceipt(null);setOpen(true);
  }
  async function submit(event) {
    event.preventDefault();if(pending.current)return;
    const body={type,message:message.trim(),wantsReply,email:wantsReply?email.trim():null,pagePath:page.current,browserCategory:browserCategory(),deviceCategory:innerWidth<600?'mobile':innerWidth<1024?'tablet':'desktop'};
    if(!body.message){setError('Please enter a message.');return;}
    if(wantsReply&&!body.email){setError('Add your email for a reply, or turn off the reply option.');return;}
    const signature=feedbackPayloadSignature(body);
    if(attempt.current?.signature!==signature)attempt.current={key:crypto.randomUUID(),signature};
    pending.current=true;setBusy(true);setError('');
    try {
      const response=await fetch('/api/v1/feedback',{method:'POST',headers:{'content-type':'application/json','idempotency-key':attempt.current.key},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result?.saved||!result.id)throw Error(result?.error?.message||'Your feedback is not confirmed yet. Please retry.');
      setReceipt({id:result.id,wantsReply});setMessage('');setEmail('');setWantsReply(true);attempt.current=null;
    } catch(failure) {
      setError(failure.name==='TimeoutError'||failure.name==='AbortError'?'Your feedback is not confirmed yet. Please retry this submission.':failure.message||'Feedback could not be sent. Please retry.');
    } finally {pending.current=false;setBusy(false);}
  }
  if(!enabled)return null;
  const linkProps=path=>Link==='a'?{href:path}:{to:path};
  return <>
    <button ref={trigger} type="button" hidden={open||blocked} className="feedback-trigger" aria-label="Send feedback" aria-haspopup="dialog" onClick={begin}><ChatCircleDots size={21} aria-hidden="true"/><span>Feedback</span></button>
    {open&&<div className="feedback-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)dismiss();}}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="feedback-title" data-feedback-dialog="true" data-clarity-mask="true" className="feedback-dialog" tabIndex={-1}>
        <button type="button" className="feedback-close" aria-label="Close feedback" disabled={busy} onClick={dismiss}><X size={22}/></button>
        {receipt?<div className="feedback-success"><CheckCircle size={42} aria-hidden="true"/><h2 id="feedback-title">Thanks for helping us improve.</h2><p>Your feedback has been saved.</p><p className="feedback-reference">Reference {receipt.id.slice(0,8).toUpperCase()}</p><p>{receipt.wantsReply?'If we need to follow up, we can use the email you provided.':'You submitted anonymously, so we cannot send a direct reply.'}</p><button type="button" className="button" onClick={dismiss}>Done</button></div>:<>
          <span className="eyebrow">HELP US IMPROVE</span><h2 id="feedback-title">Share your feedback</h2><p className="feedback-intro">Have an idea or spotted a problem? We’d love to hear it.</p>
          <form onSubmit={submit}>
            <fieldset className="feedback-types" disabled={busy}><legend>Feedback type</legend><div>{Object.entries(feedbackTypes).map(([value,label])=><label key={value}><input type="radio" name="site-feedback-type" value={value} checked={type===value} onChange={()=>setType(value)}/><span>{label}</span></label>)}</div></fieldset>
            <label className="feedback-field"><span>Message <small>{message.length}/2,000</small></span><textarea name="feedback-message" rows={4} maxLength={2000} required disabled={busy} value={message} onChange={event=>setMessage(event.target.value)} placeholder="What could we make better?"/></label>
            <label className="feedback-reply"><input type="checkbox" checked={wantsReply} disabled={busy} onChange={event=>{setWantsReply(event.target.checked);setError('');}}/><span>I’d like a reply</span></label>
            {wantsReply&&<label className="feedback-field"><span>Email <small>For a reply</small></span><input type="email" name="feedback-email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/><small>Used only to respond to this feedback.</small></label>}
            <p className="feedback-privacy">Saved with this page and basic browser/device category. Please don’t include children’s names or photos. <Link {...linkProps('/en/privacy/')} onClick={dismiss}>Privacy notice</Link></p>
            {error&&<p className="feedback-error" role="alert">{error} Your message is still here.</p>}
            <button type="submit" className="button feedback-submit" disabled={busy||!message.trim()}>{busy?'Submitting…':'Submit feedback'}</button>
          </form>
          <div className="feedback-order-help"><p>Need help with an order or a refund?</p><Link {...linkProps('/en/my-adventures/?support=problem')} onClick={dismiss}>View your orders →</Link></div>
        </>}
      </section>
    </div>}
  </>;
}
