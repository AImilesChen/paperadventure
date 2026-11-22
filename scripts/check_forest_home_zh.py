"""Printed Chinese content/logic, glyph coverage and counterpart byte verification."""
from pathlib import Path
import json,hashlib,zipfile,re
import pdfplumber
from fontTools.ttLib import TTFont
R=Path(__file__).resolve().parents[1];M=json.loads((R/'output/pdf/forest-home-zh-1.0-zh.1/manifest.json').read_text(encoding='utf-8'));texts={};rows=[]
cmap=TTFont(str(R/'assets/fonts/PAForestSans-Regular.ttf')).getBestCmap();chars=set()
for f in M['items']:
 p=R/f['path'];b=p.read_bytes();assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256']
 with pdfplumber.open(p) as d:
  assert len(d.pages)==f['pages']==(18 if f['role']=='player' else 17)
  pages=[' '.join((v.extract_text() or '').split()) for v in d.pages];texts[f['paper'],f['role']]=pages
  for i,v in enumerate(d.pages):
   assert len(v.chars)>90
   for c in v.chars:
    chars.add(c['text']);assert 25<=c['x0'] and c['x1']<=v.width-25 and 15<=c['top'] and c['bottom']<v.height-10,(p,i+1,c)
 if f['role']=='player':
  assert all('第'+str(i)+'关／' in pages[n-1] for i,n in enumerate([5,8,11,13,16],1))
  assert all(x in pages[6] for x in ['A／信','蓝树 3号／上午','B／P17包裹','优先件','C／信','池塘 6号／上午','D／信','池塘 7号／下午','E／包裹','F／信'])
  assert all(x in pages[8] for x in ['P17／片区线索','P17／门牌线索','P17／标记线索','P18／片区线索','再加1'])
  assert '片区名以“树”字结尾' in pages[9] and '门牌是双数' in pages[9] and '等询问后再填' in pages[9]
  assert '蓝树片区、上午' in pages[11] and '第1格／优先件' in pages[11] and '第2格／普通件' in pages[11]
  assert all(x in pages[13] for x in ['两人','三人','四至六人','三户都住蓝树院落4号','不能只凭门牌'])
  assert all(x in pages[14] for x in ['猫头鹰家','种类：包裹','编号：P17','封口标记：橡果','狐狸家','编号：L06','封口标记：月亮','河狸家','编号：P18','封口标记：松树'])
  assert all('橡果' not in t and '橡子' not in t for i,t in enumerate(pages) if i!=14)
  assert '诺莉来到蓝树' not in ' '.join(pages) and '猫头鹰家' not in pages[17]
  assert '阳光公园' in pages[3] and '9号' in pages[3] and '不是正式谜题答案' in pages[3]
  assert '只写在新标签' in pages[7] and '不在进度表再抄一次' in pages[10]
  assert '展示原件，不再抄一遍' in pages[16]
 else:
  assert '诺莉来到蓝树院落4号的猫头鹰家' in pages[15]
  assert all('全部核对后才通过' in pages[n-1] for n in [6,8,10,12,14])
  assert '私用第12页' in pages[3] and '先擦旧记号' in pages[16]
  assert '猫头鹰家等包裹P17、橡果' in pages[11]
 for t in pages:
  assert not re.search(r'\b(?:READY|REPAIR|HOLD|ACORN|OWL|HOUSE|LETTER|PARCEL|DISTRICT|RECIPIENT|Courier|Host|Player)\b',t),t
 rows.append({'paper':f['paper'],'role':f['role'],'pages':f['pages'],'sha256':f['sha256']})
for role in ['player','guide']:
 clean=lambda t:re.sub(r'\s+','',t.replace('／A4','／纸型').replace('／Letter','／纸型'))
 assert [clean(t) for t in texts['A4',role]]==[clean(t) for t in texts['Letter',role]]
assert all(ord(c) in cmap for t in chars for c in t if not c.isspace()),'font coverage'
for z in M['zips']:
 with zipfile.ZipFile(R/z['path']) as a:
  assert len(a.namelist())==2 and a.testzip() is None
  for f in M['items']:
   if f['paper']==z['paper']:assert hashlib.sha256(a.read(Path(f['path']).name)).hexdigest()==f['sha256']
# The reviewed English repair is an immutable input to this task.
reviewed_english_sha256={'output/pdf/forest-home-en-1.1/forest-home-player-en-A4.pdf': 'c5361237d1f31f180c2f3acc500a89d6d9e9c11895441094d3d2ff4e98c00782', 'output/pdf/forest-home-en-1.1/forest-home-guide-en-A4.pdf': 'a69c913878fc2484d624b09fe2489d225245189e645d46ce04a12540fd4659cc', 'output/pdf/forest-home-en-1.1/forest-home-player-en-Letter.pdf': '03220859f613d2b039b7f7af2a42be87807b285552688fbc4cef7e34cf9e8ad9', 'output/pdf/forest-home-en-1.1/forest-home-guide-en-Letter.pdf': '17ae5be33b3704249a2954b3ae46c0cf6f7d38f2af8b34bf8c7cd62e4ec5c8ba', 'output/pdf/forest-home-en-1.1/forest-home-complete-en-A4.zip': '72ebbe4790c75eea1026bd6905f7684b4ff5d5305101ec7030dd0a807e1ce5fd', 'output/pdf/forest-home-en-1.1/forest-home-complete-en-Letter.zip': '18164875c345d60dc18e827cdd20583fe73665c34227fee707de7a83c10b3063'}
for path,digest in reviewed_english_sha256.items():assert hashlib.sha256((R/path).read_bytes()).hexdigest()==digest
geo=json.loads((R/'tmp/pdfs/forest-home-zh/geometry.json').read_text(encoding='utf-8'))
for paper in ['A4','Letter']:
 g=[v for v in geo if v['paper']==paper and v['role']=='player'];cuts=[v for v in g if v['kind']=='cut'];assert len(cuts)==19
 mail=[v for v in cuts if v.get('prop')=='mail'];slots=[v for v in g if v['kind']=='bag-slot'];assert len(mail)==6 and len(slots)==2
 assert all(s['width']-m['width']>=4.99 and s['height']>m['height'] for s in slots for m in mail)
 actors=[v for v in cuts if v.get('prop')=='resident'];assert len(actors)==3
 stamp=next(v for v in cuts if v.get('prop')=='stamp');target=next(v for v in g if v['kind']=='delivery-row' and v['row']==4);assert stamp['width']<target['width'] and stamp['height']<target['height']
q=R/'tmp/pdfs/forest-home-zh';(q/'checks.json').write_text(json.dumps({'status':'passed','pages':70,'pdfs':rows,'glyphCoverage':True,'cuts':19,'originalEnglishBytesPreserved':True,'physicalOrChildTest':False},indent=2),encoding='utf-8')
print('Chinese 70 pages: printed clues, privacy, stage references, font coverage, card-slot geometry, paper parity and ZIPs passed; reviewed English bytes unchanged.')
