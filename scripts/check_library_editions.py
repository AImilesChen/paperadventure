"""Check both revised C09 languages against logical, document and cut contracts."""
from pathlib import Path
import json,re,hashlib,itertools,zipfile
import pdfplumber
from pypdf import PdfReader
from reportlab.pdfbase.ttfonts import TTFont
from library_edition_content import E,assignments
R=Path(__file__).resolve().parents[1];norm=lambda s:re.sub(r'\s+','',s)

def main():
 shape=[x for x in E['shelves'] if x[1]==E['stamp']['shape']];dots=[x for x in E['shelves'] if x[2]==E['stamp']['dots']]
 assert len(shape)==3 and len(dots)==2 and {x[0] for x in shape}&{x[0] for x in dots}=={E['shelfAnswer']}
 assert [p for p in itertools.permutations('ABCD') if p.index('B')<p.index('D')<p.index('C')<p.index('A')]==[tuple(E['leafOrder'])]
 for n in range(2,7):
  for m in range(1,6):assert len(assignments(n,m))==n
 texts={};rows=[];cmap=[TTFont('libcheck'+w,str(R/f'assets/fonts/PALibrarySans-{w}.ttf')).face.charToGlyph for w in ['Regular','Bold']]
 for locale,version in E['versions'].items():
  out=R/f'output/pdf/library-classroom-{locale}-{version}';manifest=json.loads((out/'manifest.json').read_text(encoding='utf8'));assert len(manifest['items'])==4
  for f in manifest['items']:
   path=R/f['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==f['sha256'];assert path.stat().st_size==f['bytes'];reader=PdfReader(path);assert len(reader.pages)==E['pages'][f['role']]
   ts=[norm(p.extract_text()) for p in reader.pages];texts[locale,f['paper'],f['role']]=ts
   for page in reader.pages:
    for font in page['/Resources']['/Font'].values():
     o=font.get_object()
     if '/FontDescriptor' in o:assert '/FontFile2' in o['/FontDescriptor'].get_object()
   with pdfplumber.open(path) as pdf:
    for page in pdf.pages:
     for ch in page.chars:
      assert 24<=ch['x0']<ch['x1']<=page.width-24 and 10<=ch['top']<ch['bottom']<=page.height-10,(locale,f['role'],page.page_number,ch)
      assert all(ord(ch['text']) in m for m in cmap),ch['text']
    if f['role']=='player':
     assert E['innerTitles'][locale] not in ''.join(ts[:4]);assert E['shelfAnswer'] not in ''.join(ts[:3])
     for idx,count in [(6,2),(7,2),(9,3)]:assert len([x for x in pdf.pages[idx].curves+pdf.pages[idx].rects if x.get('dash') and x['dash'][0]])==count
     for idx in [0,1,2,3,4,5,8,10,11,12,13]:assert not any(x.get('dash') and x['dash'][0] for x in pdf.pages[idx].curves+pdf.pages[idx].rects)
     for phrase in (['copy','return','tomorrow','Rowan','Kit','pencil'] if locale=='en' else ['副本','归还','明天','罗文','小凯','纸笔']):assert phrase not in ts[8],('early private fact',locale,phrase)
     for phrase in (['routecopy','newdirections','keeperhaspaper'] if locale=='en' else ['抄写路线','副本','管理员有纸笔']):assert phrase not in ''.join(ts[:3]),('early plan clue',locale,phrase)
     assert 'B-D-C-A' not in ''.join(ts)
     assert all(label.replace(' ','') in ts[4] for label in E['route'][locale])
     assert 'tomorrow' in ts[9] if locale=='en' else '明天' in ts[9]
     assert len([x for x in pdf.pages[3].curves if x.get('fill') and abs(x['width']-5.2)<.1 and abs(x['height']-5.2)<.1])==10
    else:
     for idx in [6,8,10,12,14,16]:
      for answer in ['L-24','B-D-C-A','GardenTable→GardenGate','花园桌→花园门']:assert answer not in ts[idx],(locale,idx,answer)
     assert all(v in ts[1] for v in ['84','103','98','117','18','21','42','49'])
     assert 'nextmorning' in ts[18] if locale=='en' else '第二天早晨' in ts[18]
   rows.append({k:f[k] for k in ['locale','paper','role','pages','sha256']})
  for z in manifest['zips']:
   with zipfile.ZipFile(R/z['path']) as archive:
    assert len(archive.namelist())==2 and archive.testzip() is None
    for name in archive.namelist():assert archive.read(name)==(out/name).read_bytes()
 for locale in ['en','zh']:
  for role in ['player','guide']:
   clean=lambda v:[s.replace('A4','PAPER').replace('Letter','PAPER') for s in v]
   assert clean(texts[locale,'A4',role])==clean(texts[locale,'Letter',role]),(locale,role,'paper parity')
 result={'status':'passed','pdfs':rows,'stampCandidates':{'shape':3,'dots':2,'both':1},'uniqueNarrativeOrder':'BDCA','noEarlyWitnessFacts':True,'noEarlyTargetTitle':True,'wholeSheetPieces':3,'leafModePieces':7,'seatSizes':[2,3,4,5,6],'paperTextParity':True,'physicalPrintTested':False,'childPlayTested':False}
 (R/'tmp/pdfs/library/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'status':'passed','pdfs':8,'pages':132,'logicAndSpoilers':'passed','fontsBoundsCutsParityZIP':'passed'}))
if __name__=='__main__':main()
