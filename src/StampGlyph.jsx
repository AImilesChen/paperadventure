export default function StampGlyph({ shape }) {
  const art = {
    circle: <circle cx="20" cy="20" r="13"/>,
    triangle: <path d="M20 5L35 32H5Z"/>,
    square: <rect x="7" y="7" width="26" height="26"/>,
    diamond: <path d="M20 3L35 20 20 37 5 20Z"/>,
    star: <path d="M20 3L25 14 37 15 28 24 30 36 20 30 10 36 12 24 3 15 15 14Z"/>,
    cross: <path d="M6 20H34M20 6V34"/>,
  };
  return <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">{art[shape]}</svg>;
}

