"""Validate the actual output geometry and content, then assemble the local kit."""
import json,hashlib,re,zipfile,math
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream
from reportlab.lib.pagesizes import A4,letter
from reportlab.pdfbase.pdfmetrics import stringWidth
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/private/thirteenth-hour';QA=ROOT/'tmp/thirteenth-hour-qa';QA.mkdir(parents=True,exist_ok=True);MM=72/25.4
m=json.loads((OUT/'manifest.json').read_text());audit=[]
assert m['version']==2
assert m['pagesPerFormat']=={'players':12,'guide':8}
normal=lambda t:re.sub(r'\s+',' ',re.sub(r'(A4|Letter) / (PLAYERS|GUIDE) / \d+ OF \d+','',t)).strip()
for f in m['files']:
 p=OUT/f['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'];r=PdfReader(p);assert len(r.pages)==f['pages'];size=A4 if f['paper']=='A4'else letter
 for page in r.pages:assert abs(float(page.mediabox.width)-size[0])<.1 and abs(float(page.mediabox.height)-size[1])<.1;assert len(page.extract_text())>80
 if f['role']=='players':
  rectangles=lambda page:[list(map(float,a))for a,op in ContentStream(page.get_contents(),r).operations if op==b're']
  has=lambda page,w,h:any(abs(a[2]-w*MM)<.02 and abs(a[3]-h*MM)<.02 for a in rectangles(page))
  assert has(r.pages[1],180,90)and has(r.pages[2],180,110)and has(r.pages[3],180,110)
  assert sum(abs(a[2]-28*MM)<.02 and abs(a[3]-28*MM)<.02 for a in rectangles(r.pages[2]))==3
  assert has(r.pages[4],160,90)and has(r.pages[5],180,100)and has(r.pages[7],180,100)
  assert sum(abs(a[2]-30*MM)<.02 and abs(a[3]-20*MM)<.02 for a in rectangles(r.pages[5]))==2
  assert 'KEEP FLAT'in r.pages[2].extract_text() and 'Fold both'not in r.pages[2].extract_text()
  # Read the actual PDF drawing transforms, not just the authoring constants.
  segments=[];start=[None]
  def operands(op,args,cm,tm):
   if op in [b'm',b'l']:
    x,y=map(float,args);point=(cm[0]*x+cm[2]*y+cm[4],cm[1]*x+cm[3]*y+cm[5])
    if op==b'm':start[0]=point
    elif start[0]is not None:
     if abs(math.dist(start[0],point)-30*MM)<.05:segments.append((start[0],point))
     start[0]=point
  centres={}
  def wheel_text(t,cm,tm,font,size):
   if t.strip()in ['RIGHT','LEAF']:centres[t.strip()]=(cm[4],cm[5])
  r.pages[6].extract_text(visitor_text=wheel_text,visitor_operand_before=operands);assert len(segments)==6
  heights=[]
  for i,(a,b)in enumerate(segments):
   cx,cy=centres['RIGHT'if i<3 else'LEAF'];angle=math.radians(-(i%3)*120);rotated=[]
   for px,py in [a,b]:rotated.append(math.sin(angle)*(px-cx)+math.cos(angle)*(py-cy)+45*MM)
   assert abs(rotated[0]-rotated[1])<.05;heights.append(rotated[0]/MM)
  assert all(abs(x-y)<.05 for x,y in zip(heights,[67,72,62,67,72,62]))
  readings=[]
  def visit(t,cm,tm,font,size):
   text=t.strip()
   if text in ['3','7','10','6','9','2']:
    readings.append((text,tm[4]+stringWidth(text,'Helvetica-Bold',size)/2,tm[5]))
  r.pages[4].extract_text(visitor_text=visit);assert [v[0]for v in readings]==['3','7','10','6','9','2']
  for i in range(3):assert abs(readings[i][1]-readings[i+3][1])<.1;assert abs(readings[i][2]-readings[i+3][2]-45*MM)<.1
  for row in [readings[:3],readings[3:]]:
   for i in range(2):assert abs(row[i+1][1]-row[i][1]-55*MM)<.1
  shared=' '.join(p.extract_text()for p in r.pages[:11]);assert 'Ada reads the message'not in shared
  assert 'Ada reads the message'in normal(r.pages[11].extract_text());assert 'CURRENT'in r.pages[8].extract_text()and 'HISTORY'in r.pages[8].extract_text()
  assert r.pages[10].extract_text().count(' / ' )>=6
  state_text=normal(r.pages[9].extract_text())
  assert state_text.index('BEFORE / DRIVE OFF')<state_text.index('AFTER / DRIVE ON')
  no_cut_values=[]
  r.pages[9].extract_text(visitor_text=lambda t,cm,tm,font,size:no_cut_values.append(t.strip())if t.strip()in ['3','7','10','6','9','2']else None)
  assert no_cut_values==['3','7','10','6','9','2']
  assert all('PROOF '+str(n)in r.pages[8].extract_text()for n in [1,2,3])
  assert 'LEFT + MOON'in r.pages[7].extract_text()
 audit.append({'file':f['path'],'pages':f['pages'],'status':'passed'})
for role in ['players','guide']:
 a,b=[PdfReader(OUT/f'{p}-{role}.pdf')for p in ['A4','Letter']]
 for i,(x,y)in enumerate(zip(a.pages,b.pages)):assert normal(x.extract_text())==normal(y.extract_text()),(role,i+1)
html=(OUT/'companion.html').read_text(encoding='utf8');assert '<script src='not in html and 'fetch('not in html
data=json.loads((ROOT/'games/thirteenth-hour/game.json').read_text(encoding='utf8'))
embedded,_=json.JSONDecoder().raw_decode(html.split('const DATA=',1)[1]);assert embedded==data
for paper in ['A4','Letter']:
 guide=PdfReader(OUT/f'{paper}-guide.pdf')
 for i,stage in enumerate(data['stages']):assert normal(stage['solution'])in normal(guide.pages[i+2].extract_text())
# Customer-facing instructions are deliberately separate from authoring metadata.
(OUT/'START-HERE.txt').write_text("""THE CLOCKMAKER'S THIRTEENTH HOUR / HOUSEHOLD EDITION 2

Extract the WHOLE ZIP. Choose ONE paper size and ONE mode. Single-sided, 100%.
STANDARD: print Player pages 1-9,11-12 = 11 sheets; optional no-cut page 10 omitted.
NO-CUT: print 1,2,4,6,7,9,10,11,12 = 9 sheets; omit frame/strip/backing 3,5,8.
The 8-page Adult Guide may stay on screen. Read it privately before preparation.
One adult host plus 2-5 players; English; age 9+ provisional; duration unmeasured.

Page map: 1 opening; 2 lamp/bench; 3 flat wall frame; 4 striking cabinet;
5 connected strip and R-01; 6 cover/M-01; 7 wheels and markers; 8 backing and
assembly diagram ONLY; 9 repair record; 10 no-cut views and duplicate R-01;
11 six missions; 12 hidden ending. Keep record 9 separate from the mechanism.

STANDARD: paper, pencil and adult-handled scissors. No glue, brad or tape.
Cut/fold bench 2 and cabinet 4 as marked. Keep the extension closed until final
check. Cut wall 3 and three windows; KEEP FLAT. Cut strip 5 as ONE piece,
keeping R-01 below it. Align TOP row in windows with BEFORE grip BELOW.
After the drive check, slide UP 45mm until AFTER grip protrudes above.
Grip labels are only for the ASSEMBLED model; they are not labels for the
adjacent printed rows. Use page 10 for no-cut play instead.
Cut drive cover 6/two windows, whole wheels 7, pins/pointer and missions 11.
Total: 17 cut pieces, five window openings. Prepare all parts before play.
Stack backing 8 > wheels > cover 6. Match centres/corners. Set LEFT+MOON
upright at the top before handing over. Page 8 illustrates layers and handling.
Lift cover > adjust ONE wheel > replace/check. Leave the other wheel centred.
Small gaps: realign paper first; judge evidence and selected labels too.

NO-CUT: ordinary sheets, pencil, three spare opaque sheets; no scissors.
Cover lamp right panel, cabinet extension and the AFTER view on page 10.
Initially show only labelled BEFORE on 10; after round 4 cover BEFORE and
show AFTER at the SAME table position. Use duplicate R-01 on 10. Do not use
strip 5. For drive, circle chosen labels on whole sheet 7 and record evidence
on 9; host checks choices, not physical line alignment. Cover future missions
on 11; reveal one at a time. Point to 12, then special 13 after final check.

HANDOVER (both modes): start with prepared scenes, R-01, record 9, mission 1.
After round 1: mission 2; allow lamp opening/reveal. Keep lamp open.
Round 3: BEFORE test values, fixed offsets, historical drive-parts cabinet code.
After round 3: prepared drive 6-8 (standard) or 6-7 (no-cut), mission 4.
Start LEFT+MOON. Players first explain targets from W-01 and M-01, then set
or circle choices. Host verifies sources/labels, then changes wall to AFTER.
Round 5: current test readings with SAME offsets; do not erase historical code.
Round 6: host checks THREE proof fields on 9, opens striking cabinet extension,
points to special 13 and releases ending 12. The drive-parts cabinet is a
story handover of parts, NOT permission to open the striking cabinet early.

These are independent calibration test dials, not one shared actual time.
Subtract each positive offset and wrap on 12. Rotate reader/operator/recorder.
Hints, equivalent spoken explanations and reading/access support are welcome.
Optional offline companion: open companion.html in a modern desktop browser;
keep PDFs beside it. Phone HTML handling varies. Paper play is complete offline.

Private household use and reasonable reprinting; no resale or redistribution.
Original case/art copyright 2026 Paper Adventure Workshop. Household edition. Physical printing, unfamiliar host setup, family playtesting,
age suitability and actual duration still require real-world validation.
""",encoding='utf8')
names=['START-HERE.txt','companion.html']+[f['path']for f in m['files']];zpath=OUT.parent/'thirteenth-hour-household-v2.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED)as z:
 for name in names:
  info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(OUT/name).read_bytes())
with zipfile.ZipFile(zpath)as z:
 assert z.testzip()is None
 for name in names:assert z.read(name)==(OUT/name).read_bytes()
report={'status':'passed','scope':'local development; no website or payment changes','pdfAudit':audit,'pdfPages':40,'equivalentPaperPages':20,'cutPieces':17,'cutWindows':5,'zip':str(zpath),'sha256':hashlib.sha256(zpath.read_bytes()).hexdigest(),'browser':json.loads((QA/'browser-result.json').read_text())if(QA/'browser-result.json').exists()else{'status':'not_run'},'remaining':['Physical print/cut/slide/rotate verification','Unfamiliar adult setup','Independent family playtest, age suitability and duration']}
(QA/'delivery-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2))

