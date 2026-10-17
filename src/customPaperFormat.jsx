import './customPaperFormat.css';

export function CustomPaperFormat({compact=false}){
  return <div className={'custom-paper-format'+(compact?' compact':'')}>
    <p className="custom-paper-format-note">These pages come from a hand-authored lighthouse example rendered by the new custom paper-pack template. They show the format, not your future story or a ready-made theme.</p>
    <div className="custom-paper-format-pages">
      <figure><a href="/assets/custom-paper-format-cards.jpg" target="_blank" rel="noopener noreferrer"><img src="/assets/custom-paper-format-cards.jpg" alt="Four labelled inspection cards and a result-writing area from the sample custom Player Pack" width="992" height="1403" loading="lazy"/></a><figcaption>Checkpoint 1 · compare printed evidence cards</figcaption></figure>
      <figure><a href="/assets/custom-paper-format-route.jpg" target="_blank" rel="noopener noreferrer"><img src="/assets/custom-paper-format-route.jpg" alt="Three labelled route rows and a result-writing area from the sample custom Player Pack" width="992" height="1403" loading="lazy"/></a><figcaption>Checkpoint 4 · trace and check a route</figcaption></figure>
    </div>
    <p className="custom-paper-format-links"><a href="/assets/custom-paper-format-player-A4.pdf" target="_blank" rel="noopener noreferrer">Open the full sample Player Pack (A4)</a><a href="/assets/custom-paper-format-guide-A4.pdf" target="_blank" rel="noopener noreferrer">Open the matching adult guide (A4)</a></p>
  </div>;
}
