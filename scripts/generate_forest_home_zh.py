"""Generate only the Chinese edition; English repair bytes are immutable inputs."""
from pathlib import Path
import json,hashlib,zipfile
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from forest_home_zh_content import content
from forest_home_zh_layout import ForestZhSheet
from generate_chinese_free_games import AUDIT,GEOMETRY
R=Path(__file__).resolve().parents[1]
def main():
 for style in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PAFORESTZH'+('-Bold' if style=='Bold' else ''),str(R/f'assets/fonts/PAForestSans-{style}.ttf')))
 pdfmetrics.registerFontFamily('PAFORESTZH',normal='PAFORESTZH',bold='PAFORESTZH-Bold',italic='PAFORESTZH',boldItalic='PAFORESTZH-Bold')
 AUDIT.clear();GEOMETRY.clear();out=R/'output/pdf/forest-home-zh-1.0-zh.1';out.mkdir(parents=True,exist_ok=True);items=[];zips=[]
 for paper,size in [('A4',A4),('Letter',letter)]:
  pair=[]
  for role,pages in zip(['player','guide'],content()):
   p=out/f'forest-home-{role}-zh-{paper}.pdf';c=Canvas(str(p),pagesize=size,pageCompression=1,invariant=1);c.setTitle('森林邮局投递谜案／'+('玩家材料' if role=='player' else '成人主持指南')+'／'+paper);c.setAuthor('Paper Adventure Workshop')
   for i,v in enumerate(pages,1):
    s=ForestZhSheet(c,size,role,i,len(pages));s.text(v['title'],size=22,bold=True,leading=30)
    if v['intro']:s.text(v['intro'],size=10.3)
    for kind,*args in v['blocks']:
     if kind=='lines':s.lines(['留给小队的画图区：'])
     else:getattr(s,kind)(*args)
    c.showPage()
   c.save();raw=p.read_bytes();sha=hashlib.sha256(raw).hexdigest();pair.append(p)
   items.append(dict(world='forest',setting='home',locale='zh',version='1.0-zh.1',paper=paper,role=role,pages=len(pages),path=p.relative_to(R).as_posix(),bytes=len(raw),sha256=sha,r2Key=f'ready-localized/forest/home/zh/1.0-zh.1/{paper}/{role}-{sha[:16]}.pdf'))
  z=out/f'forest-home-complete-zh-{paper}.zip'
  with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as a:
   for p in pair:
    info=zipfile.ZipInfo(p.name,(2026,11,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;a.writestr(info,p.read_bytes())
  zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
 (out/'manifest.json').write_text(json.dumps(dict(world='forest',setting='home',locale='zh',version='1.0-zh.1',sourceEnglishVersion='v1.0',status='local_review_not_published',items=items,zips=zips),ensure_ascii=False,indent=2),encoding='utf-8')
 (out/'READ-FIRST.txt').write_text('森林邮局投递谜案／简体中文1.0-zh.1／本地完成，尚未上线\n玩家18页，成人17页。选择同一种A4或Letter，单面100%打印。\n完整结局只在成人第16页。玩家第15页私密卡由成人预剪折叠，不能把未折叠整页给投递员。\n开局发玩家1至4页及5至7页，之后按8至10、11至12、13至15、16至17逐关核准发放。玩家18页为结局后可选纪念页。\n每组19件，先剪18件，第二关后剪新标签；角色整页保留则15件。完整打印一组35张、两组53张（含一份成人指南），指南也可屏幕阅读。\n只用虚构信息。没有进行实体打印或儿童试玩。\n',encoding='utf-8')
 q=R/'tmp/pdfs/forest-home-zh';q.mkdir(parents=True,exist_ok=True);(q/'layout-boxes.json').write_text(json.dumps(AUDIT,ensure_ascii=False),encoding='utf-8');(q/'geometry.json').write_text(json.dumps(GEOMETRY,ensure_ascii=False),encoding='utf-8')
 print('Generated four Chinese PDFs: 18 Player +17 Host pages in A4/Letter; English bytes untouched.')
if __name__=='__main__':main()
