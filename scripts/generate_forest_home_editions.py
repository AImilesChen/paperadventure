"""Build local English repair 1.1; never overwrite original retail PDFs."""
from pathlib import Path
import hashlib,json,zipfile
from reportlab.platypus import SimpleDocTemplate,PageBreak
from reportlab.lib.pagesizes import A4,letter
from pypdf import PdfReader
import generate_retail_packs as retail
import forest_home_edition_content as game
R=Path(__file__).resolve().parents[1]
def footer(c,d):
    c.saveState();c.setFont('Arial',8);c.drawString(44,25,'PAPER ADVENTURE / FOREST HOME / '+d.role.upper()+' / ENGLISH 1.1 / '+d.paper);c.drawRightString(d.pagesize[0]-44,25,'Page '+str(d.page));c.restoreState()
def main():
    out=R/'output/pdf/forest-home-en-1.1';out.mkdir(parents=True,exist_ok=True);items=[];zips=[]
    s={'id':'forest','setting':'home','title':'The Forest Post Office Mystery','cover':'public/assets/forest.png'}
    for paper,size in [('A4',A4),('Letter',letter)]:
        pair=[]
        for role,parts in [('player',game.player(s,size[0]-88)),('guide',game.guide(s,size[0]-88))]:
            p=out/f'forest-home-{role}-en-{paper}.pdf';d=SimpleDocTemplate(str(p),pagesize=size,leftMargin=44,rightMargin=44,topMargin=52,bottomMargin=52,title=s['title']+' / '+role+' / English 1.1 / '+paper,author='Paper Adventure Workshop');d.role=role;d.paper=paper
            flow=[]
            for i,part in enumerate(parts):
                if i:flow.append(PageBreak())
                flow.extend(part)
            d.build(flow,onFirstPage=footer,onLaterPages=footer)
            raw=p.read_bytes();sha=hashlib.sha256(raw).hexdigest();pages=len(PdfReader(p).pages)
            assert pages==len(parts),(p.name,pages,len(parts))
            items.append(dict(world='forest',setting='home',locale='en',version='1.1',paper=paper,role=role,pages=pages,path=p.relative_to(R).as_posix(),sha256=sha,bytes=len(raw),r2Key=f'ready-localized/forest/home/en/1.1/{paper}/{role}-{sha[:16]}.pdf'));pair.append(p)
        z=out/f'forest-home-complete-en-{paper}.zip'
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
            for p in pair:archive.write(p,p.name)
        zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
    manifest=dict(world='forest',setting='home',locale='en',version='1.1',sourceEnglishVersion='v1.0',status='local_review_not_published',items=items,zips=zips)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    (out/'READ-FIRST.txt').write_text('ENGLISH REPAIR 1.1 - LOCAL REVIEW, NOT PUBLISHED\nChoose ONE paper size. Player18 + Host17 pages. Adult reads Host Guide privately.\nStart with Player1-4 and pile5-7. Later piles8-10,11-12,13-15,16-17 are released after checking.\nAdult prepares folded Player15 resident cards privately; stamp stays with adult. Complete ending ONLY on Host16. Player18 is an optional blank keepsake.\n19 cut pieces:18 before play, replacement label after station2. Low-cut15 leaves four jobs whole. Print at100%, single-sided.\nHost may be read on screen. One team18 Player sheets, two teams36; add17 if printing Host once.\nUse fictional information only. No real child/physical print test is claimed.\n',encoding='utf-8')
    print(json.dumps({'pdfs':4,'playerPages':18,'hostPages':17,'totalPages':70,'status':'local_not_published'}))
if __name__=='__main__':main()
