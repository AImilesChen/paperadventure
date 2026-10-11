"""Verify every edition's content, geometry, inventory and ZIP integrity."""
import json,hashlib,re,zipfile
from pathlib import Path
from pypdf import PdfReader
from audit_pdf_layout import audit
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'output/pdf/retail-packs-1.0-manifest.json').read_text())
assert len(m['items'])==48
assert len({(x['world'],x['setting'],x['paper'],x['role']) for x in m['items']})==48
reports=[]
for f in m['items']:
 path=ROOT/f['path']; data=path.read_bytes();assert len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256']
 r=PdfReader(path);assert len(r.pages)==f['pages'];t=' '.join(p.extract_text() or '' for p in r.pages)
 assert not re.search(r'internal|draft|not play.tested|do not sell|unpublished',t,re.I),path
 assert 'Edition 1.0' in t
 if f['world']!='celebration' or f['setting']!='home':
  story_led_home=f['world'] in ('halloween','christmas') and f['setting']=='home'
  compact_dinosaur_guide=f['world']=='dinosaur' and f['setting']=='home' and f['role']=='guide'
  assert f['pages'] >= (10 if compact_dinosaur_guide else 11 if story_led_home and f['role']=='guide' else 12)
  if f['role']=='guide':
   required=['Print, cut and sort','Handover']
   required+=['READ, PLAY, VERIFY','Help without taking over'] if f['world']=='christmas' and f['setting']=='home' else ['Prepare and distribute','Hints without taking over']
   assert all(v in t for v in required),path
 report=audit(path);assert not report['failures'],report;reports.append(report)
for key in {(x['world'],x['setting'],x['paper']) for x in m['items']}:
 with zipfile.ZipFile(ROOT/'output/pdf'/('-'.join(key)+'-complete-1.0.zip')) as z:
  assert len(z.namelist())==2 and z.testzip() is None
  for x in m['items']:
   if (x['world'],x['setting'],x['paper'])==key:assert hashlib.sha256(z.read(Path(x['path']).name)).hexdigest()==x['sha256']
(ROOT/'output/pdf/retail-layout-audit.json').write_text(json.dumps(reports,indent=2)+'\n')
print('48 PDFs and 24 two-file ZIPs passed content, page geometry and integrity checks.')

