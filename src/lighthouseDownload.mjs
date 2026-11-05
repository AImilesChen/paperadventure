import { lighthousePdfPath } from '../shared/lighthouse-game.mjs';
export async function prepareLighthousePdf({ paper, role, fetcher = fetch }) {
  const url = lighthousePdfPath(paper, role);
  if (!url) throw new Error('Choose A4 or US Letter and a valid file.');
  const response = await fetcher(url, { credentials: 'same-origin' });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/pdf')) throw new Error('The PDF could not be loaded. Please try again.');
  const blob = await response.blob();
  if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('The downloaded file was not a PDF. Please try again.');
  return { blob, filename: `The-Sleeping-Lighthouse-${paper}-${role}.pdf` };
}
