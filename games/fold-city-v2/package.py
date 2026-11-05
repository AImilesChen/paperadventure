"""Audit final customer files, package and extract exact delivered bytes."""
from pathlib import Path
import json,zipfile,hashlib,re
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4,letter
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/private/fold-city-v2';QA=ROOT/'tmp/fold-city-v2-qa';D=json.loads(Path(__file__).with_name('game.json').read_text(encoding='utf8'));M=json.loads((OUT/'manifest.json').read_text())
normal=lambda t:re.sub(r'\s+',' ',re.sub(r'(A4|Letter) / (PLAYERS|GUIDE) / \d+ OF \d+','',t)).strip()
for f in M['files']:
 p=OUT/f['path'];b=p.read_bytes();assert len(b)==f['bytes']and hashlib.sha256(b).hexdigest()==f['sha256'];r=PdfReader(p);assert len(r.pages)==f['pages'];size=A4 if f['paper']=='A4'else letter
 for pg in r.pages:assert abs(float(pg.mediabox.width)-size[0])<.1 and abs(float(pg.mediabox.height)-size[1])<.1
 if f['role']=='players':
  assert normal(D['story']['opening'])in normal(r.pages[0].extract_text())
  assert normal(D['story']['ending'])in normal(r.pages[9].extract_text())
  assert "The attendant smiles"not in ''.join(p.extract_text()for p in r.pages[:9])
  for id,page in [('CA',6),('G',6),('CB',6),('W',6),('H',7),('CC',7),('F',7),('M',7)]:assert normal(D['events'][id]['text'])in normal(r.pages[page].extract_text()),id
  for title,text in D['rules']:assert normal(text)in normal(r.pages[1].extract_text()),title
 if f['role']=='guide':assert 'A2O connects CA and CB'in r.pages[8].extract_text()
for role in ['players','guide']:
 a,b=[PdfReader(OUT/f'{paper}-{role}.pdf')for paper in ['A4','Letter']]
 for i,(x,y)in enumerate(zip(a.pages,b.pages)):assert normal(x.extract_text())==normal(y.extract_text()),(role,i+1)
html=(OUT/'companion.html').read_text(encoding='utf8');embedded,_=json.JSONDecoder().raw_decode(html.split('const DATA=',1)[1]);assert embedded==D;assert '<script src='not in html and 'fetch('not in html
start="""THE SECRET OF FOLD CITY / HOUSEHOLD EDITION 2

OPEN FIRST
Extract the WHOLE ZIP. Choose A4 OR US Letter; do not mix paper formats.
Adult reads Guide pages 1-4. Pages 5-12 contain solutions and assistance.
English / 2-4 players sharing ONE party / age 9+ design target.
Preparation and play times are unmeasured; physical trials remain pending.

PRINT AND BUILD
Print the 10 Player pages single-sided at actual size / 100%, with Fit off.
Keep the 12-page Adult Guide on screen, or add 12 printed sheets.
You need ordinary paper, a pencil, adult-handled scissors and a glue stick.
Board page 3 stays whole. Check its 176 mm field and the 88 mm card-sheet line.
Cut SIX faces from Player pages 4-5 to make THREE double-sided cards.
Match letters and TOP edges. Flip each BACK left-to-right, print down, then
put it UNDER its front. Glue BLANK sides together, align edges and dry flat.
Front top-left triangle corresponds to back top-right triangle.
Never cut the dashed fold line. Guide page 2 shows assembly with real faces.
Practise A away from the board and compare with Guide page 3. Fold the FRONT
LEFT strip inward: it exposes bottom board and puts the reverse road on top.
Reopen A, then set all fronts upright and flat as in Guide page 4.
A upper-left; B upper-right; C lower-left. D fixed. Party at H, clasps outside.
INITIAL CHECK: H reaches only CC. If it does not, recheck your setup.
Cut Player page 6 markers; a small coin can replace the party marker.
The narrow gate-road patch is optional; marking OPEN on the log also works.

PLAY TOGETHER
Opening 1; rules 2; board 3; fronts/backs 4-5; markers 6; events 7-8; log/jobs 9.
Adult holds ending/certificate 10 until the party actually walks to E.
Share Reader, Planner, Handler and Checker jobs using Player page 9.
Rotate jobs on FIRST visits to each turntable and after taking a clasp.
Before changing a card, propose a connection; afterwards another player
traces the visible road. Only change A at CA, B at CB and C at CC.
Keep the original square slot footprint, even after folding or turning.
Carry the party to the SAME printed turntable after each clockwise 90 turn.
Only visible connected streets count; covered roads and buildings do not.
Read each place event after arrival. Study the bottom map freely.
Take both clasps at G and W, install at M, then actually walk outside to E.
Either clasp may be found first. There is no timer or action budget.

HELP WITHOUT A BROWSER
Guide 9 gives gradual hints. If the team agrees, Guide 10 offers optional
ADULT RESCUE RESETS matched to the clasps already obtained or installed.
A rescue is explicitly a reset, not a normal walk. It keeps your clasps.
Player 9 records the current city; no complete history of moves is needed.

OPTIONAL OFFLINE COMPANION
Open companion.html in a modern desktop browser; keep the four PDF neighbours.
Click stops to preview, then Walk buttons to move. Undo includes item/gate changes.
Joining halfway through paper play? Select I am playing on paper, enter card
states, party and clasps, then Check this position. Invalid entries preserve
your current browser journey. Compare the valid preview to the paper map.
Hints can be read without changing the browser journey. Use this position
and continue replaces that journey; download its save first if you want it.
Undo begins at the synchronised or rescued position. Match later actions on
paper and screen, or re-enter the paper position before seeking more help.
Download save file before closing if browser storage is blocked. Open saved
journey restores it; valid edition 1 journey files can also be imported.
No account or upload is required. Phone local HTML handling varies.

PRINT STATUS AND LICENCE
Digital geometry and files are checked separately from real-world trials.
Physical/black-and-white printing, gluing, durability, unfamiliar adult setup,
independent family play, suitable ages and measured times remain unverified.
Original story, maps and code (c) 2026 Paper Adventure. Household private,
non-commercial play and reasonable household reprinting only. No redistribution.
"""
(OUT/'START-HERE.txt').write_text(start,encoding='utf8')
plan="""PRINT PLAN / HOUSEHOLD EDITION 2
Choose A4 OR US Letter. Single-sided at actual size / 100%; turn off Fit.
PLAYER 1 Opening. 2 Rules. 3 Bottom board, keep whole (176 mm field).
PLAYER 4 Three 88 mm fronts. 5 Three matching backs. Glue into THREE cards.
PLAYER 6 Party, two clasps and optional gate patch; practice/self-check reminder.
PLAYER 7 Garden/bindery events. 8 Entry/gate events. 9 Snapshot and shared jobs.
PLAYER 10 Ending/certificate, adult holds until the party walks outside to E.
Complete Player printing = 10 sheets. Adult Guide = 12 optional printed sheets.
GUIDE 1 Inventory. 2 Glue real faces. 3 Fold/rotate/alignment. 4 Initial setup.
GUIDE 5-8 Two full sample walks. 9 Gradual hints. 10 Optional adult rescue resets.
GUIDE 11 Paper-position helper and saving. 12 Troubleshooting and ending.
No windows, brads, transparencies or extra map pieces required.
Physical print-and-build and independent setup/play trials remain pending.
"""
(OUT/'PRINT-PLAN.txt').write_text(plan,encoding='utf8')
names=['START-HERE.txt','PRINT-PLAN.txt','companion.html']+[f['path']for f in M['files']];zpath=OUT.parent/'fold-city-household-v2.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED)as z:
 for name in names:
  info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(OUT/name).read_bytes())
ex=QA/'extracted';ex.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(zpath)as z:
 assert z.testzip()is None and set(z.namelist())==set(names)
 for name in names:assert Path(name).name==name;assert z.read(name)==(OUT/name).read_bytes();(ex/name).write_bytes(z.read(name))
report=dict(status='passed',pdfPages=44,equivalentPaperPages=22,sharedStoryRulesEventsAndMapData=True,zip=str(zpath),zipSha256=hashlib.sha256(zpath.read_bytes()).hexdigest(),files=names,remaining=D['limits'])
(QA/'delivery-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2))
