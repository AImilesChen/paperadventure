"""Verify the fixed postal chain and first-use delivery materials."""
import json
from pathlib import Path
from pypdf import PdfReader
from forest_home_experience import JOBS, STORIES, ACTIONS
from forest_story_layout import PAGE_MAP, STORY_PAGES, TASK_PAGES
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
 assert len(player.pages)==23 and len(guide.pages)==17
 pt=[' '.join(p.extract_text().split()) for p in player.pages]
 gt=[' '.join(p.extract_text().split()) for p in guide.pages]
 assert all(j in pt[1] for j in JOBS)
 assert 'TWO drawn leaf' not in pt[10] and 'ROUND outline' not in pt[10]
 assert 'KEEP WHOLE' in pt[15] and all(x in pt[15] for x in ['BLUE TREE','W2','W4','OWL HOUSE'])
 assert all(x in pt[16] for x in ['BATCH','DISTRICT','FRAGMENT','RECIPIENT'])
 assert 'DISPATCH CHECK' in pt[20] and 'PLACE THE REPAIRED LABEL HERE' in pt[20]
 assert 'ADULT HOLDS UNTIL DELIVERY ACCEPTED' in pt[22]
 assert '31' in gt[1] and '22 sheets' in gt[0]
 assert 'before giving the receipt' in gt[14]
 assert 'delivery board/check table (21)' in pt[18] and 'delivery board/check table (21)' in gt[13]
 assert 'Delivery checked: YES' in pt[18] and 'record row 5: Delivery checked' in gt[16]
 assert 'ticks are optional' in pt[18]
 assert 'ACORN > NEST' in pt[8]
 assert '3 mm clearance' in gt[15]
 for i in range(5):
  assert 'THE STORY SO FAR' in pt[STORY_PAGES[i]-1] and 'PAUSE AND TALK' in pt[STORY_PAGES[i]-1]
  assert f'page {TASK_PAGES[i]}' in pt[STORY_PAGES[i]-1]
  assert 'READ ONLY AFTER ACCEPTANCE' in gt[4+2*i]
  assert 'ACCEPT ONLY AFTER CHECKING' in gt[5+2*i]
  assert f'PAGE {PAGE_MAP[[5,7,9,12,18][i]]}' in pt[PAGE_MAP[[5,7,9,12,18][i]]-1]
print('Forest: unique five-stage postal chain, hidden clues, jobs, whole map, label, delivery and receipt verified in A4 and Letter.')
