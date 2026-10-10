"""Verify the unique causal solution and first-use delivery contract."""
import json
from pathlib import Path
from pypdf import PdfReader
from space_home_experience import JOBS, LOOKUP_ORDER, SYMBOLS
ROOT=Path(__file__).resolve().parents[1]
s=next(x for x in json.loads((ROOT/'content/theme-design/retail-games-v1.json').read_text()) if x['id']=='space' and x['setting']=='home')
signal=[r for r in s['stages'][0]['rows'] if r[1:4]==['Round','3','Square']]
assert len(signal)==1 and signal[0][4]=='ORION'
routes=[]
def walk(place,path):
 if place.startswith('STATION'):routes.append(path);return
 for r in s['stages'][1]['rows']:
  if r[1]==place and r not in path:walk(r[2],path+[r])
walk('ORION',[])
assert len(routes)==1 and ''.join(r[0] for r in routes[0])=='ABC' and routes[0][-1][2]=='STATION 7'
device=[r for r in s['stages'][2]['rows'] if r[1:4]==['7','2','Triangle']]
assert len(device)==1 and device[0][4]=='6'
dictionary=next(r for r in s['stages'][3]['rows'] if r[0]=='Code 6')
assert ''.join(dictionary[1:])=='COMET'
assert sorted(LOOKUP_ORDER)==list(range(5)) and LOOKUP_ORDER!=list(range(5))
lookup={SYMBOLS[k]:dictionary[k+1] for k in LOOKUP_ORDER}
assert ''.join(lookup[name] for name in SYMBOLS)=='COMET'
probe=[r for r in s['stages'][4]['rows'] if r[1:]==['ORION','7','6','COMET']]
assert len(probe)==1 and probe[0][0]=='A'
for paper in ['A4','Letter']:
 player=PdfReader(ROOT/f'output/pdf/space-home-player-1.0-{paper}.pdf')
 guide=PdfReader(ROOT/f'output/pdf/space-home-guide-1.0-{paper}.pdf')
 assert len(player.pages)==16 and len(guide.pages)==12
 assert 'TWO drawn rings' not in player.pages[7].extract_text()
 assert all(x in player.pages[14].extract_text() for x in ['TO PROBE','SECTOR','STATION','DEVICE CODE','DECODED MESSAGE','Evidence 1','Evidence 2'])
 assert all(x in ' '.join(guide.pages[2].extract_text().split()) for x in JOBS)
 assert 'deliberately out of message order' in player.pages[11].extract_text()
 assert 'all jobs stay fixed' in ' '.join(guide.pages[2].extract_text().split())
 assert '14 sheets/team' in ' '.join(guide.pages[1].extract_text().split())
 assert 'SET UP BEFORE THE CREW ARRIVES' in guide.pages[3].extract_text()
 assert 'Help fill and check the whole reply' in ' '.join(guide.pages[9].extract_text().split())
 assert '29 cut pieces' in guide.pages[1].extract_text()
 assert 'ADULT HOLDS UNTIL FINAL ACCEPTANCE' in player.pages[15].extract_text()
print('Space: unique five-stage solution, jobs, inventory, reply and confirmation verified in A4 and Letter.')
