"""Regression checks for the actual v2 PDFs and the nine usability findings.

Tests measurable print contracts and written flow; does not claim real printing
or observations of a first-time adult/child session.
"""
import itertools
import json
import re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from reportlab.lib.units import mm
from classroom_zh_v2 import EDITION,PP,GP,assignments

ROOT=Path(__file__).resolve().parents[1]

def main():
    manifest=json.loads((ROOT/'output/pdf/zh-free-games/manifest.json').read_text(encoding='utf-8'))
    classroom=[i for i in manifest['items'] if i['setting']=='classroom']
    assert len(classroom)==4 and {i['version'] for i in classroom}=={EDITION['version']}
    for count in range(2,7):
        history=[assignments(count,mission) for mission in range(1,6)]
        for row in history:
            assert len(row)==count
            assert set('＋'.join(row).split('＋'))=={'朗读','操作','记录','核查'}
        for person in range(count):assert len({row[person] for row in history})>1
        if count==5:assert all(row.count('朗读')==2 for row in history)
        if count==6:assert all(row.count('朗读')==row.count('操作')==2 for row in history)
    results=[]
    for paper in ['A4','Letter']:
        item=next(i for i in classroom if i['paper']==paper and i['role']=='player')
        pages=PdfReader(ROOT/item['path']).pages
        text={key:re.sub(r'\s+','',pages[page-1].extract_text()) for key,page in PP.items()}
        assert '欢迎来到冒险俱乐部！' in text['invitationTask'] and '两行两列' in text['invitationTask']
        assert '示例甲' in text['invitationTask'] and '示例乙' in text['invitationTask']
        assert '问候语' not in text['invitationTask']
        assert '中间' not in text['tableTask']
        for answer in ['地图、徽章、铅笔','地图→徽章→铅笔','上排A、B，下排C、D']:assert answer not in text['tableTask']+text['invitationTask']
        assert all(phrase not in ''.join(text.values()) for phrase in ['在第2页记录','顺序记在第2页','记录员在第2页','折叠线','折成立卡'])
        assert all(phrase in text['review'] for phrase in ['六件','制作者组符号','需调整','修正后复查'])
        assert all(phrase in text['return'] for phrase in ['本页留在制作者','复查','退回本组'])
        assert '不折叠' in text['badge'] and '平放' in text['badge']
        with pdfplumber.open(ROOT/item['path']) as pdf:
            mat=pdf.pages[PP['tableTask']-1];supplies=pdf.pages[PP['supplyCards']-1]
            slots=[r for r in mat.rects if abs(r['width']-54*mm)<.05 and abs(r['height']-36*mm)<.05]
            cards=[r for r in supplies.curves if abs(r['width']-50*mm)<.05 and abs(r['height']-32*mm)<.05]
            assert len(slots)==len(cards)==3,(paper,'exact physical sizes not found')
            assert all(abs((s['width']-c['width'])/mm-4)<.05 and abs((s['height']-c['height'])/mm-4)<.05 for s,c in zip(slots,cards))
            invitation=pdf.pages[PP['invitationCards']-1]
            cut_cards=[r for r in invitation.curves if abs(r['height']-150)<.05 and r['width']>200]
            marks=[r for r in invitation.curves+invitation.rects if 5<r['width']<23 and 5<r['height']<23]
            assert len(cut_cards)==4 and len(marks)==8,(len(cut_cards),len(marks))
            clearances=[]
            for mark in marks:
                cx=(mark['x0']+mark['x1'])/2;cy=(mark['y0']+mark['y1'])/2
                card=next(r for r in cut_cards if r['x0']<cx<r['x1'] and r['y0']<cy<r['y1'])
                clearance=min(mark['x0']-card['x0'],card['x1']-mark['x1'],mark['y0']-card['y0'],card['y1']-mark['y1'])/mm
                assert clearance>=1,(paper,'mark too close to cut',clearance)
                clearances.append(clearance)
            symbols=pdf.pages[PP['symbols']-1]
            tokens=[r for r in symbols.rects if r.get('stroke') and abs(r['width']-52)<.05 and abs(r['height']-52)<.05]
            assert len(tokens)==9
            badge=pdf.pages[PP['badge']-1]
            circles=[r for r in badge.curves if abs(r['width']-200)<.05 and abs(r['height']-200)<.05]
            assert len(circles)==1
            # Six real token squares, placed without overlap, all corners inside circle.
            side=tokens[0]['width'];radius=circles[0]['width']/2
            centres=[(-28,58),(28,58),(-68,0),(0,0),(68,0),(0,-68)]
            assert all((x+dx)**2+(y+dy)**2<=radius**2 for x,y in centres for dx in [-side/2,side/2] for dy in [-side/2,side/2])
            assert all(abs(x-a)>=side or abs(y-b)>=side for (x,y),(a,b) in itertools.combinations(centres,2))
            results.append({'paper':paper,'supplyCardMm':[50,32],'slotMm':[54,36],'clearanceEachSideMm':2,'invitationCards':4,'edgeMarks':8,'minimumMarkMarginMm':round(min(clearances),2),'symbolSquares':9,'sixSymbolsFitBadge':True})
        guide=next(i for i in classroom if i['paper']==paper and i['role']=='guide')
        guide_text=[re.sub(r'\s+','',p.extract_text()) for p in PdfReader(ROOT/guide['path']).pages]
        assert '84张' in guide_text[GP['printing']-1] and '18张' in guide_text[GP['printing']-1]
        assert '全班互查' in guide_text[GP['classFlow']-1] or '统一' in guide_text[GP['classFlow']-1]
        for number in range(1,6):
            operation=guide_text[GP[f'mission{number}']-1];answer=guide_text[GP[f'mission{number}Answers']-1]
            assert f'教师指南第{GP[f"mission{number}Answers"]}页' in operation
            assert all(word in answer for word in ['通过条件','教师答案','三级提示','保留与发放'])
    # Preserve all previous Home PDFs, ZIPs, fonts and preview assets byte-for-byte.
    baseline=ROOT.parent/'chinese-free-pdf-v83'
    old=json.loads((baseline/'output/pdf/zh-free-games/manifest.json').read_text(encoding='utf-8'))
    for item in old['items']+old['zips']:
        if item['setting']=='home':assert (ROOT/item['path']).read_bytes()==(baseline/item['path']).read_bytes()
    for path in ['assets/fonts/PAFreeGameSans-Regular.ttf','assets/fonts/PAFreeGameSans-Bold.ttf']:
        assert (ROOT/path).read_bytes()==(baseline/path).read_bytes()
    for path in (baseline/'public/assets/free-games/zh').glob('home-*.jpg'):
        assert path.read_bytes()==(ROOT/'public/assets/free-games/zh'/path.name).read_bytes()
    report={'status':'passed','version':EDITION['version'],'playerPages':12,'guidePages':18,'physicalGeometry':results,'roleAssignments':'all five missions for 2–6 players covered','taskAnswerSeparation':'passed','handoffAndRepairInstructions':'present','homeArtifactsPreserved':True,'physicalPrintTested':False,'childPlayTested':False}
    out=ROOT/'tmp/pdfs/classroom-v2';out.mkdir(parents=True,exist_ok=True);(out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
