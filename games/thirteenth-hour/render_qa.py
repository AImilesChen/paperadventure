from pathlib import Path
import subprocess
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'tmp/thirteenth-hour-qa';out.mkdir(parents=True,exist_ok=True)
exe=Path(r'C:/Users/NINGMEI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
for pdf in (ROOT/'output/private/thirteenth-hour').glob('*.pdf'):
 subprocess.run([str(exe),'-png','-scale-to','1300',str(pdf),str(out/pdf.stem)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 paths=sorted(out.glob(pdf.stem+'-*.png'),key=lambda p:int(p.stem.rsplit('-',1)[1]));sheet=Image.new('RGB',(1200,((len(paths)+3)//4)*445),'#d8d4ca');d=ImageDraw.Draw(sheet)
 for i,p in enumerate(paths):
  im=Image.open(p);im.thumbnail((290,410));x=i%4*300;y=i//4*445;sheet.paste(im,(x+(300-im.width)//2,y+22));d.text((x+8,y+5),p.stem,fill='black')
 sheet.save(out/(pdf.stem+'-contact.jpg'))
print('Rendered all 40 pages and four contact sheets.')

# Actual rendered pieces, aligned at their PDF dimensions, expose digital
# geometry mistakes without claiming a real print/cut test.
from pypdf import PdfReader
from pypdf.generic import ContentStream
MM=72/25.4
r=PdfReader(ROOT/'output/private/thirteenth-hour/Letter-players.pdf')
def rects(n):return [list(map(float,a))for a,op in ContentStream(r.pages[n-1].get_contents(),r).operations if op==b're']
def find(n,w,h):return next(a for a in rects(n)if abs(a[2]-w*MM)<.1 and abs(a[3]-h*MM)<.1)
def crop(n,a):
 im=Image.open(out/f'Letter-players-{n:02}.png').convert('RGBA');sx=im.width/float(r.pages[n-1].mediabox.width);sy=im.height/float(r.pages[n-1].mediabox.height);x,y,w,h=a
 return im.crop((round(x*sx),round(im.height-(y+h)*sy),round((x+w)*sx),round(im.height-y*sy)))
def mask_part(n,box,windows):
 im=crop(n,box);alpha=Image.new('L',im.size,255);d=ImageDraw.Draw(alpha)
 for a in windows:
  xx=(a[0]-box[0])/box[2]*im.width;yy=(box[1]+box[3]-a[1]-a[3])/box[3]*im.height;ww=a[2]/box[2]*im.width;hh=a[3]/box[3]*im.height;d.rectangle((round(xx),round(yy),round(xx+ww),round(yy+hh)),fill=0)
 im.putalpha(alpha);return im
framebox=find(3,180,110);windows=[a for a in rects(3)if abs(a[2]-28*MM)<.1];frame=mask_part(3,framebox,windows);strip=crop(5,find(5,160,90));scale=frame.width/180
panels=[]
for state,offset in [('BEFORE',-15),('AFTER',30)]:
 im=Image.new('RGBA',(round(220*scale),round(160*scale)),(235,231,220,255));im.alpha_composite(strip,(round(30*scale),round((160-20-offset-90)*scale)));im.alpha_composite(frame,(round(20*scale),round(30*scale)));ImageDraw.Draw(im).text((20,10),state+' / actual PDF pieces',fill='black');panels.append(im)
joined=Image.new('RGB',(sum(i.width for i in panels),panels[0].height),'white')
for n,im in enumerate(panels):joined.paste(im,(n*im.width,0))
joined.save(out/'assembled-wall.png')

coverbox=find(6,180,100);cover=mask_part(6,coverbox,[a for a in rects(6)if abs(a[2]-30*MM)<.1 and abs(a[3]-20*MM)<.1]);centres={}
def visitor(t,cm,tm,font,size):
 if t.strip()in ['RIGHT','LEAF']:centres[t.strip()]=(cm[4],cm[5])
r.pages[6].extract_text(visitor_text=visitor);scale=cover.width/180
for angle,title in [(0,'correct'),(-120,'both-raised')]:
 im=Image.new('RGBA',cover.size,'white')
 for xx,key in [(45,'RIGHT'),(135,'LEAF')]:
  cx,cy=centres[key];wheel=crop(7,[cx-40*MM,cy-40*MM,80*MM,80*MM]);wheel=wheel.rotate(angle,resample=Image.Resampling.BICUBIC,fillcolor='white');im.alpha_composite(wheel,(round((xx-40)*scale),round(15*scale)))
 im.alpha_composite(cover);im.convert('RGB').save(out/f'assembled-drive-{title}.png')
print('Rendered actual-piece wall and drive assembly simulations.')

