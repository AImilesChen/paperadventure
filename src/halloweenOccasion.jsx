import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { currentLocale, localHref } from './i18n/index.mjs';
import copy from './halloweenOccasionCopy.json';
import previews from '../content/halloween-home-edition-previews.json';
import './birthdayOccasion.css';
import './halloweenOccasion.css';

const gamePath = '/en/themes/halloween/home/';
const previewNames = ['facade', 'record', 'viewer'];

export function HalloweenOccasion({ Link }) {
  const locale = currentLocale() === 'zh' ? 'zh' : 'en';
  const c = copy[locale];
  const game = localHref(gamePath);
  const stage = previews[locale].stage;
  const gameAction = (
    <Link className="button" to={game}>
      {c.action}<ArrowRight size={18} aria-hidden="true" />
    </Link>
  );

  return <main className="birthday-page halloween-occasion">
    <header className="birthday-shell birthday-hero">
      <div>
        <nav className="birthday-crumbs" aria-label={c.breadcrumb}>
          <Link to={localHref('/en/')}>{c.home}</Link>
          <span aria-hidden="true">/</span>
          <Link to={localHref('/en/for-home/')}>{c.family}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{c.topic}</span>
        </nav>
        <span className="eyebrow">{c.eyebrow}</span>
        <h1>{c.title}<span className="dot">.</span></h1>
        <p>{c.intro}</p>
        <div className="birthday-actions">
          {gameAction}
          <a className="text-link" href="#prepare">{c.plan}<ArrowRight size={18} aria-hidden="true" /></a>
        </div>
        <p className="birthday-facts">{c.facts.slice(0, 3).join(' · ')}<br />{c.facts[3]} · A4 &amp; US Letter</p>
        <p className="ho-purchase-note">{c.purchaseNote}</p>
      </div>
      <figure className="birthday-story-art">
        <img src="/assets/halloween.png" alt={c.heroAlt} width="1448" height="1086" fetchPriority="high" />
        <figcaption>{c.heroCaption}</figcaption>
      </figure>
    </header>

    <section className="birthday-band" aria-labelledby="ho-play">
      <div className="birthday-shell birthday-section">
        <span className="eyebrow">{c.storyLabel}</span>
        <h2 id="ho-play">{c.storyTitle}</h2>
        <p className="birthday-lead">{c.story}</p>
        <h3 className="ho-missions-title">{c.playTitle}</h3>
        <ol className="ho-missions">
          {c.missions.map(([title, description]) => (
            <li key={title}><h4>{title}</h4><p>{description}</p></li>
          ))}
        </ol>
        <p className="birthday-note">{c.playIntro}</p>
      </div>
    </section>

    <section className="birthday-shell birthday-section" aria-labelledby="ho-files">
      <span className="eyebrow">{c.materialLabel}</span>
      <h2 id="ho-files">{c.insideTitle}</h2>
      <p className="birthday-lead">{c.previewNote}</p>
      <div className="birthday-material-grid ho-material-grid">
        {previewNames.map((name, index) => {
          const preview = previews[locale][name];
          const source = preview.path.replace(/^public/, '');
          const label = c.previewLabels[index];
          return <figure key={name}>
            <a href={source} target="_blank" rel="noopener noreferrer" aria-label={c.enlargeLabel.replace('{name}', label)}>
              <img src={source} alt={label} width={preview.width} height={preview.height} loading="lazy" />
              <span>{c.enlarge}<ArrowUpRight size={16} aria-hidden="true" /></span>
            </a>
            <figcaption>
              <strong>{label}</strong>
              <span>{c.previewPage.replace('{page}', preview.page)}</span>
              <p>{c.previewNotes[index]}</p>
            </figcaption>
          </figure>;
        })}
      </div>
    </section>

    <section className="birthday-band" aria-labelledby="ho-groups">
      <div className="birthday-shell birthday-section birthday-setup">
        <figure className="birthday-scene ho-stage">
          <img src={stage.path.replace(/^public/, '')} alt={c.stageAlt} width={stage.width} height={stage.height} loading="lazy" />
          <figcaption>{c.previewPage.replace('{page}', stage.page)} · {c.stageAlt}</figcaption>
        </figure>
        <div>
          <span className="eyebrow">{c.hostingLabel}</span>
          <h2 id="ho-groups">{c.groupTitle}</h2>
          <p>{c.groupNote}</p>
          <ul className="ho-host-list">
            {c.groups.map(([title, description]) => (
              <li key={title}><strong>{title}</strong><p>{description}</p></li>
            ))}
          </ul>
          <p className="birthday-note">{c.storyNote}</p>
        </div>
      </div>
    </section>

    <section className="birthday-shell birthday-section ho-prepare" id="prepare" aria-labelledby="ho-prepare-title">
      <div>
        <span className="eyebrow">{c.prepareLabel}</span>
        <h2 id="ho-prepare-title">{c.prepareTitle}</h2>
        <p className="birthday-lead">{c.steps[0]}</p>
        <dl className="ho-file-cards">
          {c.files.slice(0, 2).map(([title, description]) => (
            <div key={title}><dt>{title}</dt><dd>{description}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <div className="birthday-table-wrap">
          <table>
            <caption>{c.printCaption}</caption>
            <thead><tr>{c.printColumns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">2–6</th><td>18</td><td>36</td></tr>
              <tr><th scope="row">7–12</th><td>36</td><td>54</td></tr>
            </tbody>
          </table>
        </div>
        <p className="birthday-note">{c.printNote}</p>
        <ol className="ho-checklist">
          {c.steps.slice(1).map(step => <li key={step}>{step}</li>)}
        </ol>
        <Link className="text-link" to={localHref(gamePath + '#prepare-game')}>
          {c.detailedGuide}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>

    <section className="birthday-shell birthday-section birthday-faq" aria-labelledby="ho-questions">
      <div><span className="eyebrow">{c.questionsLabel}</span><h2 id="ho-questions">{c.faqTitle}</h2></div>
      <div>{c.questions.map(([question, answer]) => (
        <details key={question}><summary>{question}</summary><p>{answer}</p></details>
      ))}</div>
    </section>

    <section className="birthday-shell birthday-finish">
      <h2>{c.finishTitle}</h2>
      <p>{c.finish}</p>
      <div className="birthday-actions">
        {gameAction}
        <Link className="text-link" to={localHref('/en/samples/home/')}>{c.free}<ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      <p className="birthday-note">{c.paid}</p>
      <div className="ho-related">
        <Link to={localHref('/en/guides/run-a-printable-adventure/')}>{c.guide}</Link>
        <Link to={localHref('/en/for-home/')}>{c.browse}</Link>
      </div>
    </section>
  </main>;
}

