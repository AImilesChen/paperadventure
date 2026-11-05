"""Audit twelve PDFs and package the revised self-contained household edition."""
import hashlib,json,re,zipfile,math
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream
from reportlab.pdfbase.pdfmetrics import stringWidth
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/private/midnight-masquerade';QA=ROOT/'tmp/midnight-masquerade-qa';QA.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text());MM=72/25.4
assert manifest['printPagesPerFormat']=={'players':13,'setup':3,'role-A':3,'role-B':3,'role-C':3,'guide':8}
audit=[]
for f in manifest['files']:
 p=OUT/f['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'];r=PdfReader(p);assert len(r.pages)==f['pages']
 for page in r.pages:assert len(page.extract_text())>70
 if f['role']=='players':
  rects=lambda page:[list(map(float,args))for args,op in ContentStream(page.get_contents(),r).operations if op==b're']
  has=lambda page,w,h:any(abs(v[2]-w)<.01 and abs(v[3]-h)<.01 for v in rects(page))
  assert has(r.pages[5],180*MM,90*MM)and has(r.pages[5],40*MM,18*MM),'Sleeve/window geometry'
  assert has(r.pages[6],170*MM,25*MM),'Connected strip geometry'
  assert has(r.pages[10],45*MM,35*MM)and has(r.pages[11],40*MM,28*MM),'Ending token fits board'
  captions=[]
  def visit(text,cm,tm,font,size):
   if text.strip()in ['STAR','BUBBLE']:
    t=text.strip();captions.append({'text':t,'center':cm[0]*(tm[4]+stringWidth(t,'Helvetica-Bold',size)/2)+cm[4],'y':cm[3]*tm[5]+cm[5],'size':size*abs(cm[0])})
  r.pages[6].extract_text(visitor_text=visit)
  star,bubble=captions[:2];assert abs((bubble['center']-star['center'])-50*MM)<.1
  assert min(star['size'],bubble['size'])>=10.9,'Strip clue text too small'
  shared=' '.join(page.extract_text()for page in r.pages[:12]);assert 'Iris steps forward'not in shared
 if f['role'].startswith('role-'):
  role=f['role'][-1];text='\n'.join(p.extract_text()for p in r.pages)
  for n in range(1,7):assert role+str(n)+' / ROUND '+str(n)in text
 audit.append({'file':p.name,'pages':len(r.pages),'sha256':f['sha256'],'status':'passed'})
normal=lambda text:re.sub(r'\s+',' ',re.sub(r'(A4|Letter) / (PLAYERS|SETUP|ROLE-[ABC]|GUIDE) / \d+ OF \d+','',text)).strip()
for role in manifest['printPagesPerFormat']:
 a,b=[PdfReader(OUT/(size+'-'+role+'.pdf'))for size in ['A4','Letter']]
 for i,(x,y)in enumerate(zip(a.pages,b.pages)):assert normal(x.extract_text())==normal(y.extract_text()),(role,i+1,'paper variant mismatch')
html=(OUT/'companion.html').read_text(encoding='utf8');assert 'fetch('not in html and '<script src='not in html
assert not(ROOT/'public/assets/midnight-masquerade').exists()

for paper in ['A4','Letter']:
 r=PdfReader(OUT/(paper+'-players.pdf'))
 assert 'R-01 / Recovered Dawn Jewel' in r.pages[11].extract_text()
 assert 'STAR' in r.pages[11].extract_text()
 assert 'Iris steps forward' not in r.pages[11].extract_text()
 assert 'Iris steps forward' in r.pages[12].extract_text()
 b=PdfReader(OUT/(paper+'-role-B.pdf')).pages[1].extract_text()
 assert b.count('Receiving signature:')==2 and b.count('Eden')==2
(OUT/'START-HERE.txt').write_text("""THE MIDNIGHT MASQUERADE / HOUSEHOLD EDITION 2

START WITH A4-setup.pdf OR Letter-setup.pdf.
The three-page preparation map contains a print plan, packet labels, table
example and sleeve assembly diagrams. Read the matching Adult Guide privately.
Recommended: 3-6 investigation players PLUS one adult host; 2 players supported.

Extract the whole ZIP. Choose ONE paper size. Print single-sided at 100%:
Player Pack 13 pages + roles A/B/C 3 pages each = 22 player sheets.
The 3-page preparation map and 8-page Adult Guide can stay on screen.
Paper, pencil and adult-handled scissors; no tape, locks or real jewellery.

Standard mode: 31 cut game pieces plus optional seven packet labels. Adult
cuts/sorts all 18 private cards. Never give a whole role sheet to a player.
No-cut mode: cover future cards, uncover only the current round and compare
the printed display views instead of assembling the sleeve.

Start: Player pages 1-4 + A1/B1/C1. Follow the packet map for later rounds.
AFTER ROUND 5: release Player page 12 / R-01 recovery card. Inspect STAR.
AFTER ROUND 6: release Player page 13 / confession and certificate.
Keep prior evidence and the completed seating board available.

Three players: A, B, C. Four-six: pairs share portfolios; one reads/reports,
one records/checks; swap each round. Two: A+B and C, swapping each round.
Read privately, hide, then explain. Showing cards for access support is welcome.
Nobody plays the culprit or invents evidence. Hints and assistance are allowed.

Optional offline browser: open companion.html in a modern desktop browser.
Keep all PDFs beside it. Downloaded HTML support on phones varies. The full
paper game uses the Adult Guide without the browser. The private-card viewer
is a pass-screen aid, not secure multiplayer. Others look away; hide before
passing. Open private views are not saved and close when the page is hidden.

Household licence: adult purchaser and household, private non-commercial use;
reasonable household reprinting. No resale or redistribution.
Copyright 2026 Paper Adventure Workshop. Original story and vector artwork.
""",encoding='utf8')
include=['START-HERE.txt','companion.html']+[f['path'] for f in manifest['files']]
zip_path=OUT.parent/'midnight-masquerade-household-v2.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for name in include:
  info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(OUT/name).read_bytes())
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 assert 'manifest.json' not in z.namelist() and 'PLAYTEST.txt' not in z.namelist()
 for name in include:assert z.read(name)==(OUT/name).read_bytes()
pages=sum(f['pages'] for f in manifest['files'])
report={'status':'passed','scope':'local revision; not published','pdfAudit':audit,'pdfPages':pages,'variantMatchedPages':pages//2,'privateCards':18,'fullCutGamePieces':31,'optionalLabels':7,'zip':str(zip_path),'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'browser':json.loads((QA/'browser-result.json').read_text()) if (QA/'browser-result.json').exists() else {'status':'not_run_in_this_environment'},'remaining':['Physical print/cut/slide validation','First-time adult preparation','Independent family playtest; age and duration validation']}
(QA/'delivery-audit-v2.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:report[k] for k in ['status','pdfPages','variantMatchedPages','zip','sha256']},indent=2))

