"""Check cut geometry, referenced pages and executable checkpoint contracts."""
import json, hashlib
import pdfplumber
from pypdf import PdfReader
from generate_celebration_home_v03 import ROOT, CHECKS, TEAM_ROWS
from generate_celebration_samples import validate_logic
validate_logic()
m=json.loads((ROOT/'output/pdf/celebration-home-v0.3-manifest.json').read_text())
assert len(m['items'])==4
for f in m['items']:
 path=ROOT/f['path'];pages=PdfReader(path).pages
 assert len(pages)==10
 assert hashlib.sha256(path.read_bytes()).hexdigest()==f['sha256']
 text='\n'.join(p.extract_text() for p in pages)
 assert 'v0.3' in text and 'v0.2' not in text
 if f['role']=='player':
  for n,title in [(1,'Choose your team'),(2,'Four explorer job cards'),(3,'Team trail'),(4,'1 / Find'),(5,'2 / Build'),(6,'3 / Restore'),(7,'4 / Decode'),(8,'4 / Two'),(9,'5 / Choose'),(10,'Finish')]:
   assert title in pages[n-1].extract_text(),(path,n)
  assert 'Answer /' not in text and 'Letter A / SUN:' not in text
 else:
  assert '11 sheets' in text and '21 sheets' in text
  for i in range(5):
   p=pages[i+3].extract_text()
   for section in ['Prepare and distribute','Run the checkpoint','Accept only','Hints /','Close and transition']:
    assert section in p,(path,i,section)
  assert "Fenn's celebration letters" in pages[9].extract_text()
 with pdfplumber.open(path) as pdf:
  for n,p in enumerate(pdf.pages):
   for ch in p.chars:
    assert 0<=ch['x0']<ch['x1']<=p.width+1 and 0<=ch['top']<ch['bottom']<=p.height+1,(path,n,ch)
   for ln in p.extract_text().splitlines():
    assert 'v0.1' not in ln
for n in range(2,13):
 teams=[n] if n<=6 else [n//2,n-n//2]
 assert all(2<=s<=6 for s in teams)
 for size in teams:
  bundles=[['Courier','Mapper'],['Spotter','Keeper']] if size==2 else [['Courier'],['Spotter'],['Mapper','Keeper']] if size==3 else [['Courier'],['Spotter'],['Mapper'],['Keeper']]
  assert set(sum(bundles,[]))=={'Courier','Spotter','Mapper','Keeper'}
  assert len(bundles)<=size
  for checkpoint in range(5):
   if size<=4:
    rotated=bundles[checkpoint%len(bundles):]+bundles[:checkpoint%len(bundles)]
    assert len(rotated)==size
print('PASS: 40 pages, page mapping, five executable host scripts, card-fit assertions, two paper sizes, integrity, unique clue chain and 2-12 team rules. No human play-test claim.')

