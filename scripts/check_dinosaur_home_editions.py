"""Independent solution, PDF-boundary, geometry, privacy and delivery checks for H02."""
from pathlib import Path
from itertools import permutations
import json,hashlib,zipfile,re
import pdfplumber
from pypdf import PdfReader
from fontTools.ttLib import TTFont
from dinosaur_home_edition_content import E,jobs,content
R=Path(__file__).resolve().parents[1]
norm=lambda s:''.join(s.split())
def main():
    glyphs=[TTFont(R/f'assets/fonts/PADinosaurSans-{style}.ttf').getBestCmap() for style in ['Regular','Bold']]
    matching=[t for t in E['tracks'] if (t['toes'],t['heel'],t['notch'])==(3,'round',True)]
    assert [x['id'] for x in matching]==[1,3,5]
    assert ''.join(t['en'] for t in matching)=='SUN' and ''.join(t['zh'] for t in matching)=='阳光地'
    ports={t['id']:set(t['ports']) for t in E['tiles']}
    touches=[(0,1,'E','W'),(1,2,'E','W'),(3,4,'E','W'),(4,5,'E','W'),(0,3,'S','N'),(1,4,'S','N'),(2,5,'S','N')]
    solved=[]
    for rest in permutations([x for x in ports if x!='sun']):
        names=('sun',)+rest;p=[ports[n] for n in names]
        if 'E' not in p[5]:continue
        if any(d in p[i] for i,ds in [(0,'NW'),(1,'N'),(2,'NE'),(3,'SW'),(4,'S'),(5,'S')] for d in ds):continue
        if all((a in p[i])==(b in p[j]) for i,j,a,b in touches):solved.append(names)
    assert solved==[tuple(E['layout'])]
    graph={n:set() for n in solved[0]}
    for i,j,a,b in touches:
        if a in ports[solved[0][i]]:graph[solved[0][i]].add(solved[0][j]);graph[solved[0][j]].add(solved[0][i])
    def paths(at,end,blocked,seen=()):
        if at==end:return [seen+(at,)]
        return [p for nxt in graph[at]-set(seen)-{blocked} for p in paths(nxt,end,blocked,seen+(at,))]
    assert paths('sun','tunnel','bridge')==[tuple(E['stormStopRoute'])]
    for n in range(2,7):
        for m in range(1,6):
            tasks=[a.split('-')[0] for bundle in jobs(n,m) for a in bundle.split('/')]
            assert set(tasks)==set('RMSC') and len(jobs(n,m))==n
            assert tasks.count('C')==tasks.count('S')==1
            assert tasks.count('R')==(2 if n>=5 else 1) and tasks.count('M')==(2 if n==6 else 1)
    geometry=json.loads((R/'tmp/pdfs/dinosaur-home/geometry.json').read_text(encoding='utf-8'));rows=[];texts={}
    for locale,version in E['versions'].items():
        folder=R/f'output/pdf/dinosaur-home-{locale}-{version}';manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));assert len(manifest['items'])==4
        assert manifest['world']=='dinosaur' and manifest['setting']=='home'
        for f in manifest['items']:
            p=R/f['path'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'] and len(b)==f['bytes'];assert f['r2Key'].startswith(f'ready-localized/dinosaur/home/{locale}/{version}/')
            reader=PdfReader(p);assert len(reader.pages)==E['pages'][f['role']]
            ts=[norm(page.extract_text() or '') for page in reader.pages];texts[locale,f['paper'],f['role']]=ts
            with pdfplumber.open(p) as pdf:
                for i,page in enumerate(pdf.pages,1):
                    for ch in page.chars:
                        assert all(ord(c) in glyphs[0] and ord(c) in glyphs[1] for c in ch['text']),(locale,f['role'],i,'missing glyph',repr(ch['text']))
                        assert ch['x0']>=24 and ch['x1']<=page.width-24 and ch['top']>=4 and ch['bottom']<=page.height-14,(locale,f['role'],i,'outside',ch['text'])
                    fonts=page.objects.get('char',[]);assert fonts and all('DinosaurSans' in c['fontname'] for c in fonts)
                if f['role']=='player':
                    def rect_exists(page,w,h):return any(abs(x['width']-w*72/25.4)<.02 and abs(x['height']-h*72/25.4)<.02 for x in pdf.pages[page-1].rects)
                    for page,wh in [(8,E['slotMm']),(8,E['campMm']),(9,E['tileMm']),(11,E['backpackSlotMm']),(12,E['supplyMm']),(14,E['parkingSlotMm']),(15,E['markerMm'])]:assert rect_exists(page,*wh),(locale,f['paper'],page,wh)
            if f['role']=='player':
                assert ('阳光地' not in ''.join(ts[:4])) if locale=='zh' else ('SUN' not in ''.join(ts[:4]))
                assert ('阳' in ts[4] and '光' in ts[4] and '地' in ts[4]) if locale=='zh' else all(x in ts[4] for x in ['1/S','3/U','5/N'])
                assert ('不能旋转' in ts[5] and '不能斜跳' in ts[6]) if locale=='zh' else ('Donotrotate' in ts[5] and 'neverdiagonally' in ts[6])
                assert 'Welcomehome' not in ''.join(ts) and '欢迎回家' not in ''.join(ts)
                assert 'SUN→FERN→FORD→TUNNEL' not in ''.join(ts) and '阳光地→蕨叶地→浅滩→隧道' not in ''.join(ts)
                assert ('营地仍留空' in ts[12]) if locale=='zh' else ('leavecampempty' in ts[12])
                assert ('核准后' in ts[15]) if locale=='zh' else ('Afteracceptance' in ts[15])
                assert ('实际使用后才放入' in ts[13]) if locale=='zh' else ('untilsuppliesareactuallyused' in ts[13])
            rows.append({k:f[k] for k in ['locale','paper','role','pages','sha256']})
        for z in manifest['zips']:
            with zipfile.ZipFile(R/z['path']) as a:
                assert len(a.namelist())==2 and a.testzip() is None
                for n in a.namelist():assert a.read(n)==(folder/n).read_bytes()
    for locale in ['en','zh']:
        for role in ['player','guide']:
            canon=lambda ts:[t.replace('A4','PAPER').replace('Letter','PAPER') for t in ts]
            assert canon(texts[locale,'A4',role])==canon(texts[locale,'Letter',role])
        for paper in ['A4','Letter']:
            gs=[g for g in geometry if g['locale']==locale and g['paper']==paper and g['role']=='player']
            cuts=[g for g in gs if g['kind']=='cut'];assert len(cuts)==16 and len([g for g in cuts if not g.get('optionalRoleCut')])==12
            assert {i:sum(g['page']==i for g in cuts) for i in [2,9,12,15]}=={2:4,9:6,12:4,15:2}
            slots=[g for g in gs if g['kind']=='slot'];tiles=[g for g in gs if g['kind']=='tile'];assert len(slots)==len(tiles)==6
            boardmap={g['slot']:g for g in slots};tilemap={g['tileId']:g for g in tiles};position={}
            for i,n in enumerate(E['layout']):
                slot=boardmap['ABC'[i%3]+str(i//3+1)];t=tilemap[n];position[n]=(slot['x']+(slot['width']-t['width'])/2,slot['y']+(slot['height']-t['height'])/2)
            actualports={}
            for g in gs:
                if g['kind']=='tile-port':
                    t=tilemap[g['tileId']];x,y=position[g['tileId']];actualports[g['tileId'],g['direction']]=(g['x']-t['x']+x,g['y']-t['y']+y)
            expectedguides=[]
            for i,j,a,b in touches:
                if a in ports[E['layout'][i]]:
                    u=actualports[E['layout'][i],a];v=actualports[E['layout'][j],b]
                    assert abs(u[1]-v[1])<.02 if a=='E' else abs(u[0]-v[0])<.02
                    assert abs((abs(u[0]-v[0])+abs(u[1]-v[1]))-4*72/25.4)<.02
                    expectedguides.append((u,v))
            guides=[g['points'] for g in gs if g['kind']=='gap-guide']
            same=lambda p,q:abs(p[0]-q[0])<.02 and abs(p[1]-q[1])<.02
            for u,v in expectedguides:assert any((same(a,u) and same(b,v)) or (same(a,v) and same(b,u)) for a,b in guides)
            connector=next(g['points'] for g in gs if g['kind']=='camp-connector');assert same(connector[0],actualports['tunnel','E'])
            assert E['supplyMm'][0]<E['backpackSlotMm'][0] and E['supplyMm'][1]<E['backpackSlotMm'][1]
            assert E['markerMm'][0]<E['campMm'][0] and E['markerMm'][1]<E['campMm'][1]
    result={'status':'passed','pdfs':rows,'pages':140,'paperTextParity':True,'sourceBasedUprightMapUnique':True,'stormStopsAtTunnel':True,'chineseCharacterChain':True,'actualPortAndGapGuideCoordinatesMatch':True,'cutCounts':{'full':16,'low':12},'seatAllocations':[2,3,4,5,6],'geometrySameMmBothPapers':True,'privateWelcomeOnly':True,'physicalPrintTested':False,'childPlayTested':False}
    (R/'tmp/pdfs/dinosaur-home/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print('Dinosaur Home:8PDF/140pages, fonts/bounds/Chinese chain/map uniqueness/actual port joins/cuts/roles/staging/paper parity/ZIP bytes passed.')
if __name__=='__main__':main()
