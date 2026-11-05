"""Audit v2 actual PDFs, create explicit print plans, package and extract real bytes."""
from pathlib import Path
import json,hashlib,re,zipfile
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4,letter
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/private/last-letter-v2';QA=ROOT/'tmp/last-letter-v2-qa';D=json.loads(Path(__file__).with_name('game.json').read_text());M=json.loads((OUT/'manifest.json').read_text())
normal=lambda t:re.sub(r'\s+',' ',re.sub(r'(A4|Letter) / (PLAYERS|GUIDE) / \d+ OF \d+','',t)).strip()
def blocks(pg):
 for b in pg['blocks']:
  if b['type']=='p':yield b['text']
  elif b['type']=='box':yield b['title'];yield b['text']
  elif b['type']=='table':
   for row in [b['head']]+b['rows']:yield from row
  elif b['type']=='lines':yield from b['labels']
audit=[]
for f in M['files']:
 p=OUT/f['path'];r=PdfReader(p);assert len(r.pages)==f['pages'];assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'];size=A4 if f['paper']=='A4'else letter
 for n,pg in enumerate(r.pages):
  assert abs(float(pg.mediabox.width)-size[0])<.1 and abs(float(pg.mediabox.height)-size[1])<.1
  text=normal(pg.extract_text())
  for expected in blocks(D[f['role']][n]):assert normal(expected)in text,(f['path'],n+1,expected)
 if f['role']=='players':
  assert 'Dear Mara'not in ''.join(p.extract_text()for p in r.pages[:19]);assert 'Dear Mara'in r.pages[19].extract_text()
  assert all('/ LAMP'in r.pages[i-1].extract_text()and '/ FOLDER'not in r.pages[i-1].extract_text()for i in [12,15,18])
  assert all('/ FOLDER'in r.pages[i-1].extract_text()and '/ LAMP'not in r.pages[i-1].extract_text()for i in [11,14,17])
  assert 'PRE-CHECKED'in r.pages[7].extract_text()and 'PRE-CHECKED'in r.pages[9].extract_text()
  assert '213'not in r.pages[3].extract_text()
 audit.append(dict(file=f['path'],pages=f['pages'],status='passed'))
for role in ['players','guide']:
 a,b=[PdfReader(OUT/f'{p}-{role}.pdf')for p in ['A4','Letter']]
 for i,(x,y)in enumerate(zip(a.pages,b.pages)):assert normal(x.extract_text())==normal(y.extract_text()),(role,i+1)
html=(OUT/'companion.html').read_text(encoding='utf8');assert '<script src='not in html and 'fetch('not in html;embedded,_=json.JSONDecoder().raw_decode(html.split('const DATA=',1)[1]);assert embedded==D
start='''THE LAST LETTER BEFORE THE STORM / HOUSEHOLD EDITION 2

1. OPEN FIRST
Extract the WHOLE ZIP. Adult privately reads A4-guide.pdf OR Letter-guide.pdf
(same 8-page Guide). Players do not read the answers. Choose ONE paper size.
English; one adult host plus 2-6 players. Age9+ provisional; time unmeasured.
Paper and pencil. No cutting, folding, real lamp or masking panels required.

2. CHOOSE WHAT TO PRINT
Single-sided at actual size/100%. Player master has20 pages. Guide is separate.
ALL choices during play: print Player1-20 =20 sheets.
Preset route, both tools open: common1-10,20 + route's THREE pages =14 sheets.
Preset route+tool, later choices open: common1-10,20 + TWO route pages =13.
Fixed complete run:1,2,3,5,6,20 + TWO route pages + ONE final =9 sheets;
add help4 if helping =10. Fixed means all those choices are made BEFORE print.
Guide may stay on screen; printing it adds8 sheets. PRINT-PLAN.txt lists pages.
The companion's Adult preparation gives a matching page list and hides choices
that were not printed. Do not use a fixed9/10-sheet packet for open-choice play.

3. PUT ONLY THE OPENING ON THE TABLE
Start: envelope1 AND shared log2. Everything else remains in the adult's pile.
After first check: map3. Commit route/tool, mark route cost once, then receive
only that tool's first investigation page. After its check, receive its proof.
Dock: folder11 OR lamp12, then proof13.
Press: folder14 OR lamp15, then proof16.
Station: folder17 OR lamp18, then proof19.
Return to Act4 choice on map3. If HELP, deduct1 once and give task4. After its
check tick T-01. If CONTINUE, retain that space and never give task4.
Next give register5. Prove identity; choose an affordable final mode. Give:
personal/continue7; personal/help8; collection/continue9; collection/help10.
Give ONE matching final sheet, plus receipt6. Earned T-01 required for8 or10.
Only after valid handover: mark its cost once, complete receipt6, give ending20.
No panel masking needed: unused sheets stay with the adult.

ACTION RULES
Six spaces. Dock2 / press3 / station4 include outward AND return travel.
Optional help1. Personal2 / collection1, paid only after handover check.
Zero AFTER handover allowed. Hints, errors, reading and thinking cost nothing.
Station+help leaves1, so collection remains available. Every legal choice can
finish. Helping supplies a shorter certified final; neither choice scores higher.

OPTIONAL OFFLINE COMPANION
Open companion.html in a modern desktop browser after extracting everything.
PDF links expect all four PDFs beside it. Adult setup must match printed choices.
No network, account or upload required. Phone local-file handling varies.
Browser saves choices/milestones when permitted. If storage blocked, keep tab
open; after closing, continue on paper or replay checked inputs from log2.
Reset asks before clearing this game's saved progress and setup only.

REVIEW STATUS
Household edition2. Physical printing/black-and-white printer output, unfamiliar
adult setup, independent family play, age suitability and actual duration still
need real-world validation. The game does not claim those checks are complete.
Original story/puzzles/art/code (c)2026 Paper Adventure. Household play and
reasonable household reprinting; no resale/redistribution. The sealed letter
stays unread until its recipient chooses to share it in the ending.
'''
# Keep customer-facing number spacing readable, preserving evidence IDs.
start=re.sub(r'\b(age|has|Player|common|folder|lamp|proof|task|map|register|receipt|ending|Guide|Dock|Press|Station|help|Personal|collection|add|adds)(?=\d)',r'\1 ',start)
(OUT/'START-HERE.txt').write_text(start,encoding='utf8')
plans=['PRINT PLAN / HOUSEHOLD EDITION 2','Choose A4 OR Letter Player Pack. Guide separate, 8 optional sheets.','All choices at table: 1-20 = 20 sheets.','Preset route, both tools and later choices open:']
for name,r in D['routes'].items():plans.append(f"  {name}: 1-10, {r['toolPages']['folder']}, {r['toolPages']['lamp']}, {r['proofPage']}, 20 = 14 sheets")
plans+=['','Preset route AND tool, later help/delivery choices open:']
for name,r in D['routes'].items():
 for tool in D['tools']:plans.append(f"  {name}/{tool}: 1-10, {r['toolPages'][tool]}, {r['proofPage']}, 20 = 13 sheets")
plans+=['','Fixed complete runs (all choices made BEFORE printing):']
for name,r in D['routes'].items():
 for tool in D['tools']:
  for helped in [False,True]:
   for mode in ['home','office']:
    if 6-r['cost']-int(helped)<(2 if mode=='home'else 1):continue
    pages=sorted([1,2,3,5,6,20,r['toolPages'][tool],r['proofPage'],D['finalPages'][mode]['helped'if helped else'ordinary']]+([4]if helped else[]))
    plans.append(f"  {name}/{tool}/{'help'if helped else'continue'}/{mode}: "+','.join(map(str,pages))+f' = {len(pages)} sheets')
plans+=['','Match these choices in companion Adult preparation.','Opening always 1+2. Host keeps future pages. Follow Guide page2 for handovers.']
(OUT/'PRINT-PLAN.txt').write_text('\n'.join(plans)+'\n',encoding='utf8')
names=['START-HERE.txt','PRINT-PLAN.txt','companion.html']+[f['path']for f in M['files']];zpath=OUT.parent/'last-letter-household-v2.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED)as z:
 for name in names:
  info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(OUT/name).read_bytes())
extracted=QA/'extracted';extracted.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(zpath)as z:
 assert z.testzip()is None and set(z.namelist())==set(names)
 for name in names:assert Path(name).name==name;assert z.read(name)==(OUT/name).read_bytes();(extracted/name).write_bytes(z.read(name))
report=dict(status='passed',environment='local_v2',version=2,pdfAudit=audit,pdfPages=56,equivalentPaperPages=28,allAuthoredTextPresent=True,sharedBrowserContent=True,zip=str(zpath),sha256=hashlib.sha256(zpath.read_bytes()).hexdigest(),remaining=D['limits'])
for key,name in [('browser','browser-result.json'),('render','pdf-render-result.json'),('extractedPack','pack-browser-result.json'),('visualReview','visual-review.json')]:
 if(QA/name).exists():report[key]=json.loads((QA/name).read_text())
(QA/'delivery-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in report.items()if k not in ['browser','render','extractedPack','visualReview']},indent=2))
