import { t as translateUi, localHref, currentLocale } from "./i18n/index.mjs";import { useEffect, useRef, useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import { themes } from '../shared/catalog.mjs';
import { prepareSampleDownload } from './sampleDownload.mjs';
import { trackConversionEvent } from './analytics.js';
import HomeFreeSample from './homeFreeSample.jsx';
import ClassroomFreeSample from './classroomFreeSample.jsx';
import './freeDownload.css';
import classroomEdition from '../shared/free-games/zh-classroom-edition.json';

export default function FreeDownload({ Link, classroom = false }) {
  const setting = classroom ? 'classroom' : 'home';
  const locale=currentLocale();
  const expectedVersion=locale==='zh'&&classroom?classroomEdition.version:undefined;
  const [availability,setAvailability]=useState({scope:'',status:'checking'});
  const availabilityScope=`${locale}:${setting}`;
  const availabilityStatus=availability.scope===availabilityScope?availability.status:'checking';
  const [availabilityAttempt,setAvailabilityAttempt]=useState(0);
  const downloadDisabled=locale==='zh'&&availabilityStatus!=='ready';
  const label = classroom ? 'Classroom' : 'Home';
  const guide = locale==='zh'?(classroom?'教师指南':'主持指南'):(classroom ? 'Teacher Guide' : 'Host Guide');
  const theme = themes.find((item) => item.id === 'celebration');
  const story = theme.story[setting];
  const [paper, setPaper] = useState('A4');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activeRequest = useRef(null);
  const lastRole = useRef('complete');
  const recordedDownloads = useRef(new Set());
  useEffect(() => {
    setBusy('');setError('');setNotice('');
    return () => {
      activeRequest.current?.controller.abort();
      activeRequest.current = null;
    };
  }, [setting,locale]);
  useEffect(()=>{
    if(locale!=='zh')return;
    const controller=new AbortController();
    const update=status=>setAvailability({scope:availabilityScope,status});
    update('checking');
    const timeout=setTimeout(()=>{update('error');controller.abort();},15000);
    fetch('/api/v1/samples/availability?locale=zh',{signal:controller.signal,credentials:'same-origin',cache:'no-store'})
      .then(async response=>{if(!response.ok)throw Error('Unavailable');return response.json();})
      .then(data=>{if(!controller.signal.aborted)update(data.locale==='zh'&&data.editions?.[setting]?.available?(expectedVersion&&data.editions[setting].version!==expectedVersion?'updating':'ready'):'unpublished');})
      .catch(failure=>{if(failure.name!=='AbortError')update('error');})
      .finally(()=>clearTimeout(timeout));
    return ()=>{clearTimeout(timeout);controller.abort();};
  },[setting,locale,availabilityAttempt]);

  async function download(role) {
    if (activeRequest.current||downloadDisabled) return;
    const request = { controller: new AbortController(), setting, paper };
    activeRequest.current = request;
    lastRole.current = role;
    setBusy(role);setError('');setNotice('');
    try {
      const { blob, filename } = await prepareSampleDownload({ setting, paper, role, locale, expectedVersion, signal: request.controller.signal });
      if (activeRequest.current !== request) return;
      const objectUrl = URL.createObjectURL(blob),link = document.createElement('a');
      try {
        link.href = objectUrl;link.download = filename;
        document.body.appendChild(link);link.click();
      } finally {
        link.remove();setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
      setNotice(locale==='zh'?(role==='complete'?`下载已开始。解压 ZIP，先阅读${guide}，再准备玩家材料。`:`${role==='player'?'玩家材料':guide}下载已开始。开展游戏需要玩家材料与成人指南两份 PDF。`):(role === 'complete' ? 'Your download has started. Open the ZIP for both PDFs and read the adult guide first.' : translateUi("Your {value0} download has started. You need both PDFs to run the game.", { value0: role === 'player' ? 'Player Pack' : guide })));
      // The complete pair was prepared and handed to the browser. Disk saving
      // cannot be verified. Repeat downloads in this view count only once.
      const key = `${setting}:${paper}:${locale}`;
      if (role === 'complete' && !recordedDownloads.current.has(key)) {
        recordedDownloads.current.add(key);
        trackConversionEvent('sample_download_success', { setting, paper, ...(locale==='zh'?{locale}:{}) });
      }
    } catch (failure) {
      if (activeRequest.current === request && failure.name !== 'AbortError') setError(failure.message);
    } finally {
      if (activeRequest.current === request) {activeRequest.current = null;setBusy('');}
    }
  }

  return <main className={`extended-page sample-download-page${classroom ? ' classroom-free-page' : ' home-free-page'}`}><div className="sample-download-shell">
    <nav className="sample-edition-tabs live-tabs" aria-label={translateUi("Choose edition")}>
      <Link className={!classroom ? 'active' : ''} aria-current={!classroom ? 'page' : undefined} to={localHref("/en/samples/home/")}>{translateUi("For home")}</Link>
      <Link className={classroom ? 'active' : ''} aria-current={classroom ? 'page' : undefined} to={localHref("/en/samples/classroom/")}>{translateUi("For classrooms")}</Link>
    </nav>
    <section className="sample-download-top" id="sample-download" aria-labelledby="sample-download-title" tabIndex={-1}>
      <header className="sample-download-intro">
        <span className="eyebrow">{translateUi("PAPER ADVENTURE \xB7 ")}{translateUi(label.toUpperCase())}</span>
        <h1 id="sample-download-title">{classroom ? translateUi('Free printable classroom adventure game.') : translateUi('Free printable adventure game for kids.')}</h1>
        <h2>{translateUi(story.title)}</h2><p>{classroom ? translateUi('A complete, teacher-led paper game from Paper Adventure for ages 6–12. Crews share clues, make a display badge and review another crew’s work.') : translateUi('A complete, cooperative paper game from Paper Adventure for ages 6–12. Share clues, rebuild a route and help Fenn the fox deliver his birthday chest.')}</p>
        <div className="sample-download-facts"><span>{translateUi("Ages 6\u201312")}</span><span>{classroom ? translateUi('2–35 students') : translateUi('2–12 children')}</span><span>{translateUi("5 checkpoints")}</span></div>
        <p className="sample-free-note">{locale==='zh'?`无需注册或付款。免费游戏提供独立的简体中文 PDF。${classroom?'每组2至6人，由教师引导。':'另需一名成人主持。'}`:<>{translateUi("No account or payment needed. English PDFs.")}{classroom ? translateUi(' Teacher-led crews of 2–6.') : translateUi(' An additional adult hosts.')}</>}</p>
      </header>
      <div className="live-panel sample-download-panel" aria-label={translateUi("Download your free game")} aria-busy={Boolean(busy)}>
        {locale==='zh'&&classroom&&<p className="sample-free-note">中文版 {classroomEdition.version} · 玩家材料{classroomEdition.pages.player}页 · 教师指南{classroomEdition.pages.guide}页</p>}
        {locale==='zh'&&<div className="sample-download-feedback" aria-live="polite"><p>{availabilityStatus==='ready'?'下载语言：简体中文（玩家材料与成人指南）':availabilityStatus==='checking'?'正在确认中文版下载状态……':availabilityStatus==='unpublished'?'中文版 PDF 尚未开放下载，请稍后再试。':availabilityStatus==='updating'?'中文版资料正在更新，请稍后重新检查。':'暂时无法确认中文版下载状态。'}</p>{['error','unpublished','updating'].includes(availabilityStatus)&&<button type="button" className="button-quiet" onClick={()=>setAvailabilityAttempt(value=>value+1)}>重新检查下载状态</button>}</div>}
        <div className="sample-paper-choice"><h3>{translateUi("Choose your paper size")}</h3><div className="live-tabs" role="group" aria-label={translateUi("Paper size")}>{['A4', 'Letter'].map((size) => <button key={size} type="button" disabled={Boolean(busy)||downloadDisabled} className={paper === size ? 'active' : ''} aria-pressed={paper === size} onClick={() => {setPaper(size);setNotice('');setError('');}}>{size === 'Letter' ? translateUi('US Letter') : translateUi('A4')}</button>)}</div></div>
        <div className="sample-bundle"><h2>{translateUi("Get the complete game")}</h2><p>{translateUi("Player Pack + ")}{translateUi(guide)} · {paper === 'Letter' ? translateUi('US Letter') : translateUi('A4')}</p><button type="button" className="button" disabled={Boolean(busy)||downloadDisabled} onClick={() => download('complete')}>{busy === 'complete' ? translateUi('Preparing your download…') : translateUi('Download complete game · ZIP')} <DownloadSimple size={19} /></button><small>{locale==='zh'?`解压 ZIP，内含两份 PDF。请先阅读${guide}。`:<>{translateUi("Open the ZIP to find both PDFs. Read the ")}{translateUi(guide)}{translateUi(" first.")}</>}</small></div>
        <div className="sample-download-feedback" aria-live="polite">{busy && <p role="status">{busy === 'complete' ? translateUi('Preparing both PDFs…') : translateUi('Preparing your PDF…')}</p>}{notice && <p className="sample-download-notice" role="status">{translateUi(notice)}</p>}</div>
        {error && <div className="sample-download-error" role="alert"><p><WarningCircle size={18} />{translateUi(error)}</p><p>{translateUi("No incomplete ZIP has been downloaded.")}</p><button type="button" className="button-quiet" disabled={Boolean(busy)||downloadDisabled} onClick={() => download(lastRole.current)}>{translateUi("Try download again")}</button></div>}
        <details className="sample-individual-files"><summary>{translateUi("Download individual PDFs")}</summary><div className="live-downloads"><div><strong>{translateUi("Player Pack")}</strong><p>{translateUi("Story, clues and paper activities for ")}{classroom ? translateUi('students') : translateUi('children')}.</p><button type="button" aria-label={translateUi("Download {value0} {value1} Player Pack", { value0: setting, value1: paper })} onClick={() => download('player')} disabled={Boolean(busy)||downloadDisabled}>{busy === 'player' ? translateUi('Preparing…') : translateUi('Download Player Pack')} <DownloadSimple size={17} /></button></div><div><strong>{translateUi(guide)}</strong><p>{translateUi("Preparation, hints and answers for the adult.")}</p><button type="button" aria-label={translateUi("Download {value0} {value1} {value2}", { value0: setting, value1: paper, value2: guide })} onClick={() => download('guide')} disabled={Boolean(busy)||downloadDisabled}>{busy === 'guide' ? translateUi('Preparing…') : translateUi("Download {value0}", { value0: guide })} <DownloadSimple size={17} /></button></div></div></details>
      </div>
    </section>
    {classroom ? <ClassroomFreeSample Link={Link} story={story} /> : <HomeFreeSample Link={Link} story={story} />}
    <section className="sample-next-game"><div><span className="eyebrow">{translateUi("KEEP EXPLORING")}</span><h2>{translateUi("Find your next story.")}</h2><p>{translateUi("Explore more ready-made adventures for your ")}{classroom ? translateUi('classroom') : translateUi('family')}.</p></div><Link className="button-quiet" to={localHref(`/en/for-${setting}/`)}>{translateUi("Browse ")}{translateUi(label)}{translateUi(" game themes ")}<ArrowRight size={18} /></Link></section>
  </div></main>;
}
