// Dependency-free English PDF renderer for the first custom-delivery pipeline.
// It deliberately keeps answers and hints out of the player document.
import { buildInteractiveGamePdf } from './pdf-interactive.mjs';
const encoder = new TextEncoder();
const ascii = value => String(value ?? '').normalize('NFKD').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
const escape = value => ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

function wrap(value, width = 82) {
  const words = ascii(value).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width && line) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function documentLines(story, spec, role) {
  const materials = spec.plan ? 'Printed player pages and pencils.' : spec.materials;
  const place = spec.place && !/[^\x20-\x7e]/.test(spec.place) ? spec.place : 'Your chosen comfortable supervised space.';
  const lines = [
    ...wrap(story.title, 40).map(text => ({ text, kind: 'title' })),
    { text: `${spec.setting.toUpperCase()} / ${role === 'player' ? 'PLAYER PACK' : spec.setting === 'home' ? 'HOST GUIDE' : 'TEACHER GUIDE'}`, kind: 'sub' },
    { text: '', kind: 'space' },
  ];
  const add = (title, paragraphs) => {
    for (const text of wrap(title, 52)) lines.push({ text, kind: 'heading' });
    for (const paragraph of paragraphs) {
      for (const text of wrap(paragraph)) lines.push({ text, kind: 'body' });
      lines.push({ text: '', kind: 'space' });
    }
  };
  add('The story begins', [story.introduction]);
  if (spec.plan) {
    add('Your team and mission',[spec.plan.roles,spec.plan.goal]);
    if (role !== 'player') add('Prepare your adventure',[spec.plan.preparation]);
  }
  if (role === 'player') add('What you need', [materials || 'Printed pages, paper and pencils. Ask your adult organiser for each new checkpoint after you solve the last one.']);
  else add('Before you begin', [`Materials: ${materials || 'Printed player pages, paper and pencils.'}`, `Playing place: ${place}`, `Players: ${spec.players}${spec.groups ? ` in ${spec.groups} groups` : ''}. Suggested age: ${spec.age}. Print the player pages and keep this answer guide with the adult organiser.`]);
  if (spec.setting === 'classroom') add('Group setup', [story.groupInstructions]);
  for (const stage of story.stages) {
    if (role === 'player') lines.push({ text: '', kind: 'pageBreak' });
    const paragraphs = role === 'player'
      ? [...(stage.task ? [stage.task,`Work together: ${stage.teamwork}`] : []),stage.clue, ...stage.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option}`), 'Our answer: ______________________________']
      : [`Prerequisite: ${stage.prerequisite}`, `Answer: ${String.fromCharCode(65 + stage.answerIndex)}. ${stage.options[stage.answerIndex]}`, `Why: ${stage.explanation}`, `Gentle hint: ${stage.hint}`, `Unlock for the next stage: ${stage.unlock}`];
    add(`Checkpoint ${stage.number}: ${stage.title}`, paragraphs);
  }
  if (role === 'player') lines.push({ text: '', kind: 'pageBreak' });
  add('The ending', [story.ending]);
  if (role !== 'player') add('Host check', ['Give one checkpoint at a time. Confirm each answer before releasing the next page. Keep this guide away from players. A real adult should review and print-test the activity before use.']);
  return lines;
}

export function buildGamePdf(story, spec, role) {
  if (!['player', 'guide'].includes(role)) throw new Error('Unknown PDF role');
  if (spec.gamePackVersion === 2) return buildInteractiveGamePdf(story,spec,role);
  const width = spec.paper === 'A4' ? 595 : 612;
  const height = spec.paper === 'A4' ? 842 : 792;
  const top = height - 62;
  const bottom = 60;
  const pages = [[]];
  let y = top;
  for (const line of documentLines(story, spec, role)) {
    if (line.kind === 'pageBreak') {
      if (pages.at(-1).length) pages.push([]);
      y = top;
      continue;
    }
    const size = line.kind === 'title' ? 21 : line.kind === 'heading' ? 15 : line.kind === 'sub' ? 10 : 11;
    const leading = line.kind === 'title' ? 31 : line.kind === 'heading' ? 23 : line.kind === 'space' ? 10 : 16;
    if (y - leading < bottom) { pages.push([]); y = top; }
    if (line.kind !== 'space') pages.at(-1).push({ text: escape(line.text), x: 54, y, size });
    y -= leading;
  }
  const objects = [];
  const add = text => { objects.push(text); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  for (const [index, lines] of pages.entries()) {
    const commands = ['0.12 0.25 0.36 rg'];
    for (const line of lines) commands.push(`BT /F1 ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${line.text}) Tj ET`);
    commands.push(`BT /F1 9 Tf 1 0 0 1 54 32 Tm (Paper Adventure Workshop | ${role === 'player' ? 'Player Pack' : 'Guide'} | Page ${index + 1} of ${pages.length}) Tj ET`);
    const stream = commands.join('\n');
    const streamId = add(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(pdf);
}
