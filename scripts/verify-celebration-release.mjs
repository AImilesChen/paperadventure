const origin = 'https://paperadventure.app';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function get(path) {
  let response;
  for (let attempt = 0; attempt < 12; attempt++) {
    response = await fetch(origin + path);
    if (response.ok) return response;
    await wait(2000);
  }
  throw new Error('Public release check failed: ' + path + ' (' + response?.status + ')');
}

let catalog, celebration;
for (let attempt = 0; attempt < 12; attempt++) {
  catalog = await (await get('/api/v1/catalog')).json();
  celebration = catalog.themes?.find(theme => theme.id === 'celebration');
  if (catalog.freeSampleThemeId === 'celebration' && celebration?.home?.freeSample && celebration?.classroom?.freeSample) break;
  await wait(2000);
}
if (catalog.freeSampleThemeId !== 'celebration' || !celebration?.home?.freeSample ||
    !celebration?.classroom?.freeSample || catalog.offers?.some(offer => offer.saleEnabled)) {
  throw new Error('Public catalog mismatch: ' + JSON.stringify({ freeSampleThemeId: catalog.freeSampleThemeId,
    home: celebration?.home?.freeSample, classroom: celebration?.classroom?.freeSample,
    paid: catalog.offers?.some(offer => offer.saleEnabled) }));
}
for (const setting of ['home', 'classroom']) {
  if (celebration[setting].packVersion !== 'v0.1') throw new Error('Unexpected trial version');
  for (const paper of ['A4', 'Letter']) {
    for (const role of ['player', 'guide']) {
      const path = '/api/v1/samples/' + setting + '/' + paper + '/' + role;
      const response = await get(path);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!response.headers.get('content-type')?.includes('application/pdf') ||
          bytes.length < 1000 || String.fromCharCode(...bytes.slice(0, 4)) !== '%PDF') {
        throw new Error('Invalid public PDF: ' + path);
      }
      console.log(setting + '/' + paper + '/' + role + ': verified PDF (' + bytes.length + ' bytes)');
    }
  }
}
