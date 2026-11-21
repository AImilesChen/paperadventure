"""Inspect actual Home v2 PDFs and protect the published Classroom edition."""
import hashlib,itertools,json,math,re,zipfile
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
from home_zh_v2 import EDITION,PP,GP,assignments

ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def segment_distance(p,a,b):
    t=max(0,min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/math.dist(a,b)**2))
    return math.dist(p,(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))

def main():
    manifest=json.loads((ROOT/'output/pdf/zh-free-games/manifest.json').read_text(encoding='utf-8'))
    game=json.loads((ROOT/'content/free-games/zh-game-contract.json').read_text(encoding='utf-8'))['home']
    assert [game['answer'][k] for k in ['letter','label','parcel']]==['B','D','C']
    assert len(set(''.join(row[1:3]) for row in game['codeRows']))==4
    for n in range(2,7):
        for m in range(1,6):
            row=assignments(n,m);assert len(row)==n
            if m==4:
                one=[i for i,s in enumerate(row) if '卡一' in s];two=[i for i,s in enumerate(row) if '卡二' in s]
                assert one and two and not set(one)&set(two)
            else:assert all(any(role in s for s in row) for role in ['信使','观察员','绘图员','保管员'])
        assert all(len({assignments(n,m)[i] for m in [1,2,3,5]})>1 for i in range(n))
    results=[]
    for paper in ['A4','Letter']:
        player=next(x for x in manifest['items'] if x['setting']=='home' and x['paper']==paper and x['role']=='player')
        guide=next(x for x in manifest['items'] if x['setting']=='home' and x['paper']==paper and x['role']=='guide')
        pts=[re.sub(r'\s+','',p.extract_text()) for p in PdfReader(ROOT/player['path']).pages]
        gts=[re.sub(r'\s+','',p.extract_text()) for p in PdfReader(ROOT/guide['path']).pages]
        assert '本页不抄答案' in pts[PP['progress']-1]
        assert '不再抄写包裹或送货信息' in pts[PP['finish']-1]
        assert '两张密码卡由不同孩子持有' in pts[0]
        assert not any('送到小圆桌' in p for p in pts)
        for i in range(1,6):
            operation=gts[GP[f'mission{i}']-1];answer=gts[GP[f'mission{i}Answers']-1]
            assert f'主持指南第{GP[f"mission{i}Answers"]}页' in operation
            assert all(word in answer for word in ['通过条件','成人答案','三级提示','保留与发放'])
        assert '标签D' in gts[GP['mission3Answers']-1] and '包裹C' in gts[GP['ending']-1]
        assert all(word in gts[GP['printing']-1] for word in ['13张','25张','31张','43张'])
        with pdfplumber.open(ROOT/player['path']) as pdf:
            p=pdf.pages[PP['routeTask']-1]
            circles=[c for c in p.curves if abs(c['width']-38)<.05 and abs(c['height']-38)<.05]
            assert len(circles)==6
            nodes={p.crop((c['x0'],c['top'],c['x1'],c['bottom'])).extract_text().strip():(c['x0']+19,c['y0']+19) for c in circles}
            clearances=[]
            for _,a,b in game['route']:
                for name,pos in nodes.items():
                    if name not in [a,b]:
                        distance=segment_distance(pos,nodes[a],nodes[b]);assert distance>23,(paper,a,b,name,distance)
                        clearances.append(distance-19)
            p=pdf.pages[PP['decodeTask']-1]
            cells=[x for x in p.rects if abs(x['width']-34)<.05 and abs(x['height']-34)<.05]
            assert len(cells)==5 and all(not x.get('dash') or not x['dash'][0] for x in cells)
            assert not any(x.get('dash') and x['dash'][0] for x in p.curves+p.rects)
            assert not any(w['text']=='_' for w in p.extract_words())
            counts={}
            for page,count in [(PP['jobs'],4),(PP['clueCards'],6),(PP['routeCards'],5),(PP['keyCards'],2)]:
                p=pdf.pages[page-1];cut=[x for x in p.curves+p.rects if x.get('stroke') and x.get('dash') and x['dash'][0]]
                assert len(cut)==count,(paper,page,len(cut));counts[str(page)]=len(cut)
            assert sum(counts.values())==17
            for page in ['letterTask','routeTask','labelTask','decodeTask','parcelTask','finish']:
                p=pdf.pages[PP[page]-1];assert not any(x.get('dash') and x['dash'][0] for x in p.curves+p.rects),page
            results.append({'paper':paper,'cutPiecesByPage':counts,'answerCells':5,'answerCellsSolid':True,'orphanUnderscores':0,'minimumRouteToUnrelatedCircleClearancePt':round(min(clearances),2)})
    baseline=ROOT.parent/'chinese-classroom-v84';old=json.loads((baseline/'output/pdf/zh-free-games/manifest.json').read_text())
    for f in old['items']+old['zips']:
        if f['setting']=='classroom':assert digest(ROOT/f['path'])==digest(baseline/f['path'])
    for f in ['assets/fonts/PAClassroomSans-Regular.ttf','assets/fonts/PAClassroomSans-Bold.ttf','assets/fonts/PAFreeGameSans-Regular.ttf','assets/fonts/PAFreeGameSans-Bold.ttf']:
        assert digest(ROOT/f)==digest(baseline/f)
    for p in (baseline/'public/assets/free-games/zh').glob('classroom-*.jpg'):assert digest(p)==digest(ROOT/'public/assets/free-games/zh'/p.name)
    for p in (baseline/'src').rglob('*.css'):assert digest(p)==digest(ROOT/'src'/p.relative_to(baseline/'src'))
    report={'status':'passed','version':EDITION['version'],'playerPages':12,'hostPages':EDITION['pages']['guide'],'papers':results,'roles':'2–6 players / 5 missions; both keys always held by different people','classroomArtifactsPreserved':True,'allExistingCssPreserved':True,'physicalPrintTested':False,'childPlayTested':False}
    out=ROOT/'tmp/pdfs/home-v2';out.mkdir(parents=True,exist_ok=True);(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
