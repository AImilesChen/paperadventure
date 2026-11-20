import { createDownloadZip } from './downloadZip.mjs';

export async function prepareSampleDownload({ setting, paper, role, locale = 'en', expectedVersion, signal, fetcher = fetch }) {
  if(!['en','zh'].includes(locale))throw new Error('Choose a supported PDF language.');
  if (!['home', 'classroom'].includes(setting) || !['A4', 'Letter'].includes(paper) || !['complete', 'player', 'guide'].includes(role)) throw new Error('Choose a valid game and paper size.');
  const roles = role === 'complete' ? ['player', 'guide'] : [role];
  const files = await Promise.all(roles.map(async fileRole => {
    const response = await fetcher(`/api/v1/samples/${setting}/${paper}/${fileRole}${locale==='zh'?`?locale=zh${expectedVersion?'&version='+encodeURIComponent(expectedVersion):''}`:''}`, { credentials: 'same-origin', signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The file is temporarily unavailable. Please try again.');
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length < 5 || new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') throw new Error('The PDF could not be prepared. Please try again.');
    const version=response.headers.get('x-paper-adventure-pack-version');
    if(locale==='zh'&&(response.headers.get('x-paper-adventure-locale')!=='zh'||!version))throw new Error('The PDF language could not be verified. Please try again.');
    if(locale==='zh'&&expectedVersion&&version!==expectedVersion)throw new Error('The PDF edition is being updated. Please try again later.');
    return { name: `celebration-${setting}-${fileRole}${locale==='zh'?'-zh':''}-${paper}.pdf`, data, version };
  }));
  if(locale==='zh'&&new Set(files.map(file=>file.version)).size!==1)throw new Error('The PDF editions changed during download. Please try again.');
  const blob = role === 'complete' ? createDownloadZip(files) : new Blob([files[0].data], { type: 'application/pdf' });
  return { blob, filename: `celebration-${setting}-${role}${locale==='zh'?'-zh':''}-${paper}.${role === 'complete' ? 'zip' : 'pdf'}` };
}
