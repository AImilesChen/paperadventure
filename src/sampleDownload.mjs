import { createDownloadZip } from './downloadZip.mjs';

export async function prepareSampleDownload({ setting, paper, role, signal, fetcher = fetch }) {
  if (!['home', 'classroom'].includes(setting) || !['A4', 'Letter'].includes(paper) || !['complete', 'player', 'guide'].includes(role)) throw new Error('Choose a valid game and paper size.');
  const roles = role === 'complete' ? ['player', 'guide'] : [role];
  const files = await Promise.all(roles.map(async fileRole => {
    const response = await fetcher(`/api/v1/samples/${setting}/${paper}/${fileRole}`, { credentials: 'same-origin', signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The file is temporarily unavailable. Please try again.');
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length < 5 || new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') throw new Error('The PDF could not be prepared. Please try again.');
    return { name: `celebration-${setting}-${fileRole}-${paper}.pdf`, data };
  }));
  const blob = role === 'complete' ? createDownloadZip(files) : new Blob([files[0].data], { type: 'application/pdf' });
  return { blob, filename: `celebration-${setting}-${role}-${paper}.${role === 'complete' ? 'zip' : 'pdf'}` };
}
