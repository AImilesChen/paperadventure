"""Check final C11 bytes, role rotation, actual cut dimensions and staged answers."""
from pathlib import Path
import json,hashlib,zipfile
from pypdf import PdfReader
import pdfplumber
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
from workshop_edition_content import E,jobs
R=Path(__file__).resolve().parents[1]
norm=lambda t:''.join((t or '').split())

def main():
 glyphs=[TTFont('checkwks'+w,str(R/f'assets/fonts/PAWorkshopSans-{w}.ttf')).face.charToGlyph for w in ['Regular','Bold']]
 for n in range(2,7):
  for m in range(1,6):
   tasks=jobs(n,m);assert sorted('/'.join(tasks).split('/'))==sorted('RBTWCP')
   assert next(i for i,v in enumerate(tasks) if 'C' in v)!=next(i for i,v in enumerate(tasks) if 'W' in v)
 parts={p['id']:p for p in E['blueprint']};order=E['blueprintOrder']
 assert parts[order[0]]['part']=='start' and parts[order[-1]]['part']=='display'
 assert all(parts[a]['top']==parts[b]['bottom'] for a,b in zip(order,order[1:]))
 assert order!=sorted(order) and [p['id'] for p in E['blueprint']]!=order
 assert E['track']['widthMm']==2*E['track']['railMm']+E['track']['laneMm']
 assert E['track']['laneMm']-E['message']['widthMm']==8
 assert [(a['widthMm']<48,a['direction']=='forward') for a in E['samples']]==[(False,True),(True,False),(True,True)]
 rows=[];texts={}
 for locale,version in E['versions'].items():
  folder=R/f'output/pdf/workshop-classroom-{locale}-{version}';manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
  assert len(manifest['items'])==4
  for f in manifest['items']:
   p=R/f['path'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'] and len(b)==f['bytes']
   reader=PdfReader(p);assert len(reader.pages)==E['pages'][f['role']]
   ts=[norm(p.extract_text()) for p in reader.pages];texts[locale,f['paper'],f['role']]=ts
   for page in reader.pages:
    for font in page['/Resources']['/Font'].values():
     o=font.get_object()
     if '/FontDescriptor' in o:assert '/FontFile2' in o['/FontDescriptor'].get_object()
   with pdfplumber.open(p) as pdf:
    for pn,page in enumerate(pdf.pages,1):
     for ch in page.chars:
      assert ch['x0']>=35 and ch['x1']<=page.width-35 and ch['top']>=8 and ch['bottom']<=page.height-12,(locale,f['role'],pn,'bounds',ch['text'])
      assert all(ord(c) in glyphs[0] and ord(c) in glyphs[1] for c in ch['text']),(locale,'missing glyph',ch['text'])
    if f['role']=='player':
     for pn,w,h,count in [(5,78,170/3,3),(8,78,170,1),(8,40,45,1),(11,40,56,1),(13,56,56,1),(13,40,56,2)]:
      actual=[c for c in pdf.pages[pn-1].rects if abs(c['width']/mm-w)<.01 and abs(c['height']/mm-h)<.01]
      assert len(actual)==count,(locale,f['paper'],pn,w,h,len(actual))
     track=next(c for c in pdf.pages[7].rects if abs(c['width']/mm-78)<.01 and abs(c['height']/mm-170)<.01)
     fold=sorted(c['x0'] for c in pdf.pages[7].lines if c['width']<.01 and abs(c['height']-(170*mm-4))<.01)
     assert len(fold)==2 and abs((fold[1]-fold[0])/mm-48)<.01 and abs((fold[0]-track['x0'])/mm-15)<.01
   if f['role']=='player':
    # Only private note and later trial sheets carry the finished marks.
    for i in [0,1,2,3,4,5,6,7,8,10,11,13,14,15]:
     for secret in ['R,M,Q','R、M、Q','twostars','TWOSTARS','两颗星','大三角形']:
      assert secret not in ts[i],(locale,i+1,secret)
    notes=ts[9].lower();assert ('triangle' in notes and 'twostars' in notes) if locale=='en' else ('大三角形' in notes and '两颗星' in notes)
    assert ('after' in ts[10].lower()) if locale=='en' else ('分享完才发' in ts[10])
    assert ('TESTONLY' in ts[12]) if locale=='en' else ('仅供试验' in ts[12])
    assert ('before' in ts[13].lower()) if locale=='en' else ('预测' in ts[13])
   else:
    for i in [6,8,10,12,14,16]:
     for secret in ['R,M,Q','R、M、Q','triangle,twostars','三角形及两星','A太宽，B反向']:
      assert secret not in ts[i],(locale,i+1,secret)
    assert all(v in ts[1] for v in ['96','115','112','131','72','84','54','63'])
   rows.append({k:f[k] for k in ['locale','paper','role','pages','sha256']})
  for z in manifest['zips']:
   with zipfile.ZipFile(R/z['path']) as a:
    assert len(a.namelist())==2 and a.testzip() is None
    for name in a.namelist():assert a.read(name)==(folder/name).read_bytes()
 for locale in ['en','zh']:
  for role in ['player','guide']:
   canon=lambda ts:[t.replace('A4','PAPER').replace('Letter','PAPER') for t in ts]
   assert canon(texts[locale,'A4',role])==canon(texts[locale,'Letter',role])
 geo=json.loads((R/'tmp/pdfs/workshop/geometry.json').read_text(encoding='utf-8'))
 for locale in ['en','zh']:
  for paper in ['A4','Letter']:
   cuts=[g for g in geo if g['locale']==locale and g['paper']==paper and g['role']=='player' and g['kind']=='cut']
   assert len(cuts)==12 and {p:sum(g['page']==p for g in cuts) for p in [5,8,10,11,13]}=={5:3,8:2,10:3,11:1,13:3}
 result={'status':'passed','pdfs':rows,'pages':140,'paperTextParity':True,'dimensionsMm':{'track':[78,170],'railsAndLane':[15,48,15],'fitCard':[40,45],'ownCard':[40,56],'sampleWidths':[56,40,40]},'pieces':{'full':12,'low':9},'roles':[2,3,4,5,6],'sourceOrderAndSeams':True,'privateNotesAndLaterSamples':True,'physicalPrintTested':False,'childPlayTested':False}
 (R/'tmp/pdfs/workshop/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print('Workshop:8PDF/140pages, fonts/bounds/actual geometry/roles/staging/cuts/paper parity/ZIP bytes passed.')
if __name__=='__main__':main()
