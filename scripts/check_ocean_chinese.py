"""Check real Chinese PDFs, clue logic, cut tolerances, role coverage and spoilers."""
from pathlib import Path
import json,itertools,hashlib,re,zipfile
from pypdf import PdfReader
import pdfplumber
from reportlab.pdfbase.ttfonts import TTFont
from ocean_zh_content import EDITION,assignments
R=Path(__file__).resolve().parents[1];O=R/'output/pdf/ocean-classroom-zh-1.0-zh.2'
def norm(s):return re.sub(r'\s+','',s).replace('Letter','PAPER').replace('A4','PAPER')
def main():
 tiles={name:edges for name,_,edges in EDITION['tiles']};valid=[]
 for p in itertools.permutations(tiles):
  if p[0]!='海藻湾':continue
  if all(tiles[p[a]].get(e) and tiles[p[a]].get(e)==tiles[p[b]].get(f) for a,e,b,f in [(0,'right',1,'left'),(0,'bottom',2,'top'),(1,'bottom',3,'top'),(2,'right',3,'left')]):valid.append(list(p))
 assert valid==[EDITION['solution']['chart']]
 for n in range(2,7):
  for m in range(1,6):assert len(assignments(n,m))==n
  holders=assignments(n,3);assert len([s for s in holders if '持' in s])>=2
  assert sum('A' in s for s in holders)==1 and sum('B' in s for s in holders)==1 and sum('C' in s for s in holders)==1
 m=json.loads((O/'manifest.json').read_text(encoding='utf-8'));texts={};checked=[]
 fontmaps=[TTFont('check'+w,str(R/f'assets/fonts/PAOceanSans-{w}.ttf')).face.charToGlyph for w in ['Regular','Bold']]
 for item in m['items']:
  path=R/item['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']
  reader=PdfReader(path);assert len(reader.pages)==EDITION['pages'][item['role']]
  ts=[norm(p.extract_text()) for p in reader.pages];texts[item['paper'],item['role']]=ts
  assert all(f'第{i}页／共{len(ts)}页' in t for i,t in enumerate(ts,1))
  with pdfplumber.open(path) as pdf:
   for p in pdf.pages:
    for ch in p.chars:
     assert 24<=ch['x0']<ch['x1']<=p.width-24 and 10<=ch['top']<ch['bottom']<=p.height-10
     assert all(ord(ch['text']) in cmap for cmap in fontmaps),ch['text']
   for p in reader.pages:
    for font in p['/Resources']['/Font'].values():
     obj=font.get_object()
     if '/FontDescriptor' in obj:assert '/FontFile2' in obj['/FontDescriptor'].get_object()
   if item['role']=='player':
    # Real first-stage handout: intact pages 1–3/5 and four cropped pieces.
    # Rules printed outside the cut pieces must not be required for play.
    retained=[]
    for g in [g for g in json.loads((R/'tmp/pdfs/ocean-zh/geometry.json').read_text(encoding='utf-8')) if g['paper']==item['paper'] and g['kind']=='ocean-tile']:
     x,y,w,h=[g[k] for k in ['x','y','width','height']];p=pdf.pages[3]
     retained.append(norm(p.crop((x,p.height-y-h,x+w,p.height-y)).extract_text() or ''))
    handout=''.join(ts[:3]+[ts[4]]+retained)
    assert all(rule in handout for rule in ['文字也保持正向','相邻边的同形标记配对','外边缘不必配对','北'])
    assert '按第4页规则' not in ts[4]
    assert '由教师' in ts[1] and '学生不用翻阅教师指南' in ts[1]
    # A no-frame group receives page 6 without the discarded prop page 7.
    assert all(rule in ts[5] for rule in ['免框玩法不领框','手指指出','铅笔沿该格边轻画框','实体框或铅笔框'])
    assert '实体框或铅笔框' in ts[8]
    assert 'B2' not in ''.join(ts[:9]);assert '不重复抄答案' in ts[2]
    assert 'C列、第3行' in ts[4] and '调查格是B2' in ts[9]
    assert '不要预先假设有几处错误' in ts[9] and '需要修正' in ts[9]
    for i in [3,4,5,6,8,10]:assert '左侧3条鱼' not in ts[i]
    cuts=[]
    for index,count in [(3,4),(6,2),(7,3)]:
     p=pdf.pages[index];shapes=[x for x in p.curves+p.rects if x.get('dash') and x['dash'][0]];assert len(shapes)==count,(index,len(shapes));cuts.append(count)
    assert sum(cuts)-1==8 # frame inner window is waste, not a ninth loose piece
    for i in [1,2,4,5,8,9,10]:assert not any(x.get('dash') and x['dash'][0] for x in pdf.pages[i].curves+pdf.pages[i].rects)
    tilecuts=[x for x in pdf.pages[3].curves if x.get('dash') and x['dash'][0]]
    slots=[x for x in pdf.pages[4].curves if abs(x['width']-240)<.05 and abs(x['height']-160)<.05];assert len(slots)==4
    assert all(abs(x['width']-228)<.05 and abs(x['height']-148)<.05 for x in tilecuts)
   else:
    assert '共7件' in ts[1] and '七组49件' in ts[1]
    assert '免框不发框' in ts[2]
    for i in [8,9,16]:assert '免框' in ts[i] or '铅笔框' in ts[i]
    assert '标准8件，免框7件' in ts[17]
    assert '文档和逻辑检查不等于' not in ''.join(ts)
    for i in [6,8,10,12,14,16]:
     for spoiler in ['B2','3个鱼标记','左侧3条鱼','A保留；B']:assert spoiler not in ts[i],(i,spoiler)
    assert '第三级为强提示' in ts[11]
    fish=[x for x in pdf.pages[11].curves if abs(x['width']-9.45)<.05 and abs(x['height']-6.3)<.05];assert len(fish)==3
    assert all(x in ts[1] for x in ['77张','96张','8件','56件'])
  checked.append({'paper':item['paper'],'role':item['role'],'pages':item['pages'],'sha256':item['sha256']})
 for role in ['player','guide']:assert texts['A4',role]==texts['Letter',role]
 for z in m['zips']:
  with zipfile.ZipFile(R/z['path']) as archive:
   assert len(archive.namelist())==2 and not archive.testzip()
   for name in archive.namelist():
    item=next(x for x in m['items'] if Path(x['path']).name==name);assert hashlib.sha256(archive.read(name)).hexdigest()==item['sha256']
 geo=json.loads((R/'tmp/pdfs/ocean-zh/geometry.json').read_text(encoding='utf-8'))
 for g in [x for x in geo if x['kind']=='ocean-edge-mark']:
  x,y,w,h=g['tile'];assert g['x']-x>=6 and g['y']-y>=6 and x+w-g['x']-g['width']>=6 and y+h-g['y']-g['height']>=6
 result={'status':'passed','pdfs':checked,'uniqueChart':valid[0],'roleSizes':[2,3,4,5,6],'loosePieces':8,'tileSlotClearanceEachSidePt':6,'answerFishActuallyDrawn':3,'paperTextParity':True,'physicalPrintTested':False,'childPlayTested':False}
 (R/'tmp/pdfs/ocean-zh/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
