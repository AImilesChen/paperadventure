"""Audit and package the locally completed game; never uploads public paid files."""
import hashlib,json,zipfile
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/private/seventh-carriage'
QA=ROOT/'tmp/seventh-carriage-qa';QA.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text())
audit=[]
for f in manifest['files']:
 p=OUT/f['path'];reader=PdfReader(p)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256']
 assert len(reader.pages)==f['pages']
 for i,page in enumerate(reader.pages):
  text=page.extract_text()
  assert len(text)>100,(p.name,i)
  assert '\u25a0' not in text,(p.name,i,'missing glyph')
 if f['role']=='players':
  # The physical finale really fits its reserved place.
  rectangles=lambda page:[list(map(float,args)) for args,op in ContentStream(page.get_contents(),reader).operations if op==b're']
  slot=[r for r in rectangles(reader.pages[12])if r[2:]==[145.,145.]]
  ending=[r for r in rectangles(reader.pages[13])if r[2:]==[290.,145.]]
  assert len(slot)==1 and len(ending)==1,(p.name,'finale geometry')
  # Both maps preserve the same window frame and exact scale.
  old=[r for r in rectangles(reader.pages[7])if abs(r[2]-469)<.1 and abs(r[3]-187.6)<.1]
  new=[r for r in rectangles(reader.pages[8])if abs(r[2]-469)<.1 and abs(r[3]-187.6)<.1]
  assert len(old)==len(new)==1,(p.name,'map geometry')
 audit.append({'file':p.name,'pages':len(reader.pages),'status':'passed'})
companion=(OUT/'companion.html').read_text(encoding='utf8')
assert '<script src=' not in companion and 'fetch(' not in companion
assert not (ROOT/'public/assets/seventh-carriage').exists()
quick='''THE MISSING SEVENTH CARRIAGE / ORIGINAL CASE 07 / EDITION 2

ADULT START HERE: extract the entire ZIP to one folder before opening files.
Open companion.html in a modern desktop browser; no internet is needed.
Keep the PDFs beside it so their download links work. On a phone, local HTML
opening depends on the device; the printed game with its Adult Guide remains
fully playable without a browser. Read the guide before giving out materials.

PRINT: choose A4 OR Letter. Print that Player Pack single-sided at 100%.
Keep the matching Adult Guide separate: it contains answers. Start with
Player pages 1-4 only. Keep pages 5-14 with the adult, handing out later packets
according to the guide. Page 14 stays hidden until the ending. Do not mix map sizes or shrink pages.
The guide can be read on screen instead of printed.

SETUP: the Adult Guide gives the exact cutting inventory and page handovers.
For no-cut play, leave the cards whole and compare the two maps side by side.
Use ordinary paper, pencil and adult-handled scissors. No lock or extra prop.

PLAY: share the evidence, save each finding and work through six missions.
The companion checks findings, provides progressive hints and saves locally.
Use the guide to host the full paper game without a device. If browser storage
is unavailable, record progress on Player page 2. Hints do not stop completion.
The final folded card fits its reserved square (approximately 51.2 mm wide). Use the printed cut boundary, not a ruler guess.

EDITION: English / household / US$9.99 one-time, applicable tax included.
One adult purchaser and their household; private non-commercial activities.
Reasonable reprinting within that household. No resale or redistribution.

EDITION NOTES: digital flow, file geometry and page renders checked.
Physical print/cut testing and unfamiliar-family playtesting remain unverified.
Ages 9+ and 2-5 players are design targets. Play duration is not yet measured.
Prepare six mission packets and one ending packet as listed in the guide.
The survey now has two large pieces; full-cut preparation makes 20 pieces.
Copyright 2026 Paper Adventure Workshop.
'''
(OUT/'START-HERE.txt').write_text(quick,encoding='utf8')
(OUT/'PLAYTEST.txt').write_text("""FIRST-TIME FAMILY PLAYTEST / EDITION 2
For an adult observing a volunteer household; do not show this sheet to players.
No real customer payment or account is needed. Ask permission before taking notes.

PREPARATION: give a first-time adult only the extracted package. Do not explain.
Start time: ____ Ready time: ____ Paper size: ____ Print scale: ____
Could they identify the matching guide and player files? ____
Did they hold back future packets and the ending? ____
Did the stated cutting inventory match what they prepared? ____
Could they join the two survey pieces and read Bay 3 through the window? ____
Did the finale card fit its reserved square after folding? ____
Where did they need outside help? Record the exact instruction: ____

PLAY: time begins after preparation, not when downloading or printing.
For each mission record start/end, first wrong conclusion, hint level used,
and whether every child contributed. Do not explain a puzzle early.
1 Identity and seal: ____
2 Witness sequence: ____
3 Clock reliability and sighting intersection: ____
4 Executed transfer vs cancelled request: ____
5 Survey assembly and matching inspection: ____
6 Release time, capacity, deadline and final action order: ____

AFTER PLAY: ask the team to explain where the carriage went, why the conductor
missed the change, and why their chosen service can retrieve it. Do not accept
only the plan letter as evidence of understanding.
Elapsed play time: ____ Preparation time: ____ Unplanned adult help: ____
Best discovery: ____ Frustrating or boring point: ____ Print/reading issue: ____
This record supplies evidence; one successful family does not establish every
age, group size or promised duration. Revise unclear steps before paid release.
""",encoding='utf8')
include=['PLAYTEST.txt','START-HERE.txt','companion.html','A4-players.pdf','A4-guide.pdf','Letter-players.pdf','Letter-guide.pdf','manifest.json']
zip_path=OUT.parent/'seventh-carriage-household-v2.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED)as z:
 for name in include:
  info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,(OUT/name).read_bytes())
evidence={'scope':'new independent paid game / local development','price':manifest['price'],'pdfAudit':audit,'browser':json.loads((QA/'browser-result.json').read_text()) if (QA/'browser-result.json').exists() else {'status':'not_run_in_this_environment'},'zip':str(zip_path),'zipSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'existingSiteFilesChanged':False,'liveSalesActivated':False,'remaining':['Physical print and cut test','Unfamiliar-family playtest','Integrate new series into authenticated paid delivery before publishing any full content']}
(QA/'release.json').write_text(json.dumps(evidence,indent=2),encoding='utf8')
print(json.dumps({'status':'passed','pdfPages':44,'package':str(zip_path),'sha256':evidence['zipSha256']},indent=2))
