"""Verify the fixed postal chain and first-use delivery materials."""
import json
from pathlib import Path
from pypdf import PdfReader
from forest_home_experience import JOBS, STORIES, ACTIONS
ROOT=Path(__file__).resolve().parents[1]
s=next(x for x in json.loads((ROOT/'content/theme-design/retail-games-v1.json').read_text()) if x['id']=='forest' and x['setting']=='home')
marks=[r for r in s['stages'][0]['rows'] if r[1:4]==['Leaf','2','TUE']]
assert len(marks)==1 and marks[0][4]=='M2'
routes=[]
def walk(place,path):
 if place.endswith('TREE'):routes.append(path);return
 for r in s['stages'][1]['rows']:
  if r[1]=='M2' and r[2]==place and r not in path:walk(r[3],path+[r])
walk('POST OFFICE',[])
assert len(routes)==1 and ''.join(r[0] for r in routes[0])=='ABC' and routes[0][-1][3]=='BLUE TREE'
parcels=[r for r in s['stages'][2]['rows'] if r[1:4]==['BLUE TREE','2','Round']]
assert len(parcels)==1 and parcels[0][4]=='W4'
homes=[r for r in s['stages'][3]['rows'] if r[:2]==['BLUE TREE','W4']]
assert len(homes)==1 and homes[0][2]=='OWL HOUSE'
dispatch=[r for r in s['stages'][4]['rows'] if r[1:]==['M2','BLUE TREE','W4','OWL HOUSE']]
assert len(dispatch)==1 and dispatch[0][0]=='A'
assert len(STORIES)==len(ACTIONS)==5
for paper in ['A4','Letter']:
 player=PdfReader(ROOT/f'output/pdf/forest-home-player-1.0-{paper}.pdf')
 guide=PdfReader(ROOT/f'output/pdf/forest-home-guide-1.0-{paper}.pdf')
 assert len(player.pages)==18 and len(guide.pages)==12
 pt=[' '.join(p.extract_text().split()) for p in player.pages]
 gt=[' '.join(p.extract_text().split()) for p in guide.pages]
 assert all(j in pt[1] for j in JOBS)
 assert 'TWO drawn leaf' not in pt[7] and 'ROUND outline' not in pt[7]
 assert 'KEEP WHOLE' in pt[11] and all(x in pt[11] for x in ['BLUE TREE','W2','W4','OWL HOUSE'])
 assert all(x in pt[12] for x in ['BATCH','DISTRICT','FRAGMENT','RECIPIENT'])
 assert 'DISPATCH CHECK' in pt[15] and 'PLACE THE REPAIRED LABEL HERE' in pt[15]
 assert 'ADULT HOLDS UNTIL DELIVERY ACCEPTED' in pt[17]
 assert '31' in gt[1] and '17 sheets' in gt[0]
 assert 'before giving the receipt' in gt[9]
 assert 'task/check table (14)' not in pt[13]+gt[8]
 assert 'delivery board/check table (16)' in pt[13] and 'delivery board/check table (16)' in gt[8]
 assert 'next mission' not in pt[13]
 assert 'Delivery checked: YES' in pt[13] and 'record row 5: Delivery checked' in gt[11]
 assert 'ticks are optional' in pt[13]
 assert 'ACORN > NEST' in pt[6]
 assert '3 mm clearance' in gt[10]
 for i in range(5):assert 'Handover' in gt[4+i] and 'Accept only after checking' in gt[4+i]
print('Forest: unique five-stage postal chain, hidden clues, jobs, whole map, label, delivery and receipt verified in A4 and Letter.')
