"""Generate authored Chinese files only; English1.1 bytes remain frozen."""
from pathlib import Path
import json,hashlib,zipfile,sys
from functools import partial
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate,PageBreak
from reportlab.lib.pagesizes import A4,letter
from pypdf import PdfReader
import generate_retail_packs
import halloween_home_edition_content as en
from halloween_home_zh_layout import ChineseCanvas,composition,UNKNOWN
R=Path(__file__).resolve().parents[1]

def footer(c,d):
    c.saveState();c.setFont('PAHALLOWEENZH',8)
    c.drawString(44,25,'PAPER ADVENTURE／万圣节世界／家庭版／'+('玩家材料' if d.role=='player' else '成人主持指南')+'／简体中文1.0-zh.1／'+d.paper)
    c.drawRightString(d.pagesize[0]-44,25,'第'+str(d.page)+'页');c.restoreState()

def main():
    frozen=json.loads((R/'docs/halloween-home-zh-development-plan.json').read_text(encoding='utf-8'))['frozenEnglishManifest']
    for f in frozen['items']+frozen['zips']:assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256']
    for style in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PAHALLOWEENZH'+('-Bold' if style=='Bold' else ''),str(R/f'assets/fonts/PAHalloweenSans-{style}.ttf')))
    pdfmetrics.registerFontFamily('PAHALLOWEENZH',normal='PAHALLOWEENZH',bold='PAHALLOWEENZH-Bold',italic='PAHALLOWEENZH',boldItalic='PAHALLOWEENZH-Bold')
    s=next(x for x in json.loads((R/'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8')) if x['id']=='halloween' and x['setting']=='home')
    out=R/'output/pdf/halloween-home-zh-1.0-zh.1';out.mkdir(parents=True,exist_ok=True);q=R/'tmp/pdfs/halloween-home-zh';q.mkdir(parents=True,exist_ok=True)
    items=[];zips=[];UNKNOWN.clear();en.GEOMETRY.clear()
    for paper,size in [('A4',A4),('Letter',letter)]:
        pair=[]
        for role,parts in zip(['player','guide'],composition(s,size[0]-88)):
            en.CONTEXT.update(paper=paper,role=role);path=out/f'halloween-home-{role}-zh-{paper}.pdf'
            d=SimpleDocTemplate(str(path),pagesize=size,leftMargin=44,rightMargin=44,topMargin=52,bottomMargin=52,title='找回南瓜灯／'+('玩家材料' if role=='player' else '成人主持指南')+'／'+paper,author='Paper Adventure Workshop');d.role=role;d.paper=paper;flow=[]
            for i,part in enumerate(parts):
                if i:flow.append(PageBreak())
                flow.extend(part)
            d.build(flow,onFirstPage=footer,onLaterPages=footer,canvasmaker=partial(ChineseCanvas,invariant=1))
            raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();pages=len(PdfReader(path).pages);assert pages==len(parts),(path,pages,len(parts))
            items.append(dict(world='halloween',setting='home',locale='zh',version='1.0-zh.1',paper=paper,role=role,pages=pages,path=path.relative_to(R).as_posix(),sha256=sha,bytes=len(raw),r2Key=f'ready-localized/halloween/home/zh/1.0-zh.1/{paper}/{role}-{sha[:16]}.pdf'));pair.append(path)
        z=out/f'halloween-home-complete-zh-{paper}.zip'
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as a:
            for path in pair:
                info=zipfile.ZipInfo(path.name,(2026,11,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;a.writestr(info,path.read_bytes())
        zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
    (q/'untranslated.json').write_text(json.dumps(sorted(UNKNOWN),ensure_ascii=False,indent=2),encoding='utf-8')
    (q/'geometry.json').write_text(json.dumps(en.GEOMETRY,indent=2),encoding='utf-8')
    assert not UNKNOWN,sorted(UNKNOWN)
    (out/'manifest.json').write_text(json.dumps(dict(world='halloween',setting='home',locale='zh',version='1.0-zh.1',sourceEnglishVersion='v1.0',contentReferenceRevision='en1.1',status='local_review_not_published',items=items,zips=zips),ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'READ-FIRST.txt').write_text('找回南瓜灯／简体中文1.0-zh.1／本地完成，尚未上线\n玩家17页＋成人指南19页。全套选同一种A4或Letter，单面100%打印。\n成人第18页为私密原尺寸灯图，每组必须打印一张，不能混入玩家页。指南屏幕阅读：一组18张，两组36张；整本指南打印一份：一组36张，两组54张（另补一张第18页）。\n17件散件＝4任务卡＋1观察框＋4演员＋4位置卡＋4提示卡。模板变成演员不重复计数；少剪方式保留任务整页则13件。翻窗保持连接。\n开局发玩家1至5及6至7页；核准后依次发8至9、10至12、13至15、16页。完整结局只在成人17页，玩家17页为结局后可选空白纪念页。\n排练剧本成人14页；正式剧本成人17页，顺序不同。排练不移演员；正式演出开对后演员谢幕，最后移开整张窗纸看完整灯图。\n没有进行真实儿童试玩、实体打印或裁剪测试。\n',encoding='utf-8')
    for f in frozen['items']+frozen['zips']:assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256']
    print('Generated authored Chinese:17 Player+19 Host, four PDFs and two ZIPs; frozen English unchanged.')

if __name__=='__main__':main()
