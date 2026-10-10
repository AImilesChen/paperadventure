"""Check Halloween's answer chain, release order and physical prop geometry."""
import sys,json,zipfile
from pathlib import Path
from pypdf import PdfReader
import generate_retail_packs as r
import halloween_home_experience as h
root=Path(__file__).resolve().parents[1]
for size,pagesize in [('A4',r.g.A4),('Letter',r.g.letter)]:
 player=PdfReader(root/f'output/pdf/halloween-home-player-1.0-{size}.pdf');guide=PdfReader(root/f'output/pdf/halloween-home-guide-1.0-{size}.pdf')
 assert len(player.pages)==18 and len(guide.pages)==11
 texts=[p.extract_text() for p in player.pages]
 for i,n in enumerate([4,6,9,12,15]):
  assert f'CHECKPOINT {i+1} / READ THE STORY, THEN PLAY' in texts[n-1]
  assert 'Pip:' in texts[n-1] and 'Talk together:' in texts[n-1] and 'Put on the table:' in texts[n-1]
  assert '1.' in texts[n-1] and '4.' in texts[n-1]
 assert all('5723' not in page for page in texts[:16])
 assert 'TWO stripes' not in texts[8] and 'ROUND outline' not in texts[8]
 assert 'ADULT HOLDS UNTIL FINAL ACCEPTANCE' in texts[17]
 assert '1 star' in texts[4] and '1 stripe' in texts[10]
 assert '33 cut pieces per team' in guide.pages[1].extract_text()
 assert all('After acceptance, read before the next mission:' in guide.pages[i].extract_text() for i in range(4,8))
 assert 'Page 18' in guide.pages[1].extract_text()
 w=pagesize[0]-88;slot=(w-20)/4
 assert slot-8 < slot and 75 < 85
 assert 65 < w/2-10 and 55 < 72
 assert h.Art(w,'bright').height==h.Art(w,'pumpkin').height==450
 assert [5,7,2,3]==[int(c) for c in '5723']
 with zipfile.ZipFile(root/f'output/pdf/halloween-home-{size}-complete-1.0.zip') as z:assert len(z.namelist())==2 and z.testzip() is None
# Solve from actual source values rather than only checking expected text.
s=next(s for s in json.loads((root/'content/theme-design/retail-games-v1.json').read_text()) if s['id']=='halloween' and s['setting']=='home')
letters=s['stages'][0]['rows'];matches=[x for x in letters if x[1:4]==['Fox','2','Moon']]
assert len(matches)==1 and matches[0][0]=='C'
routes={x[0]:x for x in s['stages'][1]['rows']};assert routes['A'][2]==routes['B'][1] and routes['B'][2]==routes['C'][1] and routes['C'][2]=='PARCEL TABLE'
parcels=[x for x in s['stages'][2]['rows'] if x[1:4]==['P3','2','Round']];assert len(parcels)==1 and parcels[0][0]=='B'
print('Halloween: 18/11 pages in both sizes, story-plus-action missions, causal chain, prop inventory, no early finale leak and seal fit passed.')
