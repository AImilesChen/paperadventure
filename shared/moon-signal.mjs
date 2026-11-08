export const moonEdition = 4;
export const moonAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const moonRecords = [{ original: 'NOON', sent: 'QRRQ' }, { original: 'SUN', sent: 'QXV' }, { original: 'STAR', sent: 'UDWV' }];
export const moonMessage = 'NFRG';
export const shiftText = (text, shift) => [...text].map(c => moonAlphabet.includes(c) ? moonAlphabet[(moonAlphabet.indexOf(c) + shift % 26 + 26) % 26] : c).join('');
const reverse = word => [...word].reverse().join('');
export const encodeMoon = text => text.split(' ').map(word => shiftText(reverse(word), 3)).join(' ');
export const decodeMoon = text => text.split(' ').map(word => reverse(shiftText(word, -3))).join(' ');
export const freshMoon = () => ({ edition: moonEdition, answer: '' });
export function cleanMoon(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  if (![3, moonEdition].includes(d.edition)) return freshMoon();
  const value = d.edition === 3 ? d.testWord : d.answer;
  return { edition: moonEdition, answer: typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) : '' };
}
export function checkMoon(raw) {
  const { answer } = cleanMoon(raw);
  if (!/^[A-Z]{4}$/.test(answer)) return { ok: false, message: 'Enter the four-letter original word for NFRG.' };
  return encodeMoon(answer) === moonMessage
    ? { ok: true, message: 'Message decoded. The rescue ship has your meeting point: the dock.' }
    : { ok: false, message: 'That word does not fit the final message. Check your method against all three records, then try again.' };
}
