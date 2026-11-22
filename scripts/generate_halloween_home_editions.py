"""Build repaired English PDFs only; never overwrite the original retail edition."""
from pathlib import Path
import hashlib,json,zipfile
from reportlab.platypus import SimpleDocTemplate,PageBreak
from reportlab.lib.pagesizes import A4,letter
from pypdf import PdfReader
import generate_retail_packs as retail
import halloween_home_edition_content as game
R=Path(__file__).resolve().parents[1]

def footer(c,d):
    c.saveState();c.setFont('Arial',8)
    c.drawString(44,25,'PAPER ADVENTURE / HALLOWEEN HOME / '+d.role.upper()+' / ENGLISH 1.1 / '+d.paper)
    c.drawRightString(d.pagesize[0]-44,25,'Page '+str(d.page));c.restoreState()

def main():
    out=R/'output/pdf/halloween-home-en-1.1';out.mkdir(parents=True,exist_ok=True)
    s=next(x for x in json.loads((R/'content/theme-design/retail-games-v1.json').read_text(encoding='utf-8')) if x['id']=='halloween' and x['setting']=='home')
    items=[];zips=[];game.GEOMETRY.clear()
    for paper,size in [('A4',A4),('Letter',letter)]:
        pair=[]
        for role,parts in [('player',game.player(s,size[0]-88)),('guide',game.guide(s,size[0]-88))]:
            game.CONTEXT.update(paper=paper,role=role)
            path=out/f'halloween-home-{role}-en-{paper}.pdf'
            d=SimpleDocTemplate(str(path),pagesize=size,leftMargin=44,rightMargin=44,topMargin=52,bottomMargin=52,title=s['title']+' / '+role+' / English 1.1 / '+paper,author='Paper Adventure Workshop')
            d.role=role;d.paper=paper;flow=[]
            for i,part in enumerate(parts):
                if i:flow.append(PageBreak())
                flow.extend(part)
            d.build(flow,onFirstPage=footer,onLaterPages=footer)
            raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();pages=len(PdfReader(path).pages)
            assert pages==len(parts),(path.name,pages,len(parts))
            items.append(dict(world='halloween',setting='home',locale='en',version='1.1',paper=paper,role=role,pages=pages,path=path.relative_to(R).as_posix(),sha256=sha,bytes=len(raw),r2Key=f'ready-localized/halloween/home/en/1.1/{paper}/{role}-{sha[:16]}.pdf'));pair.append(path)
        z=out/f'halloween-home-complete-en-{paper}.zip'
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as a:
            for path in pair:a.write(path,path.name)
        zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
    manifest=dict(world='halloween',setting='home',locale='en',version='1.1',sourceEnglishVersion='v1.0',status='local_review_not_published',items=items,zips=zips)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    (out/'READ-FIRST.txt').write_text('ENGLISH REPAIR1.1 - LOCAL REVIEW, NOT PUBLISHED\n17 Player pages +19 Host pages. Choose ONE paper size,100%, single-sided.\nHOST PAGE18 is the private FULL-SIZE LANTERN MASTER: print one for EVERY team even if reading the Guide on screen. Do not put it in the Player pile.\nGuide on screen:18 sheets for one team,36 for two. Whole Guide printed once:36 for one team;54 for two including an extra Host18.\n17 loose pieces:4 jobs+1 viewer+4 actors+4 private stage clues+4 cue cards. Templates transform into actors; do not count twice. Low-cut13 leaves jobs whole. Window flaps stay attached.\nStart Player1-5 and6-7. After acceptance release8-9,10-12,13-15,16. Host18 stays hidden until privately covered by CLOSED windows in mission5. Player17 is an optional blank keepsake after the private ending.\nDuring rehearsal keep actors in place. During the finale, correct actor takes a bow beside the theatre; after all4, lift the whole facade for the complete picture. Exact rehearsal Host14; NEW finale script and ending Host17.\nNo real lamp, flame or device needed. No physical print/cut or child playtest is claimed.\n',encoding='utf-8')
    q=R/'tmp/pdfs/halloween-home-en';q.mkdir(parents=True,exist_ok=True)
    (q/'geometry.json').write_text(json.dumps(game.GEOMETRY,indent=2),encoding='utf-8')
    print(json.dumps({'status':'local_not_published','pdfs':4,'playerPages':17,'hostPages':19,'totalPages':72}))

if __name__=='__main__':main()
