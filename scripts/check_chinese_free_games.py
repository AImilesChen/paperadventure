"""Checks the generated PDFs, not just the local wording source.

Logical/geometry checks are not a substitute for a real print and child play test.
"""
import hashlib
import itertools
import json
import re
import zipfile
from pathlib import Path
from pypdf import PdfReader
from reportlab.pdfbase.ttfonts import TTFont
from free_game_zh_content import home_player,home_guide
from classroom_zh_v2 import classroom_player,classroom_guide,EDITION

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/zh-free-games'

def main():
 contract=json.loads((ROOT/'content/free-games/zh-game-contract.json').read_text(encoding='utf-8'))
 manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'));h=contract['home'];g=contract['classroom']
 letters=[row for row in h['letters'] if row[1:4]==['狐狸',2,3]]
 assert len(letters)==1 and letters[0][0]==h['answer']['letter']
 routes=[]
 def walk(place,used,path):
  if place=='红旗':routes.append(path);return
  for name,a,b in h['route']:
   if a==place and name not in used:walk(b,used|{name},path+[name])
 walk(letters[0][4],set(),[])
 assert routes==[h['answer']['route']]
 labels=[row for row in h['labels'] if row[1:4]==['红色',2,4]]
 assert len(labels)==1 and labels[0][0]==h['answer']['label']
 row=next(r for r in h['codeRows'] if r[0]==labels[0][4]);message=''.join(row[1:])
 assert message==h['answer']['message'] and len(message)==5 and message.startswith('送到')
 place=message[2:];parcels=[r for r in h['parcels'] if r[1:]==['红色',4,place]]
 assert len(parcels)==1 and parcels[0][0]==h['answer']['parcel']
 assert len({''.join(row[1:]) for row in h['codeRows']})==4
 orders=[list(p) for p in itertools.permutations(g['supplies']) if p[0]=='地图' and abs(p.index('地图')-p.index('徽章'))==1 and abs(p.index('铅笔')-p.index('徽章'))==1]
 assert orders==[g['answer']['order']]
 arrangements=[]
 for p in itertools.permutations(g['invitation']):
  good=True
  for a,b,e1,e2 in [(0,1,'right','left'),(2,3,'right','left'),(0,2,'bottom','top'),(1,3,'bottom','top')]:
   if not p[a]['edges'].get(e1) or p[a]['edges'].get(e1)!=p[b]['edges'].get(e2):good=False
  if good:arrangements.append([x['id'] for x in p])
 assert arrangements==[['A','B','C','D']],arrangements
 # Six 52pt squares can fit inside the 100pt badge, with no overlap.
 centres=[(-28,58),(28,58),(-68,0),(0,0),(68,0),(0,-68)]
 for x,y in centres:
  assert all((x+dx)**2+(y+dy)**2<=100**2 for dx in [-26,26] for dy in [-26,26])
 for (x,y),(a,b) in itertools.combinations(centres,2):assert abs(x-a)>=52 or abs(y-b)>=52
 assert h['cutPiecesPerTeam']==4+3+5+3+2+4
 assert g['cutPiecesPerGroup']==4+3+4+9 and g['lowCutPiecesPerGroup']==4+4
 assert len(manifest['items'])==8 and len(manifest['zips'])==4
 keys={(x['setting'],x['paper'],x['role']) for x in manifest['items']}
 assert keys==set(itertools.product(['home','classroom'],['A4','Letter'],['player','guide']))
 extracted={}
 fontmaps={setting:[TTFont(setting+str(i),str(ROOT/'assets/fonts'/f'{prefix}-{weight}.ttf')).face.charToGlyph for i,weight in enumerate(['Regular','Bold'])] for setting,prefix in [('home','PAFreeGameSans'),('classroom','PAClassroomSans')]}
 for item in manifest['items']:
  data=(ROOT/item['path']).read_bytes();assert data.startswith(b'%PDF-')
  assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
  reader=PdfReader(ROOT/item['path']);assert len(reader.pages)==contract[item['setting']]['pages'][item['role']]
  texts=[]
  for index,page in enumerate(reader.pages,1):
   width,height=map(float,[page.mediabox.width,page.mediabox.height])
   assert abs(width-(595.2756 if item['paper']=='A4' else 612))<.02
   assert abs(height-(841.8898 if item['paper']=='A4' else 792))<.02
   t=page.extract_text();texts.append(t)
   assert f'第{index}页／共{len(reader.pages)}页' in t
   assert '\ufffd' not in t and '\u25a0' not in t
   missing={ch for ch in t if not ch.isspace() and any(ord(ch) not in cmap for cmap in fontmaps[item['setting']])}
   assert not missing,(item['setting'],index,missing)
   for font in page['/Resources']['/Font'].get_object().values():
    font=font.get_object()
    if font['/Subtype']=='/TrueType':assert '/FontFile2' in font['/FontDescriptor'].get_object()
  extracted[(item['setting'],item['paper'],item['role'])]=texts
  if item['setting']=='home' and item['role']=='player':
   assert not any('送到小圆桌' in text for text in texts),'Do not print the decoded answer in player instructions'
   assert all(phrase in texts[7] for phrase in ['密码卡一','密码卡二','狐狸','铃铛','风筝','树叶'])
  if item['setting']=='classroom' and item['role']=='player':
   pages=EDITION['playerPages']
   assert '徽章中央放一个指南针' in texts[pages['clueCards']-1]
   assert not any('指南针' in texts[pages[key]-1] for key in ['blueprint','badge','review','return']),'Task/blueprint/badge/review sheets must not supply the hidden clue answers'
  if item['setting']=='home' and item['role']=='guide':assert '送到小圆桌' in texts[7] and '送到小圆桌' in texts[11]
 for setting in ['home','classroom']:
  for role in ['player','guide']:
   # Paper dimensions may change line wrapping, never puzzle facts or instructions.
   normal=lambda ts:re.sub(r'\s+|US Letter|A4','', ''.join(ts))
   assert normal(extracted[(setting,'A4',role)])==normal(extracted[(setting,'Letter',role)])
 for z in manifest['zips']:
  with zipfile.ZipFile(ROOT/z['path']) as archive:
   matching=[i for i in manifest['items'] if i['setting']==z['setting'] and i['paper']==z['paper']]
   assert sorted(archive.namelist())==sorted(Path(i['path']).name for i in matching)
   for i in matching:assert archive.read(Path(i['path']).name)==(ROOT/i['path']).read_bytes()
 report={'status':'passed','pdfs':8,'pages':sum(i['pages'] for i in manifest['items']),'zipPairs':4,'logic':'unique home chain and classroom invitation/order verified','fontCoverage':'passed','embeddedFonts':'passed','paperParity':'passed','physicalPrintTested':False,'childPlayTested':False}
 path=ROOT/'tmp/pdfs/zh-free-games/checks.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
