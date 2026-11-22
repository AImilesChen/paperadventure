import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CHRISTMAS_HOME_RELEASE,'v95');
assert.ok(process.env.WRANGLER_CLI&&process.env.CLOUDFLARE_API_TOKEN&&process.env.RUNNER_TEMP);
const pin=JSON.parse(readFileSync('content/christmas-home-v95-private-inputs.json'));
assert.equal(pin.r2Key,'internal/christmas-home-v95-private-pdfs.zip');
const archive=process.env.RUNNER_TEMP+'/'+pin.archiveName;
execFileSync(process.execPath,[process.env.WRANGLER_CLI,'r2','object','get','paper-adventure-stage-private/'+pin.r2Key,'--remote','--file',archive],{stdio:'inherit',env:process.env});
const data=readFileSync(archive);assert.equal(data.length,pin.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),pin.sha256);
execFileSync('python3',['-c',String.raw`
import sys,json,zipfile,hashlib
from pathlib import Path
pin=json.loads(Path(sys.argv[1]).read_text('utf-8'));root=Path.cwd().resolve()
allowed={f['path']:f for f in pin['files']};assert len(allowed)==10
with zipfile.ZipFile(sys.argv[2]) as z:
 assert len(z.infolist())==len(allowed) and set(z.namelist())==set(allowed)
 for info in z.infolist():
  p=info.filename;target=(root/p).resolve();assert target.is_relative_to(root) and not info.is_dir()
  assert '\\' not in p and not p.startswith('/') and '..' not in Path(p).parts
  data=z.read(info);f=allowed[p];assert len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256']
  if target.exists():assert target.read_bytes()==data,'Refuse to overwrite a different checked-in manifest: '+p
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 m=json.loads((root/f'output/pdf/christmas-home-{locale}-{version}/manifest.json').read_text('utf-8'));assert len(m['items'])==4
 for f in m['items']:
  data=(root/f['path']).read_bytes();assert data.startswith(b'%PDF-') and len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256']
print('Verified eight private R2 PDF inputs and two pinned manifests. No GitHub paid assets used.')
`,'content/christmas-home-v95-private-inputs.json',archive],{stdio:'inherit'});
writeFileSync(process.env.RUNNER_TEMP+'/christmas-home-input-readback.json',JSON.stringify({source:'existing_private_R2',archiveSha256:pin.sha256,verifiedPdfCount:8},null,2));
