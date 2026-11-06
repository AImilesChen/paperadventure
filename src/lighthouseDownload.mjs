import { lighthousePdfPath } from '../shared/lighthouse-game.mjs';
import { createDownloadZip } from './downloadZip.mjs';
export async function prepareLighthousePdf({ paper, role, fetcher = fetch, signal = AbortSignal.timeout(20000) }) {
  const url = lighthousePdfPath(paper, role);
  if (!url) throw new Error('Choose A4 or US Letter and a valid file.');
  const response = await fetcher(url, { credentials: 'same-origin', signal });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/pdf')) throw new Error('The PDF could not be loaded. Please try again.');
  const blob = await response.blob();
  if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('The downloaded file was not a PDF. Please try again.');
  return { blob, filename: `The-Sleeping-Lighthouse-${paper}-${role}.pdf` };
}

export async function prepareLighthousePack({ paper, fetcher = fetch }) {
  if (!['A4', 'Letter'].includes(paper)) throw new Error('Choose A4 or US Letter.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const files = await Promise.all(['players', 'guide'].map(async role => {
      const file = await prepareLighthousePdf({ paper, role, fetcher, signal: controller.signal });
      return { name: file.filename, data: new Uint8Array(await file.blob.arrayBuffer()) };
    }));
    const readme = `THE SLEEPING LIGHTHOUSE — START HERE\nPaper Adventure Workshop\n\nSelected paper size: ${paper === 'Letter' ? 'US Letter' : 'A4'}\n\nFILES\nPlayer Pack: 7 pages. Give these to the players in stages.\nAdult Guide: 4 pages. Contains answers and the ending. Keep it with the adult.\n\nPREPARE\n1. Read Adult Guide page 1 first.\n2. Print all 7 Player pages single-sided at Actual size / 100%, in this paper size. Check the 30 mm lines on pages 5 and 6. Print one set per team.\n3. An adult cuts the 4 journal strips on Player page 2, 6 complete module cards on page 4, and the outer lens square and 3 inner windows on page 6. Retain the window numbers and arrow.\n4. Keep the Adult Guide on screen. Optionally print Guide page 4 for the ending and certificate: 8 sheets in total per team if you add it. Keep it hidden until the finish.\n\nPLAY\nStart with Player pages 1–2. After each checked discovery, the adult releases pages 3–4, then 5–6, then 7. Save all findings on Player page 1. The guide has gradual hints, explanations and the final check. The whole paper game works offline after download.\n\nOPTIONAL WEB COMPANION\nhttps://paperadventure.app/en/escape-room-games/the-sleeping-lighthouse/play/\nThis is a webpage, not an offline file in this ZIP. Internet is needed to open it. It offers hints, checks and local browser progress when storage is available. The companion is optional; prepare the paper materials first.\n\nSUPPLIES AND GROUP\nOrdinary paper, printer, pencil, eraser, adult-handled scissors and a flat table. No glue, lock, pin or transparent sheet. Suggested ages 7–12 with adult support; 2–6 players per team. Age guidance is provisional; play and preparation time have not been measured.\n\nUSE\nFor your household or the classes you teach. Keep the Paper Adventure credit. Do not resell or republish the files. Share the public game page instead:\nhttps://paperadventure.app/en/escape-room-games/the-sleeping-lighthouse/\n`;
    files.push({ name: 'START-HERE.txt', data: new TextEncoder().encode(readme) });
    return { blob: createDownloadZip(files), filename: `The-Sleeping-Lighthouse-${paper}-complete.zip` };
  } catch (error) {
    controller.abort();
    throw error;
  } finally { clearTimeout(timer); }
}
