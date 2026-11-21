"""Check actual C10 PDF bytes, evidence separation, tool scales and role allocations."""
from pathlib import Path
import hashlib,itertools,json,zipfile
import pdfplumber
from pypdf import PdfReader
from reportlab.pdfbase.ttfonts import TTFont
from weather_edition_content import E,jobs
R=Path(__file__).resolve().parents[1]
norm=lambda s:''.join((s or '').split())
def main():
 for n in range(2,7):
  for m in range(1,6):
   tasks=jobs(n,m);assert sorted('/'.join(tasks).split('/'))==sorted('RODWCP')
   assert next(i for i,v in enumerate(tasks) if 'C' in v)!=next(i for i,v in enumerate(tasks) if 'W' in v)
 selected=sorted([r for r in E['records'] if r['bars']==2],key=lambda r:int(r['time'].split(':')[0]));assert [r['id'] for r in selected]==[4,3,1]
 angles=[(r['pointer']+90-r['north'])%360 for r in E['wind']];assert angles==[180,180,90]
 assert (E['windPractice']['pointer']+90-E['windPractice']['north'])%360==0
 assert E['rainPractice'] not in E['rainAnswers'] and E['windPractice']['answer'] not in E['windAnswers']
 glyphs=[TTFont('checkweather'+w,str(R/f'assets/fonts/PAWeatherSans-{w}.ttf')).face.charToGlyph for w in ['Regular','Bold']]
 texts={};rows=[]
 for locale,version in E['versions'].items():
  folder=R/f'output/pdf/weather-classroom-{locale}-{version}';manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));assert len(manifest['items'])==4
  for f in manifest['items']:
   p=R/f['path'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'];assert len(b)==f['bytes'];reader=PdfReader(p);assert len(reader.pages)==E['pages'][f['role']]
   ts=[norm(page.extract_text()) for page in reader.pages];texts[locale,f['paper'],f['role']]=ts
   for page in reader.pages:
    for font in page['/Resources']['/Font'].values():
     o=font.get_object()
     if '/FontDescriptor' in o:assert '/FontFile2' in o['/FontDescriptor'].get_object()
   with pdfplumber.open(p) as pdf:
    for page in pdf.pages:
     for ch in page.chars:
      assert 24<=ch['x0']<ch['x1']<=page.width-24 and 10<=ch['top']<ch['bottom']<=page.height-10,(locale,f['role'],page.page_number,ch)
      assert all(ord(c) in gm for c in ch['text'] for gm in glyphs),ch['text']
    if f['role']=='player':
     for i,page in enumerate(pdf.pages):
      ds=[x for x in page.curves+page.rects if x.get('dash') and x['dash'][0]]
      assert len(ds)=={4:5,7:3,9:3,12:3}.get(i,0),(locale,f['paper'],i+1,len(ds))
     for s in ['4,3,1','W,W,N','西、西、北','1→3']:assert s not in ''.join(ts[:3])
     assert not any(t in ts[2] for t in E['times']),'M1 rows must be authored from selected source IDs and times'
     assert ('then' not in ''.join(ts)) if locale=='zh' else True
     assert ('page14' in ts[10] if locale=='en' else '第14页' in ts[10])
     assert ('AFTER' in ts[13] if locale=='en' else '核准后才发' in ts[13])
     # Inspect actual vector output, not only the source data: same 28-point scale in both papers.
     gauge=[x for x in pdf.pages[11].lines if abs(x['height'])<.01 and abs(x['width']-132)<.01];ys=sorted(set(round(x['y0'],4) for x in gauge));assert len(ys)==5 and all(abs(ys[i+1]-ys[i]-28)<.01 for i in range(4)),ys
     bars=[x for x in pdf.pages[12].rects if x.get('fill') and abs(x['width']-90)<.01];assert sorted(round(x['height']) for x in bars)==[28,84]
     assert ('Practice' in reader.pages[5].extract_text() if locale=='en' else '独立练习' in reader.pages[5].extract_text())
    else:
     for i in [6,8,10,12,14,16]:
      for secret in ['4,3,1','9:00W','9:00西','0,1,3','0、1、3']:assert secret not in ts[i],(locale,i+1,secret)
     assert all(v in ts[1] for v in ['96','115','112','131','36','42','84','98'])
     if locale=='zh':assert 'then' not in ''.join(ts)
   rows.append({k:f[k] for k in ['locale','paper','role','pages','sha256']})
  for z in manifest['zips']:
   with zipfile.ZipFile(R/z['path']) as a:
    assert len(a.namelist())==2 and a.testzip() is None
    for name in a.namelist():assert a.read(name)==(folder/name).read_bytes()
 for locale in ['en','zh']:
  for role in ['player','guide']:
   canonical=lambda texts:[s.replace('A4','PAPER').replace('Letter','PAPER') for s in texts]
   assert canonical(texts[locale,'A4',role])==canonical(texts[locale,'Letter',role])
 result={'status':'passed','pdfs':rows,'pages':140,'tools':{'windAngles':angles,'rainStepPoints':28,'actualRainFillHeightsPoints':[28,84]},'pieces':{'full':14,'low':6},'roles':[2,3,4,5,6],'neutralPracticesNotGameAnswers':True,'copyNoticeDelayedUntilOriginalReadings':True,'paperTextParity':True,'physicalPrintTested':False,'childPlayTested':False}
 (R/'tmp/pdfs/weather/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print('Weather: 8PDF /140pages; actual geometry, roles, staged answers, cuts, fonts, bounds, parity and ZIP bytes passed.')
if __name__=='__main__':main()

