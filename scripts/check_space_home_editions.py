"""Solve from printed H03 parts and check physical fit, privacy and file integrity."""
from pathlib import Path
from itertools import permutations, combinations
import json,re,hashlib,zipfile
import pdfplumber
from pypdf import PdfReader
from fontTools.ttLib import TTFont
from space_home_edition_content import E,jobs
R=Path(__file__).resolve().parents[1]
norm=lambda s:''.join(s.split())

def check(locale):
    out=R/f"output/pdf/space-home-{locale}-{E['versions'][locale]}";m=json.loads((out/'manifest.json').read_text(encoding='utf-8'));assert len(m['items'])==4
    geom=json.loads((R/'tmp/pdfs/space-home/geometry.json').read_text(encoding='utf-8'));boxes=json.loads((R/'tmp/pdfs/space-home/layout-boxes.json').read_text(encoding='utf-8'))
    glyphs=[TTFont(R/f"assets/fonts/{'PASpaceSans' if locale=='zh' else 'PAFreeGameSans'}-{style}.ttf").getBestCmap() for style in ['Regular','Bold']]
    records=[];texts={};measurements={}
    for f in m['items']:
        raw=(R/f['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==f['sha256'] and len(raw)==f['bytes']
        assert f['world']=='space' and f['setting']=='home' and f['locale']==locale and f['version']==E['versions'][locale]
        reader=PdfReader(R/f['path']);assert len(reader.pages)==(19 if f['role']=='player' else 18)
        ts=[norm(p.extract_text()) for p in reader.pages];texts[f['paper'],f['role']]=ts
        with pdfplumber.open(R/f['path']) as pdf:
            for page in pdf.pages:
                for ch in page.chars:
                    assert all(ord(c) in glyphs[0] and ord(c) in glyphs[1] for c in ch['text']),('glyph',ch['text'])
                    assert ch['x0']>=24 and ch['x1']<=page.width-24 and ch['top']>=4 and ch['bottom']<=page.height-14,('bounds',f['path'],ch)
            if f['role']=='player':
                alltext=''.join(ts)
                if locale=='en':
                    for secret in ['R-T-K','S-E-N-D-3','SEND3','Yourthreepulses','MID/3/TRIANGLE','Controlcrew,Ihearyou!']:assert secret not in alltext,secret
                    assert 'allthreecardsinturn' in ts[9] and 'Threedifferentpeoplearenotrequired' in ts[9]
                    assert 'ALLTHREE' in ts[12] and 'ALLTHREE' in ts[14] and 'lettersordigits' in ts[12]
                    assert 'erasemarks' in ts[15] and 'BEFOREdrawing' in ts[15]
                else:
                    for secret in ['R、T、K','发3次信号','三次短信号通过中频段','中频段／3／三角形','控制小队，我听到了']:assert secret not in alltext,secret
                    assert '三张卡依次分享' in ts[9] and '不要求由三个不同的人朗读' in ts[9]
                    assert '全部三条' in ts[12] and '全部三条' in ts[14] and '汉字或数字' in ts[12]
                    assert '先擦除' in ts[15] and '再到新格子' in ts[15]
                gs=[g for g in geom if g['paper']==f['paper'] and g['role']=='player' and g['locale']==locale]
                cuts=[g for g in gs if g['kind']=='cut'];assert len(cuts)==24 and sum(not g.get('optionalRoleCut') for g in cuts)==20
                assert {p:sum(g['page']==p for g in cuts) for p in [2,6,9,12,15,18]}=={2:4,6:3,9:6,12:3,15:3,18:5}
                # Text/labels on cut pieces must stay wholly inside their actual cut border.
                for g in cuts:
                    for b in [b for b in boxes if b['paper']==g['paper'] and b['role']=='player' and b['locale']==locale and b['page']==g['page']]:
                        x,y,w,h=[b[k] for k in ['x','y','width','height']]
                        if min(x+w,g['x']+g['width'])>max(x,g['x'])+.2 and min(y+h,g['y']+g['height'])>max(y,g['y'])+.2:
                            assert x>=g['x']-.1 and y>=g['y']-.1 and x+w<=g['x']+g['width']+.1 and y+h<=g['y']+g['height']+.1,('cut text crosses border',g,b)
                def crop(g):
                    page=pdf.pages[g['page']-1];return page.crop((g['x'],page.height-g['y']-g['height'],g['x']+g['width'],page.height-g['y'])).extract_text() or ''
                # Reconstruct the printed wave labels, then enumerate all physical orders.
                waves=[]
                for g in [g for g in gs if g['kind']=='wave']:
                    t=norm(crop(g))
                    if locale=='en':
                        ident=re.search(r'WAVE([A-Z])/TOP',t)[1];inn=re.search(r'IN:(HIGH|MID|LOW)',t)[1];outt=re.search(r'OUT:(HIGH|MID|LOW)',t)[1];letter=re.search(r'BANDLETTER:([A-Z])',t)[1]
                    else:
                        levels={'高档':'HIGH','中档':'MID','低档':'LOW'}
                        ident=re.search(r'纸条([A-Z])／上方',t)[1];inn=levels[re.search(r'输入：(高档|中档|低档)',t)[1]];outt=levels[re.search(r'输出：(高档|中档|低档)',t)[1]];letter=re.search(r'频段字：(.)',t)[1]
                    page=pdf.pages[g['page']-1];curves=[p for p in page.curves if p['x0']>g['x'] and p['x1']<g['x']+g['width'] and p['y0']>g['y'] and p['y1']<g['y']+g['height']];assert len(curves)==3
                    waves.append((ident,inn,outt,letter))
                solved=[p for p in permutations(waves) if p[0][1]=='HIGH' and p[-1][2]=='HIGH' and all(p[i][2]==p[i+1][1] for i in range(2))]
                assert len(solved)==1 and ''.join(x[0] for x in solved[0])=='RTK' and ''.join(x[3] for x in solved[0])==('中频段' if locale=='zh' else 'MID')
                # Derive code columns and values from printed positions, not JSON code values.
                received=[norm(crop(g)) for g in sorted([g for g in gs if g['kind']=='received-slot'],key=lambda x:x['index'])]
                key=[norm(crop(g)) for g in sorted([g for g in gs if g['kind']=='key-slot'],key=lambda x:x['column'])]
                assert len(received)==len(key)==5 and received!=key
                decoded={};selected=[]
                for g in [g for g in gs if g['kind']=='code']:
                    page=pdf.pages[g['page']-1];vals=[]
                    for i in range(5):
                        chars=[ch for ch in page.chars if g['x']+i*g['width']/5<(ch['x0']+ch['x1'])/2<g['x']+(i+1)*g['width']/5 and g['y']+9<page.height-(ch['top']+ch['bottom'])/2<g['y']+29]
                        val=''.join(ch['text'] for ch in sorted(chars,key=lambda c:c['x0']));assert len(val)==1,(g,val);vals.append(val)
                    table=dict(zip(key,vals));decoded[g['code']]=''.join(table[symbol] for symbol in received)
                    if g['code']=='3':selected=vals
                answer='发3次信号' if locale=='zh' else 'SEND3'
                assert decoded['3']==answer and all(v!=answer for k,v in decoded.items() if k!='3') and ''.join(selected)!=answer
                cols=next(g for g in gs if g['kind']=='key-columns');code=next(g for g in gs if g['kind']=='code')
                assert abs(cols['width']-code['width'])<.001 and all(abs(a-b)<.001 for a,b in zip(cols['centres'],code['centres']))
                # Read printed costs and count the real empty slots for each device.
                devices=[]
                for g in [g for g in gs if g['kind']=='device']:
                    t=norm(crop(g));cost=int(re.search(r'／需要([123])块' if locale=='zh' else r'/([123])CELLS?',t)[1]);assert sum(x['kind']=='cell-slot' and x['deviceId']==g['deviceId'] for x in gs)==cost
                    devices.append((g['deviceId'],cost))
                receive=[d for d in devices if d[0] in ['receiver','decoder','shield']];send=[d for d in devices if d[0] in ['transmitter','shield','timer']]
                assert sum(v for _,v in receive)==sum(v for _,v in send)==6
                assert dict(receive)=={'receiver':2,'decoder':2,'shield':2} and dict(send)=={'shield':2,'transmitter':3,'timer':1}
                assert len([g for g in gs if g['kind']=='cell'])==6 and len([g for g in gs if g['kind']=='pulse'])==5
                for small,big in [('wave','wave-slot'),('cell','cell-slot'),('pulse','pulse-slot')]:
                    a=next(g for g in gs if g['kind']==small);b=next(g for g in gs if g['kind']==big);assert a['width']<b['width'] and a['height']<b['height']
                measurements[f['paper']]={k:[(round(g['width'],4),round(g['height'],4)) for g in gs if g['kind']==k] for k in ['wave','wave-slot','cell','cell-slot','code','pulse','pulse-slot']}
                for g in [g for g in gs if g['kind'] in ['cell-slot','pulse-slot','code-alignment-slot']]:
                    page=pdf.pages[g['page']-1];assert any(abs(r['x0']-g['x'])<.02 and abs(r['y0']-g['y'])<.02 and abs(r['width']-g['width'])<.02 and abs(r['height']-g['height'])<.02 for r in page.rects),('actual slot',g)
            else:
                if locale=='en':
                    assert 'Yourthreepulses' in ts[16] and 'MIDband' in ts[16]
                    assert 'E/VholdsPHASEplusBADGE' in ts[10] and 'BEFOREre-marking' in ts[5]
                else:
                    assert '三次短信号通过中频段' in ts[16] and '控制小队，我听到了' in ts[16]
                    assert '拿另外两张' in ts[10] and '先擦掉关闭设备' in ts[5]
                    assert '三边图形' in ts[11] and '发3次信号' in ts[15]
        records.append({k:f[k] for k in ['locale','paper','role','pages','sha256']})
    assert measurements['A4']==measurements['Letter']
    for role in ['player','guide']:
        standard=lambda xs:[t.replace('A4','PAPER').replace('Letter','PAPER') for t in xs]
        assert standard(texts['A4',role])==standard(texts['Letter',role])
    for n in range(2,7):
        for mission in range(1,6):
            actual=jobs(n,mission);roles=[v.split('-')[0] for bundle in actual for v in bundle.split('/')];assert len(actual)==n and set(roles)==set('CEMV')
            assert roles.count('V')==roles.count('C')==1 and roles.count('E')==(2 if n>=5 else 1) and roles.count('M')==(2 if n==6 else 1)
    assert jobs(2,3)==['C/M','E/V']
    for z in m['zips']:
        data=(R/z['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==z['sha256']
        with zipfile.ZipFile(R/z['path']) as archive:
            assert len(archive.namelist())==2 and archive.testzip() is None
            for name in archive.namelist():assert archive.read(name)==(out/name).read_bytes()
    result={'status':'passed','pdfs':records,'pages':74,'printedWaveChainUnique':True,'printedCodeLookupVerified':True,'receiveAndSendConserveSixCells':True,'samePhysicalMmBothPapers':True,'fullCuts':24,'lowCuts':20,'seatCounts':[2,3,4,5,6],'twoPlayerThreeClues':True,'privateResponseOnly':True,'noCutEraseRule':True,'paperTextParity':True,'zipPdfBytesVerified':True,'physicalPrintTested':False,'childPlayTested':False}
    (R/f'tmp/pdfs/space-home/{locale}-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8');return result

def main():
    results={locale:check(locale) for locale in ['en','zh']}
    result={'status':'passed','locales':results,'pages':148,'chineseWaveResult':'中频段','chineseDecodedRequest':'发3次信号','physicalPrintTested':False,'childPlayTested':False}
    baseline=R.parents[1]/'output/pdf/space-home-en-1.1/manifest.json'
    if baseline.exists():
        old=json.loads(baseline.read_text(encoding='utf-8'))
        current=json.loads((R/'output/pdf/space-home-en-1.1/manifest.json').read_text(encoding='utf-8'))
        differences=[]
        for previous,now in zip(old['items'],current['items']):
            if previous['sha256']==now['sha256']:continue
            assert now['role']=='player','Only the English final-form instruction may change in this review.'
            before=PdfReader(R.parents[1]/previous['path']);after=PdfReader(R/now['path'])
            changed=[i+1 for i,(a,b) in enumerate(zip(before.pages,after.pages)) if norm(a.extract_text())!=norm(b.extract_text())]
            assert changed==[17],changed;differences.append({'paper':now['paper'],'pages':changed})
        result['reviewedEnglishChanges']=differences
    (R/'tmp/pdfs/space-home/checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Space Home:8PDF/148pages; printed EN/ZH puzzles, cell conservation, geometry, role sharing, privacy, glyphs and ZIP bytes passed.')

if __name__=='__main__':main()
