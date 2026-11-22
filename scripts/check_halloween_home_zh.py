"""Check exported Chinese wording, unique clues, privacy and physical geometry."""
from pathlib import Path
from collections import Counter
import json,hashlib,zipfile,re,itertools
import pdfplumber
from pypdf import PdfReader
from fontTools.ttLib import TTFont
R=Path(__file__).resolve().parents[1];Q=R/'tmp/pdfs/halloween-home-zh'
M=json.loads((R/'output/pdf/halloween-home-zh-1.0-zh.1/manifest.json').read_text(encoding='utf-8'))
G=json.loads((Q/'geometry.json').read_text(encoding='utf-8'));texts={};actor_sizes={}
font=TTFont(R/'assets/fonts/PAHalloweenSans-Regular.ttf');cmap=font.getBestCmap()
for f in M['items']:
 raw=(R/f['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==f['sha256'] and len(raw)==f['bytes']
 with pdfplumber.open(R/f['path']) as d:
  assert len(d.pages)==f['pages']==(17 if f['role']=='player' else 19)
  pages=[re.sub(r'\s+','',''.join(p.extract_text() or '')) for p in d.pages];texts[f['paper'],f['role']]=pages
  for n,p in enumerate(d.pages):
   assert len(p.chars)>65
   for c in p.chars:
    assert 35<=c['x0'] and c['x1']<=p.width-35 and 14<=c['top'] and c['bottom']<p.height-14,(f['path'],n+1,c)
    assert all(ord(x) in cmap for x in c['text'] if not x.isspace()),(f['path'],n+1,c['text'])
   latin=re.findall(r'[A-Za-z]{3,}',pages[n]);assert all(w in ['PAPERADVENTURE','Letter','USLetter'] for w in latin),(f['path'],n+1,latin)
  if f['role']=='player':
   assert all(f'第{i}关／故事与操作' in pages[n-1] for i,n in enumerate([6,8,10,13,16],1))
   assert not any(x in ''.join(pages[:7]) for x in ['蝙蝠','猫头鹰','星星'])
   assert '完整图形' in pages[4] and '两层' in pages[4]
   assert '与海报缺口大小相同' in pages[6]
   assert all(x in pages[1] for x in ['2人各2张','2／1／1','4人各1张','5至6人'])
   assert '不要求再抄一遍答案' in pages[2] and pages[2].count('成人核准')==5
   matches=re.findall(r'(猫头鹰|蝙蝠|南瓜|星星)在(猫头鹰|蝙蝠|南瓜|星星)的正(上|右|下|左)方',pages[10]);assert len(matches)==4,matches
   solutions=[]
   for perm in itertools.permutations(['猫头鹰','蝙蝠','南瓜','星星']):
    pos=dict(zip(perm,[(0,0),(1,0),(0,1),(1,1)]))
    if all((pos[a][0]-pos[b][0],pos[a][1]-pos[b][1])=={'上':(0,-1),'右':(1,0),'下':(0,1),'左':(-1,0)}[v] for a,b,v in matches):solutions.append(perm)
   assert solutions==[('猫头鹰','蝙蝠','南瓜','星星')],solutions
   assert all(x in pages[11] for x in ['顶端','左上','右下'])
   vertical=PdfReader(R/f['path']).pages[13].extract_text();assert '折叠线·不要剪' in vertical and '只剪三边' in vertical
   assert all(x not in ''.join(pages) for x in ['皮普的纸上南瓜灯亮了','猫头鹰守望','核准后才朗读'])
   assert not any(x in pages[14] for x in ['蝙蝠','猫头鹰','南瓜','星星','窗1','窗2','窗3','窗4'])
   assert all(x in pages[15] for x in ['四个演员都在谢幕区','移开整张翻窗纸','第17页'])
   assert not any(x in pages[16] for x in ['蝙蝠','猫头鹰','星星']) and '核准' in pages[16]
   # Use actual printed filled outlines; card rectangles alone are insufficient.
   p=d.pages[8];g=next(x for x in G if x['paper']==f['paper'] and x['kind']=='puppets')
   shapes=[x for x in p.curves+p.rects if x.get('fill') and isinstance(x.get('non_stroking_color'),(tuple,list)) and max(x['non_stroking_color'])<.6]
   sizes=[]
   for row in range(2):
    for col in range(2):
     x0=g['x']+col*g['width']/2;y0=g['y']+(1-row)*g['height']/2
     group=[x for x in shapes if x0<(x['x0']+x['x1'])/2<x0+g['width']/2 and y0<(x['y0']+x['y1'])/2<y0+g['height']/2];assert group
     sizes.append([max(x['x1'] for x in group)-min(x['x0'] for x in group),max(x['y1'] for x in group)-min(x['y0'] for x in group)])
   actor_sizes[f['paper']]=sizes
  else:
   assert all(x in pages[0] for x in ['17页','19页','每组也必须打印一张','18张','36张','54张'])
   assert '＝17件' in pages[2] and '则13件' in pages[2]
   a=re.findall(r'等待回应：(猫头鹰|蝙蝠|南瓜|星星)／(?:右上|左上|左下|右下)／窗(\d)',pages[13]);assert a==[('蝙蝠','2'),('猫头鹰','1'),('南瓜','3'),('星星','4')],a
   b=re.findall(r'等待回应：(猫头鹰|蝙蝠|南瓜|星星)／窗(\d)',pages[16]);assert b==[('猫头鹰','1'),('南瓜','3'),('蝙蝠','2'),('星星','4')],b
   assert all(x in pages[16] for x in ['撤下玩家第12页','换成指南第18页','移开整张翻窗纸','核准后才朗读'])
   assert all(x in pages[17] for x in ['每组一张','猫头鹰守望','蝙蝠飞翔','南瓜欢迎','星星闪亮','谢幕后'])
for paper in ['A4','Letter']:
 board=[next(x for x in G if x['paper']==paper and x['kind']==k) for k in ['stage','facade','finale']]
 assert [x['page'] for x in board]==[12,14,18]
 assert all(abs(x['x']-board[0]['x'])<.01 and abs(x['y']-board[0]['y'])<.01 and x['centres']==board[0]['centres'] for x in board)
 assert all(w+8<board[1]['openingSize'][0] and h+8<board[1]['openingSize'][1] for w,h in actor_sizes[paper])
for role in ['player','guide']:
 norm=lambda t:Counter(t.replace('／A4','／PAPER').replace('／Letter','／PAPER'))
 assert [norm(x) for x in texts['A4',role]]==[norm(x) for x in texts['Letter',role]]
for z in M['zips']:
 assert hashlib.sha256((R/z['path']).read_bytes()).hexdigest()==z['sha256']
 with zipfile.ZipFile(R/z['path']) as a:
  assert len(a.namelist())==2 and a.testzip() is None
  for f in M['items']:
   if f['paper']==z['paper']:assert hashlib.sha256(a.read(Path(f['path']).name)).hexdigest()==f['sha256']
frozen=json.loads((R/'docs/halloween-home-zh-development-plan.json').read_text(encoding='utf-8'))['frozenEnglishManifest']
for f in frozen['items']+frozen['zips']:assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256']
assert json.loads((Q/'untranslated.json').read_text())==[]
result=dict(status='passed',pages=72,uniquePrintedSolution=solutions[0],actualActorSizes=actor_sizes,alignedThreeLayers=True,privateLanternHost18Only=True,privateEndingHost17Only=True,distinctScripts=True,fontCoverage=True,safeBounds=True,paperContentParity=True,zipPairs=2,frozenEnglishVerified=True,physicalOrChildTrial=False)
(Q/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(Q/'texts.json').write_text(json.dumps({p+'-'+r:t for (p,r),t in texts.items()},ensure_ascii=False,indent=2),encoding='utf-8')
print('72 Chinese pages: printed clues, privacy, script orders, glyphs, bounds, paper parity, actor fit, three-layer alignment and ZIPs passed; English unchanged.')
