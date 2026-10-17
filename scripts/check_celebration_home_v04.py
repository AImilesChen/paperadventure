"""Check cut geometry, referenced pages and executable checkpoint contracts."""
import json, hashlib
import pdfplumber
from pypdf import PdfReader
from generate_celebration_home_v04 import ROOT, CHECKS, TEAM_ROWS
from generate_celebration_samples import validate_logic
validate_logic()
m=json.loads((ROOT/'output/pdf/celebration-home-v0.4-manifest.json').read_text())
assert len(m['items'])==4
for f in m['items']:
 path=ROOT/f['path'];pages=PdfReader(path).pages
 assert len(pages)==(10 if f['role']=='player' else 12)
 assert hashlib.sha256(path.read_bytes()).hexdigest()==f['sha256']
 text='\n'.join(p.extract_text() for p in pages)
 assert 'v0.4' in text and 'v0.3' not in text
 if f['role']=='player':
  for n,title in [(1,'Choose your team'),(2,'Four explorer job cards'),(3,'Team trail'),(4,'1 / Find'),(5,'2 / Build'),(6,'3 / Restore'),(7,'4 / Decode'),(8,'4 / Two'),(9,'5 / Choose'),(10,'Finish')]:
   assert title in pages[n-1].extract_text(),(path,n)
  assert 'Answer /' not in text and 'Letter A / SUN:' not in text
  assert 'Keeper records' not in text
  assert 'Mapper records strip IDs' in pages[4].extract_text()
  for n,labels in [(2,['ALL / Give: '+r for r in ['Courier','Spotter','Mapper','Keeper']]),(4,['1 / Give: '+r for r in ['Courier','Spotter','Keeper']]),(5,['2 / Strip '+r+' / Share' for r in ['A','B','C','D','E']]),(6,['3 / Give: '+r for r in ['Courier','Spotter','Keeper']]),(8,['4 / Give: Spotter','4 / Give: Keeper']),(9,['5 / PARCEL '+r+' / Team' for r in ['A','B','C','D']])]:
   actual=pages[n-1].extract_text()
   for label in labels:assert label in actual,(path,n,label)
 else:
  assert '11 sheets' in text and '21 sheets' in text
  for i in range(5):
   p=pages[i+4].extract_text()
   for section in ['Prepare and distribute','Run the checkpoint','Accept only','Hints /','Close and transition']:
    assert section in p,(path,i,section)
  assert "Fenn's celebration letters" in pages[11].extract_text()
  assert 'Cut, sort and hand out' in pages[3].extract_text()
  assert 'Support and shared turns' in pages[10].extract_text()
  assert 'guide page 12' in pages[8].extract_text()
  assert '21 cut pieces' in pages[1].extract_text()
  assert '22 sheets' in text and '32' in text
  assert 'task panel' in pages[2].extract_text()
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
print('PASS: 44 pages, page mapping, five executable host scripts, card-fit assertions, two paper sizes, integrity, unique clue chain and 2-12 team rules. No human play-test claim.')

