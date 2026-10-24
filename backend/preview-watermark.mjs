// Only accepts our dependency-free, uncompressed vector PDF format. The original
// stored pair and its hashes are never mutated. Unknown PDFs fail closed for preview.
const encoder = new TextEncoder();
export function watermarkCandidatePdf(bytes) {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!source.startsWith('%PDF-1.4\n') || !source.endsWith('%%EOF')) throw Error('PREVIEW_FORMAT_UNSUPPORTED');
  const objects = [...source.matchAll(/^(\d+) 0 obj\n([\s\S]*?)\nendobj$/gm)];
  const trailer = source.match(/trailer\n<< \/Size (\d+) \/Root (\d+) 0 R >>\nstartxref\n\d+\n%%EOF$/);
  if (!trailer || objects.length !== Number(trailer[1]) - 1 || objects.some((x, i) => Number(x[1]) !== i + 1)) throw Error('PREVIEW_FORMAT_UNSUPPORTED');
  const contents = new Set(objects.filter(x => /\/Type \/Page\b/.test(x[2])).map(x => Number(x[2].match(/\/Contents (\d+) 0 R/)?.[1])));
  if (!contents.size || contents.has(NaN)) throw Error('PREVIEW_FORMAT_UNSUPPORTED');
  let output = '%PDF-1.4\n'; const offsets = [0];
  for (const [_, id, object] of objects) {
    let body = object;
    if (contents.has(Number(id))) {
      const stream = body.match(/^<< \/Length (\d+) >>\nstream\n([\s\S]*)\nendstream$/);
      if (!stream || encoder.encode(stream[2]).length !== Number(stream[1])) throw Error('PREVIEW_FORMAT_UNSUPPORTED');
      const marked = stream[2] + '\nq 0.55 0.18 0.15 rg BT /F1 8 Tf 1 0 0 1 48 12 Tm (PREVIEW - not accepted. Use this version for final files.) Tj ET Q';
      body = `<< /Length ${encoder.encode(marked).length} >>\nstream\n${marked}\nendstream`;
    }
    offsets.push(encoder.encode(output).length); output += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xref = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${trailer[2]} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(output);
}
