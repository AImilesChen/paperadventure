"""Document/logic acceptance for Home revision 3, not a physical or child playtest."""
import hashlib,itertools,json,re
from collections import Counter
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from home_zh_v2 import EDITION,PP,GP,assignments

R=Path(__file__).resolve().parents[1]
def clean(text):return re.sub(r'\s+','',text)

def main():
    h=json.loads((R/'content/free-games/zh-game-contract.json').read_text(encoding='utf-8'))['home']
    target=['狐狸','圆形',3]
    def matches(indices):return [r[0] for r in h['letters'] if all(r[i+1]==target[i] for i in indices)]
    assert matches(range(3))==[h['answer']['letter']]
    missing=[]
    for removed in range(3):
        possible=matches([i for i in range(3) if i!=removed]);assert len(possible)==2
        missing.append({'omittedFeature':removed,'remainingCandidates':possible})
    route=h['answer']['route']
    assert route!=sorted(route) and route!=sorted(route,reverse=True)
    assert [x[0] for x in h['route'][:3]]!=route
    # All three binary attributes balance 2:2, removing the old unique-mode hint.
    counts=[dict(Counter(r[i] for r in h['parcels'])) for i in [1,2,3]]
    assert all(sorted(x.values())==[2,2] for x in counts)
    assert [r[0] for r in h['parcels'] if r[1:]==['红色',4,'小圆桌']]==[h['answer']['parcel']]
    # Four beginner options allow two conditions to identify a parcel. Do not
    # falsely claim all three clues are mathematically indispensable here.
    pair_results={}
    values=['红色',4,'小圆桌']
    for indices in itertools.combinations(range(3),2):
        possible=[r[0] for r in h['parcels'] if all(r[i+1]==values[i] for i in indices)]
        pair_results[str(indices)]=possible;assert possible==['C']
    manifest=json.loads((R/'output/pdf/zh-free-games/manifest.json').read_text(encoding='utf-8'))
    report=[]
    for paper in ['A4','Letter']:
        files={role:next(f for f in manifest['items'] if f['setting']=='home' and f['paper']==paper and f['role']==role) for role in ['player','guide']}
        texts={role:[clean(p.extract_text()) for p in PdfReader(R/f['path']).pages] for role,f in files.items()}
        p=texts['player'];g=texts['guide']
        assert len(p)==12 and len(g)==19
        combined=''.join(p+g)
        for phrase in ['每过一关换到下一行','三位持卡人','两只尖耳朵','A→B→C','第18页庆祝信','共30张','共42张']:assert phrase not in combined,phrase
        assert '看右侧对应关卡那一列' in g[GP['smallTeams']-1]
        assert '读表示例' in g[GP['smallTeams']-1]
        for page in [p[PP['labelTask']-1],g[GP['mission3']-1]]:assert '两人' in page and '两张' in page
        assert '眼睛和其他圆形不计' in p[PP['clueCards']-1]
        for ident,animal,frame,dots,start in h['letters']:
            page=p[PP['letterTask']-1]
            expected=f'候选信{ident}';assert expected in page
            assert clean(f'动物：{animal}印章外框：{frame}下方实心圆点：{dots}个路线起点：{start}') in page
        for ident,a,b in h['route']:assert clean(f'路线卡{ident}从：{a}到：{b}') in p[PP['routeCards']-1]
        for ident,colour,n,place in h['parcels']:assert clean(f'包裹{ident}／全队共用旗色：{colour}标签数字：{n}地点：{place}') in p[PP['parcelTask']-1]
        assert '→'.join(route) in g[GP['mission2Answers']-1]
        for i in range(1,6):
            operation=g[GP[f'mission{i}']-1];answer=g[GP[f'mission{i}Answers']-1]
            assert '成人答案' not in operation and '强提示' in answer and '不要提前照读' in answer
            for spoiler in ['送到小圆桌','信件B','标签D','包裹C','→'.join(route)]:assert spoiler not in operation
        quick=g[GP['quickReference']-1]
        for spoiler in ['送到小圆桌','信件B','标签D','包裹C','→'.join(route)]:assert spoiler not in quick
        for num in [8,10,12,14,16]:assert f'核对第{num}页' in quick
        assert '第19页的一封庆祝信' in quick and '本页不列答案' in quick
        assert all(x in g[GP['printing']-1] for x in ['第1至18页','第19页','13张','25张','31张','43张'])
        assert '送到小圆桌' not in ''.join(p)
        assert '第5关后' not in p[PP['finish']-1] or '主持人确认' in p[PP['finish']-1]
        with pdfplumber.open(R/files['player']['path']) as pdf:
            page=pdf.pages[PP['letterTask']-1]
            stamp_circles=[x for x in page.curves if abs(x['width']-56)<.05 and abs(x['height']-56)<.05]
            stamp_squares=[x for x in page.rects if abs(x['width']-56)<.05 and abs(x['height']-56)<.05]
            dots=[x for x in page.curves if abs(x['width']-5)<.05 and abs(x['height']-5)<.05 and x['fill']]
            assert len(stamp_circles)==3 and len(stamp_squares)==1 and len(dots)==11
            for dot in dots:assert any(abs((dot['x0']+2.5)-(stamp['x0']+28))<=15 and 7<dot['top']-stamp['bottom']<9 for stamp in stamp_circles+stamp_squares)
        report.append({'paper':paper,'playerPages':len(p),'guidePages':len(g),'actualStampFrames':{'circle':3,'square':1},'actualSolidDots':11,'allTaskAnswerReferencesConsistent':True,'operationAndQuickReferenceSpoilerCheck':'passed','sha256':{role:hashlib.sha256((R/f['path']).read_bytes()).hexdigest() for role,f in files.items()}})
    out={'status':'passed','version':EDITION['version'],'method':'final PDF wording, physical PDF vector geometry and exhaustive finite puzzle enumeration','independentFirstMissionClues':missing,'routeAnswerNotAlphabetical':route,'balancedFinalParcelAttributes':counts,'twoConditionShortcutAcknowledged':pair_results,'threeEvidenceChecksStillRequired':True,'papers':report,'physicalPrintTested':False,'childPlayTested':False,'notClaimed':['observed child enjoyment','observed game duration','cheat-proof game','every final parcel attribute logically indispensable']}
    dest=R/'tmp/pdfs/home-review-r3';dest.mkdir(parents=True,exist_ok=True);(dest/'acceptance.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out,ensure_ascii=False))

if __name__=='__main__':main()
