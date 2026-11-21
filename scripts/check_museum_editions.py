from pathlib import Path
import json,re,hashlib,itertools,zipfile
from pypdf import PdfReader
import pdfplumber
from reportlab.pdfbase.ttfonts import TTFont
from museum_edition_content import E,assignments
R=Path(__file__).resolve().parents[1];norm=lambda s:re.sub(r'\s+','',s)
def main():
 target=E['targetMarks'];matching=lambda i:[r[0] for r in E['ledger'] if r[i+1]==target[i]]
 assert len(matching(0))==2 and len(matching(1))==2
 assert set(matching(0))&set(matching(1))=={E['accession']}
 arrangements=[p for p in itertools.permutations(E['caseCards']) if p[0]==2 and p[1]==7];assert arrangements==[tuple(E['caseOrder'])]
 assert E['chosenParts']==['crescent','double','dots'] and E['sourceIds']['A']==E['sourceIds']['C']==E['accession']!=E['sourceIds']['B']
 for n in range(2,7):
  for m in range(1,6):assert len(assignments(n,m))==n
  assert len([s for s in assignments(n,3) if re.search('[123]',s)])>=2
 geometry=json.loads((R/'tmp/pdfs/museum/geometry.json').read_text(encoding='utf-8'));rows=[];texts={}
 maps=[TTFont('check'+w,str(R/f'assets/fonts/PAMuseumSans-{w}.ttf')).face.charToGlyph for w in ['Regular','Bold']]
 for locale,version in E['versions'].items():
  out=R/f'output/pdf/museum-classroom-{locale}-{version}';manifest=json.loads((out/'manifest.json').read_text(encoding='utf-8'))
  for f in manifest['items']:
   path=R/f['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==f['sha256'];reader=PdfReader(path);assert len(reader.pages)==E['pages'][f['role']]
   ts=[norm(p.extract_text()) for p in reader.pages];texts[locale,f['paper'],f['role']]=ts
   with pdfplumber.open(path) as pdf:
    for page in pdf.pages:
     for ch in page.chars:
      assert 24<=ch['x0']<ch['x1']<=page.width-24 and 10<=ch['top']<ch['bottom']<=page.height-10
      assert all(ord(ch['text']) in cmap for cmap in maps),ch['text']
    for page in reader.pages:
     for font in page['/Resources']['/Font'].values():
      o=font.get_object()
      if '/FontDescriptor' in o:assert '/FontFile2' in o['/FontDescriptor'].get_object()
    if f['role']=='player':
     for index,count in [(5,3),(7,6),(8,3)]:assert len([x for x in pdf.pages[index].curves+pdf.pages[index].rects if x.get('dash') and x['dash'][0]])==count
     for index in [1,2,3,4,6,9,10,11,12]:assert not any(x.get('dash') and x['dash'][0] for x in pdf.pages[index].curves+pdf.pages[index].rects)
     assert all(word in ts[4] for word in (['Low-cut','page6'] if locale=='en' else ['少裁剪','第6页']))
     assert all(word in ts[6] for word in (['Low-cut','page8'] if locale=='en' else ['少裁剪','第8页']))
     assert all(word in ts[11] for word in (['Low-cut','completedpage7','mission4'] if locale=='en' else ['少裁剪','已完成的第7页','第四关']))
     assert ('differentobject' not in ts[9]) and '另一件' not in ts[9]
     assert all(v not in ts[7] for v in ['TOPA','DIALA','BASEA'])
     assert all(v not in ts[6] for v in ['Crescent','Double-ring','月牙','双环'])
     assert 'M-27' not in ts[10] and 'M-27' not in ts[11]
     dots=[x for x in pdf.pages[7].curves if x.get('fill') and abs(x['width']-4.8)<.05 and abs(x['height']-4.8)<.05];assert len(dots)==3
    else:
     assert all(v in ts[1] for v in ['91','110','84','21'])
     for index in [6,8,10,12,14,16]:
      for answer in ['M-27','Case4','4号柜','crescent/double','月牙、双环']:assert answer not in ts[index],(locale,index,answer)
     assert ('standard12' in ts[18] and 'low-cut3' in ts[18]) if locale=='en' else ('标准12件' in ts[18] and '少裁剪3件' in ts[18])
   rows.append({'locale':locale,'paper':f['paper'],'role':f['role'],'pages':f['pages'],'sha256':f['sha256']})
  for z in manifest['zips']:
   with zipfile.ZipFile(R/z['path']) as archive:
    assert len(archive.namelist())==2 and not archive.testzip()
    for name in archive.namelist():assert archive.read(name)==(out/name).read_bytes()
 for locale in ['en','zh']:
  for role in ['player','guide']:
   clean=lambda ts:[s.replace('A4','PAPER').replace('Letter','PAPER') for s in ts]
   assert clean(texts[locale,'A4',role])==clean(texts[locale,'Letter',role])
 for kind,card,slot in [('case',E['caseCardPt'],E['caseSlotPt']),('part',E['partCardPt'],E['partSlotPt'])]:assert min((slot[i]-card[i])/2 for i in [0,1])>=9
 result={'status':'passed','pdfs':rows,'eachAccessionMarkAloneLeaves':2,'jointAccessionCandidates':1,'uniqueGallery':True,'threeFilledDotsDrawn':True,'standardPieces':12,'lowCutPieces':3,'roleSizes':[2,3,4,5,6],'tileClearanceEachSidePt':9,'paperTextParity':True,'physicalPrintTested':False,'childPlayTested':False}
 (R/'tmp/pdfs/museum/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
