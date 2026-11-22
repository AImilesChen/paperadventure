"""Check actual exported English clues, scripts, privacy, geometry and paired ZIPs."""
from pathlib import Path
from collections import Counter
import json,hashlib,zipfile,re,itertools
import pdfplumber
from pypdf import PdfReader
R=Path(__file__).resolve().parents[1];Q=R/'tmp/pdfs/halloween-home-en'
M=json.loads((R/'output/pdf/halloween-home-en-1.1/manifest.json').read_text(encoding='utf-8'))
texts={};proof=[];actor_sizes={}
G=json.loads((Q/'geometry.json').read_text(encoding='utf-8'))
for f in M['items']:
 raw=(R/f['path']).read_bytes();assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256']
 with pdfplumber.open(R/f['path']) as d:
  assert len(d.pages)==f['pages']==(17 if f['role']=='player' else 19)
  pages=[' '.join((v.extract_text() or '').split()) for v in d.pages];texts[f['paper'],f['role']]=pages
  for i,v in enumerate(d.pages):
   assert len(v.chars)>90
   for c in v.chars:assert 35<=c['x0'] and c['x1']<=v.width-35 and 14<=c['top'] and c['bottom']<v.height-14,(f['path'],i+1,c)
  if f['role']=='player':
   assert all(f'MISSION {i} / STORY AND ACTIONS' in pages[n-1] for i,n in enumerate([6,8,10,13,16],1))
   assert all(not re.search(r'\b(?:BAT|OWL|STAR)\b',t) for t in pages[:7]),'actors leaked before mission1 accepted'
   assert 'not answers' not in pages[3] or 'METHOD' in pages[3]
   assert 'method examples' in pages[3].lower() and 'method diagrams' in pages[4].lower()
   assert 'already visible' in pages[4] and 'BOTH layers' in pages[4]
   assert 'What did folding reveal' not in ' '.join(pages)
   assert 'Same scale as the poster marks.' in pages[6]
   assert all(x in pages[1] for x in ['with 2 children','with 3','with 4','With 5-6'])
   assert all(x in pages[2] for x in ['marked posters','actual arrangement','Adult checked','Do not copy'])
   assert 'Top left:' not in pages[2] and 'Torn poster: _____' not in ' '.join(pages)
   clue=pages[10]
   matches=re.findall(r'The (OWL|BAT|PUMPKIN|STAR) stands directly (above|right of|below|left of) the (OWL|BAT|PUMPKIN|STAR)\.',clue)
   assert len(matches)==4,matches
   solutions=[]
   for perm in itertools.permutations(['OWL','BAT','PUMPKIN','STAR']):
    pos=dict(zip(perm,[(0,0),(1,0),(0,1),(1,1)]));ok=True
    for a,relation,b in matches:
     delta=(pos[a][0]-pos[b][0],pos[a][1]-pos[b][1]);ok &= delta=={'above':(0,-1),'right of':(1,0),'below':(0,1),'left of':(-1,0)}[relation]
    if ok:solutions.append(list(perm))
   assert solutions==[['OWL','BAT','PUMPKIN','STAR']],solutions
   assert 'TOP' in pages[11] and 'TOP LEFT' in pages[11] and 'BOTTOM RIGHT' in pages[11]
   vertical_text=PdfReader(R/f['path']).pages[13].extract_text()
   assert 'FOLD - DO NOT CUT' in vertical_text and 'CUT THREE SIDES' in vertical_text
   assert 'PIP\'S PAPER LANTERN IS LIT' not in ' '.join(pages)
   assert all(not re.search(r'OWL\s+(?:top left|WATCHES)',t,re.I) for t in pages)
   assert not re.search(r'\b(BAT|OWL|PUMPKIN|STAR)\b',pages[14])
   assert 'Card order is NOT' in pages[12]
   assert all(x in pages[15] for x in ['curtain-call space','lifts the whole window sheet','all four actors','Host page 17'])
   assert 'after' in pages[16].lower() and 'keepsake' in pages[16].lower()
   assert not re.search(r'\b(BAT|OWL|PUMPKIN|STAR)\b',pages[16])
   # Measure actual filled printed actor outlines rather than assuming template size.
   pg=d.pages[8];geo=next(x for x in G if x['paper']==f['paper'] and x['role']=='player' and x['kind']=='puppets')
   shapes=[x for x in pg.curves+pg.rects if x.get('fill') and x.get('non_stroking_color') and tuple(x['non_stroking_color'])==(0.062745,0.184314,0.329412)]
   # RGB values can differ in their serialized precision; dark-blue filled shapes only.
   if not shapes:shapes=[x for x in pg.curves+pg.rects if x.get('fill') and isinstance(x.get('non_stroking_color'),(tuple,list)) and max(x['non_stroking_color'])<.6]
   sizes=[]
   for row in range(2):
    for col in range(2):
     x0=geo['x']+col*geo['width']/2;y0=geo['y']+(1-row)*geo['height']/2
     group=[x for x in shapes if x0<(x['x0']+x['x1'])/2<x0+geo['width']/2 and y0<(x['y0']+x['y1'])/2<y0+geo['height']/2]
     assert group,(f['paper'],row,col,shapes)
     sizes.append([max(x['x1'] for x in group)-min(x['x0'] for x in group),max(x['y1'] for x in group)-min(x['y0'] for x in group)])
   actor_sizes[f['paper']]=sizes
  else:
   assert '17 pages' in pages[0] and '19 pages' in pages[0]
   assert 'one for EACH team' in pages[0] and '36 for one team' in pages[0] and '54 for two' in pages[0]
   assert '17 loose pieces' in pages[2] and '13 loose pieces' in pages[2]
   assert all('Accept only after checking' in pages[n-1] for n in [7,9,11,13,16])
   a=re.findall(r'WAIT FOR: (BAT|OWL|PUMPKIN|STAR).*?window\s*(\d)',pages[13]);assert a==[('BAT','2'),('OWL','1'),('PUMPKIN','3'),('STAR','4')],a
   b=re.findall(r'WAIT: (BAT|OWL|PUMPKIN|STAR).*?window\s*(\d)',pages[16]);assert b==[('OWL','1'),('PUMPKIN','3'),('BAT','2'),('STAR','4')],b
   assert 'READ ONLY AFTER ACCEPTANCE' in pages[16] and 'Lift the WHOLE window sheet' in pages[16]
   assert all(x in pages[17] for x in ['PRIVATE PRINT MASTER','ONE PER TEAM','OWL WATCHES','BAT FLIES','PUMPKIN WELCOMES','STAR SHINES','TOP'])
   assert 'Lift the window sheet after the curtain call.' in pages[17]
   assert 'keep' in pages[18].lower() and 'Reprint' in pages[18]
 proof.append({'paper':f['paper'],'role':f['role'],'pages':f['pages'],'sha256':f['sha256']})
for paper in ['A4','Letter']:
 board=[next(x for x in G if x['paper']==paper and x['kind']==kind) for kind in ['stage','facade','finale']]
 assert [x['page'] for x in board]==[12,14,18]
 assert [x['role'] for x in board]==['player','player','guide']
 assert all(abs(x['x']-board[0]['x'])<.01 and abs(x['y']-board[0]['y'])<.01 and x['centres']==board[0]['centres'] for x in board)
 opening=board[1]['openingSize']
 assert all(w+8<opening[0] and h+8<opening[1] for w,h in actor_sizes[paper]),(paper,opening,actor_sizes[paper])
for role in ['player','guide']:
 norm=lambda t:Counter(re.sub(r'\s+','',t.replace('/ A4','/ PAPER').replace('/ Letter','/ PAPER')))
 assert [norm(x) for x in texts['A4',role]]==[norm(x) for x in texts['Letter',role]]
for z in M['zips']:
 assert hashlib.sha256((R/z['path']).read_bytes()).hexdigest()==z['sha256']
 with zipfile.ZipFile(R/z['path']) as a:
  assert len(a.namelist())==2 and a.testzip() is None
  for f in M['items']:
   if f['paper']==z['paper']:assert hashlib.sha256(a.read(Path(f['path']).name)).hexdigest()==f['sha256']
b=(R/'scripts/halloween_paper_theatre.py').read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='6813f7e1e5ab4ab84af4d10b6bc02b283461f472'
result={'status':'passed','pages':72,'pdfs':proof,'printedStageUniqueSolution':solutions[0],'actualActorSizes':actor_sizes,'stageWindowPrivateMasterAligned':True,'privateFinaleOnlyInHost':True,'scriptsDifferAndMatchCueCards':True,'fullCuts':17,'lowCuts':13,'paperTextContentParity':True,'zipPairsVerified':2,'originalSourceUnchanged':True,'physicalOrChildTrial':False}
(Q/'checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
(Q/'texts.json').write_text(json.dumps({p+'-'+r:t for (p,r),t in texts.items()},indent=2),encoding='utf-8')
print('72 pages: actual printed clues, two scripts, privacy, roles, bounds, actor fit, three-sheet alignment, paper text parity and ZIP hashes passed.')
