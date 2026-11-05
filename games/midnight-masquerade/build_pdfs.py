"""Build twelve print-and-play files from the companion's evidence data."""
import json, math, hashlib, zipfile
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
DATA=json.loads((Path(__file__).parent/'game.json').read_text(encoding='utf8'))
OUT=ROOT/'output/private/midnight-masquerade';OUT.mkdir(parents=True,exist_ok=True)
INK=HexColor('#302747');GOLD=HexColor('#a87224');PALE=HexColor('#f0e8f1')
def clean(s):
 for a,b in [('’',"'"),('‘',"'"),('“','"'),('”','"'),('–','-'),('—','-'),('→',' > '),('©','(c)')]:s=s.replace(a,b)
 return s
class Book:
 def __init__(self,paper,role,total):
  self.paper=paper;self.role=role;self.total=total;self.w,self.h=A4 if paper=='A4' else letter
  self.c=canvas.Canvas(str(OUT/f'{paper}-{role}.pdf'),pagesize=(self.w,self.h),invariant=1);self.c.setTitle(DATA['title']+' / '+role);self.n=0
 def page(self,title,kicker='CASE FILE 08'):
  if self.n:self.c.showPage()
  self.n+=1;c=self.c;c.setFillColor(INK);c.setStrokeColor(INK);c.setLineWidth(.7)
  c.setFont('Helvetica-Bold',9);c.drawString(38,self.h-30,'PAPER ADVENTURE / THE MIDNIGHT MASQUERADE')
  c.setFont('Helvetica',8);c.drawRightString(self.w-38,25,f'{self.paper} / {self.role.upper()} / {self.n} OF {self.total}')
  c.drawString(38,25,'Original case 08 / v2 / (c) 2026 Paper Adventure Workshop')
  c.line(38,self.h-42,self.w-38,self.h-42);self.y=self.h-65
  self.p(kicker,9,True);self.p(title,25,True,gap=18)
 def p(self,s,size=12,bold=False,gap=11,x=38,width=None):
  width=width or self.w-76
  p=Paragraph(escape(clean(s)),ParagraphStyle('p',fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,leading=size*1.38,textColor=INK))
  _,height=p.wrap(width,1000)
  if self.y-height<48:raise ValueError(f'Overflow page {self.n}: {s[:65]}')
  p.drawOn(self.c,x,self.y-height);self.y-=height+gap
 def box(self,title,body,height=None,cut=False):
  start=self.y;self.c.setFillColor(PALE);self.c.rect(34,self.y-19,self.w-68,23,fill=1,stroke=0);self.p(title,12,True);self.p(body,11)
  self.c.setStrokeColor(HexColor('#aeb9ae'))
  if cut:
   self.c.setDash(3,3);self.c.rect(32,self.y+3,self.w-64,start-self.y+4);self.c.setDash()
  else:self.c.line(38,self.y+3,self.w-38,self.y+3)
  self.y-=12
 def line(self,label):
  self.p(label,11,True,gap=5);self.c.line(38,self.y-15,self.w-38,self.y-15);self.y-=36
 def table(self,heads,rows,widths=None,cut=False,compact=False):
  widths=widths or [(self.w-76)/len(heads)]*len(heads)
  for ri,row in enumerate([heads]+rows):
   cells=[Paragraph(escape(clean(str(v))),ParagraphStyle('t',fontName='Helvetica-Bold' if ri==0 else 'Helvetica',fontSize=10.5 if compact else 11,leading=14 if compact else 15,textColor=INK)) for v in row]
   heights=[p.wrap(w-12,500)[1] for p,w in zip(cells,widths)];rh=max(heights)+(10 if compact else 18)
   if self.y-rh<50:raise ValueError('table overflow')
   if ri==0:self.c.setFillColor(PALE);self.c.rect(38,self.y-rh,sum(widths),rh,fill=1,stroke=0)
   x=38
   for p,w,h in zip(cells,widths,heights):p.drawOn(self.c,x+6,self.y-(5 if compact else 9)-h);x+=w
   self.c.setStrokeColor(HexColor('#b8c0b6'))
   if cut and ri>0:self.c.setDash(3,3);self.c.rect(38,self.y-rh,sum(widths),rh);self.c.setDash()
   else:self.c.line(38,self.y-rh,self.w-38,self.y-rh)
   self.y-=rh
  self.y-=18
 def finish(self):
  assert self.n==self.total,(self.n,self.total)
  self.c.save()

MM=72/25.4
def mask(c,kind,x,y,s=.65):
 c.saveState();c.translate(x,y);c.scale(s,s);c.setLineWidth(2);c.setStrokeColor(INK);c.setFillColor(HexColor('#ead8b9'))
 p=c.beginPath()
 if kind=='HARE':
  for sign in [-1,1]:
   p.moveTo(sign*40,15);p.curveTo(sign*60,118,sign*18,105,sign*20,22)
 elif kind=='STAG':
  for sign in [-1,1]:
   p.moveTo(sign*40,15);p.lineTo(sign*52,65);p.lineTo(sign*75,85);p.moveTo(sign*52,65);p.lineTo(sign*35,94)
 else:
  peak={'FOX':70,'CAT':60,'OWL':48,'SWAN':55}[kind]
  for sign in [-1,1]:
   p.moveTo(sign*64,10);p.lineTo(sign*(85 if kind=='SWAN' else 58),peak);p.lineTo(sign*20,26)
 c.drawPath(p,fill=kind!='STAG')
 p=c.beginPath();p.moveTo(-72,12);p.curveTo(-42,44,-15,30,0,20);p.curveTo(15,30,42,44,72,12);p.lineTo(61,-27);p.curveTo(30,-44,12,-20,0,-17);p.curveTo(-12,-20,-30,-44,-61,-27);p.close();c.setFillColor(HexColor('#d5c7df')if kind in ['OWL','CAT']else HexColor('#ead8b9'));c.drawPath(p,fill=1)
 c.setFillColor(INK)
 if kind=='OWL':
  c.circle(-31,0,23);c.circle(31,0,23)
 elif kind=='FOX':
  c.line(-61,-20,-25,-32);c.line(61,-20,25,-32)
 elif kind=='CAT':
  for yy in [-9,-19]:c.line(-70,yy,-40,yy+4);c.line(70,yy,40,yy+4)
 elif kind=='SWAN':
  for sign in [-1,1]:
   for k in range(3):c.line(sign*(48+k*8),18,sign*(65+k*8),35+k*7)
 c.setFillColor(white);c.ellipse(-47,-10,-15,10,fill=1);c.ellipse(15,-10,47,10,fill=1);c.restoreState()

def jewel(c,x,y,kind='STAR',s=1):
 c.saveState();c.translate(x,y);c.scale(s,s);c.setStrokeColor(INK);c.setFillColor(HexColor('#d8e9df'));p=c.beginPath()
 for i,pt in enumerate([(-21,0),(-12,16),(12,16),(21,0),(0,-18)]):
  (p.moveTo if i==0 else p.lineTo)(*pt)
 p.close();c.drawPath(p,fill=1)
 if kind=='BUBBLE':
  c.circle(-5,3,3);c.circle(7,-2,2)
 c.setFillColor(INK);c.setFont('Helvetica-Bold',max(11/s,11));c.drawCentredString(0,-18-13/s,kind);c.restoreState()

def sleeve(b):
 c=b.c;w=180*MM;h=90*MM;x=(b.w-w)/2;y=b.y-h-15
 c.setStrokeColor(INK);c.setLineWidth(1);c.rect(x,y,w,h)
 c.setDash(6,4)
 for yy in [30,60]:c.line(x,y+yy*MM,x+w,y+yy*MM)
 c.setDash(2,3);c.rect(x+70*MM,y+36*MM,40*MM,18*MM);c.setDash()
 c.setFillColor(INK);c.setFont('Helvetica-Bold',11)
 c.drawCentredString(b.w/2,y+76*MM,'FOLD THIS FLAP BEHIND THE CENTRE BAND')
 c.drawCentredString(b.w/2,y+13*MM,'FOLD THIS FLAP BEHIND THE CENTRE BAND')
 c.setFont('Helvetica-Bold',10);c.drawCentredString(b.w/2,y+44*MM,'CUT WINDOW')
 c.rect(x+8*MM,y+40*MM,43*MM,10*MM);c.drawString(x+11*MM,y+44*MM,'FRONT SEAL')
 b.y=y-25
 b.p('Solid outline: cut the outer sleeve. Long dashes: fold backwards. Small dots: cut only the window. The centre band remains the fixed front frame.',11)

def player(paper):
 b=Book(paper,'players',13)
 b.page('The Midnight Masquerade','ADULT PREPARES / PLAYERS INVESTIGATE TOGETHER')
 b.p(DATA['opening'],13);b.box('Your mission','Identify the operator, establish the interval, explain the untouched front seal, recover the genuine jewel, and support the whole case with named evidence.')
 b.box('Before play','An adult reads the separate guide and prepares six round packets plus one hidden ending. Print this 13-page Player Pack and the three 3-page role packs in ONE matching paper size: 22 player pages total. Keep this page and pages 2-4 available from the start. Hold pages 5-13 until their round; page 13 is the ending.')
 b.box('Working together','Three readers take portfolios A, B and C. For four to six players, pair readers within the three portfolios. With two, one takes A+B and the other C; switch responsibility each round. Rotate roles. Read your current private card first, hide it, then describe what you know. Showing a card for reading or access support is welcome.')
 b.p('Ages 9+ design target / 3-6 players plus adult host; 2 supported / play duration unmeasured. No player acts the culprit or invents evidence. Hints and assisted completion are allowed.',11)
 b.page('The six guests','G-01 / CUT SIX OUTER PORTRAIT CARDS')
 b.p('These are story characters, not player roles. Match mask, name and clothing mark; do not use colour alone.',11)
 top=b.y
 for i,g in enumerate(DATA['guests']):
  x=43+(i%2)*255;y=top-80-(i//2)*165;c=b.c;c.setStrokeColor(INK);c.setDash(3,3);c.rect(x-6,y-68,244,154);c.setDash();mask(c,g['mask'],x+115,y,.65);c.setFillColor(INK);c.setFont('Helvetica-Bold',13);c.drawCentredString(x+115,y-42,g['id']+' / '+g['mask']);c.setFont('Helvetica',11);c.drawCentredString(x+115,y-58,g['mark'])
 b.page('Seats around the dance floor','G-02 / START WITH SEAT 1 BESIDE THE ENTRANCE')
 b.p('Use A1, B1 and C1. Place or point to the guest cards beside the numbered seats. Keep the checked board: later records use masks, seat numbers and names.',11)
 c=b.c;cx=b.w/2;cy=b.y-210;c.setStrokeColor(INK);c.setFillColor(PALE);c.ellipse(cx-106,cy-95,cx+106,cy+95,fill=1)
 c.setFillColor(INK);c.setFont('Helvetica-Bold',13);c.drawCentredString(cx,cy,'CLOCKWISE SEAT NUMBERS');c.drawCentredString(cx,cy+195,'ENTRANCE / SEAT 1')
 for i in range(6):
  a=math.radians(90-i*60);x=cx+170*math.cos(a);y=cy+155*math.sin(a);c.setFillColor(white);c.circle(x,y,23,fill=1);c.setFillColor(INK);c.setFont('Helvetica-Bold',15);c.drawCentredString(x,y-5,str(i+1));c.line(x-48,y-42,x+48,y-42)
 b.y=cy-230;b.p('The entrance is fixed at the top. Opposite seats are three seat numbers apart. Do not rotate the board to fit a clue.',11)
 b.page('Shared case notebook','SAVE CHECKED FINDINGS; KEEP ALL EVIDENCE')
 for label in ['1 / Seat order: 1, 2, 3, 4, 5, 6','2 / Event order, interval, method and transport','3 / Three pairwise overlaps and provisional suspect','4 / Valid note, its checks, destination mark','5 / Container and all three matching properties','6 / Complete case chain and evidence references']:b.line(label)
 b.p('Record facts before drawing conclusions. A single record can leave alternatives. Motive and authorship of an invalid note are not facts unless evidence establishes them.',11)
 b.page('2 / The sealed display','E-01 / CUT THREE EVENT CARDS AND ONE SEAL CERTIFICATE')
 b.p(DATA['stages'][1]['lead'],12)
 for cue in DATA['cues']:b.box(cue['id']+' / EVENT CUE',cue['text'],cut=True)
 b.box('E-02 / FRONT-FRAME SEAL CERTIFICATE','The front-frame seal was checked before and after all three event cues. It stayed intact. This certificate concerns the FRONT frame; compare it with the access manual in C2.',cut=True)
 b.p('Put the event cards in order. Ask A for the first underside inspection, B for the second, and C how the display works. Next, use the optional paper model on pages 6-7 or follow the no-cut illustration.',11)
 b.line('What changed between the inspections?');b.line('What does an intact FRONT seal establish?')
 b.page('Paper display sleeve','OPTIONAL MODEL / ADULT CUTS WINDOW')
 b.p('Print at 100% with the matching strip on page 7. Cut the solid outer rectangle. An adult cuts the small-dotted window, then folds both flaps behind the centre band. Hold the frame lightly; do not tape or seal the moving strip.',11)
 sleeve(b)
 b.box('How to use','Place page 7 strip between the centre band and the folded-back flaps. Align STAR in the window. Move the strip 50 mm left to show BUBBLE. The FRONT SEAL on the fixed frame does not change. This models the rear insert described in C2; it is not evidence about who operated it.')
 b.box('No-cut play','Keep this sheet whole. Read C2 and compare the two insert pictures on page 7. The complete case has the same answers without cutting or folding.')
 b.page('Two-position insert strip','ONE STRIP / KEEP THE TWO JEWEL VIEWS CONNECTED')
 b.p('Cut the outer strip. Do not cut between the two pictures. Match STAR to the sleeve window first, then slide 50 mm left. The strip may protrude from one end: that is the grip.',11)
 w=170*MM;h=25*MM;x=(b.w-w)/2;y=b.y-h-12;c=b.c;c.setStrokeColor(INK);c.rect(x,y,w,h)
 for center,kind in [(60,'STAR'),(110,'BUBBLE')]:jewel(c,x+center*MM,y+13*MM,kind,.58)
 b.y=y-30;b.c.setStrokeColor(INK);b.c.line(50,b.y-10,50+50*MM,b.y-10);b.c.line(50,b.y-5,50,b.y-15);b.c.line(50+50*MM,b.y-5,50+50*MM,b.y-15);b.y-=32
 b.p('Calibration: the line above must measure 50 mm. The centres of the two pictures are 50 mm apart. Check actual-size printing if the window does not line up.',10.5)
 b.p('No-cut comparison: the front frame is the same in both views.',12,True)
 for i,kind in enumerate(['STAR','BUBBLE']):
  xx=52+i*270;yy=b.y-160;c.setStrokeColor(INK);c.rect(xx,yy,235,145);c.rect(xx+10,yy+63,50,25);c.setFont('Helvetica-Bold',9);c.drawString(xx+13,yy+72,'SEAL');jewel(c,xx+145,yy+76,kind,1);c.setFont('Helvetica',10);c.drawString(xx+10,yy+13,'Same front frame / different insert')
 b.page('3 / Compare three records','I-01 / FILL FROM A3, B3 AND C3')
 b.p(DATA['stages'][2]['lead'],12)
 b.table(['Guest','Gallery / A3','Rear / B3','Trolley / C3'],[[g['id'],'','','']for g in DATA['guests']])
 for label in ['Gallery + rear panel: two possible people','Gallery + trolley: two possible people','Rear panel + trolley: two possible people','All three: provisional suspect']:b.line(label)
 b.page('4 / Two transfer notes','N-00 / A AND B CHECK NOTES; C PREPARES STORAGE IN PARALLEL')
 b.p(DATA['stages'][3]['lead'],12)
 b.table(['Check','N1','N2'],[['Batch','',''],['Seal dots','',''],['Receiver signature','',''],['All required checks pass?','',''],['Destination','','']])
 b.line('Which source tells you the current validity rules?');b.line('Valid note and reliable destination mark');b.line('Why the other note cannot be trusted')
 b.box('While the notes are checked','C4 holds the container inventory. C can sketch it onto page 10 while A and B inspect the paperwork. The target lining and shelf remain in the next round packet. Do not open B5 or C5 early.')
 b.page('5 / Storage inventory','S-00 / C4 SUPPLIES PROPERTIES; A, B AND C SUPPLY TARGET CLUES')
 b.p(DATA['stages'][4]['lead'],12)
 b.table(['Container','Symbol','Lining','Shelf'],[[r['name'],'','','']for r in DATA['containers']])
 for label in ['Reliable mark from validated note','Target lining from packing record','Target shelf from observation','Container satisfying ALL THREE']:b.line(label)
 b.p('Any two clues may still leave alternatives. Explain why each other container fails before opening the recovery card with its STAR hallmark.',11)
 b.page('6 / Reconstruct the exchange','F-01 / EACH LINK NEEDS EVIDENCE')
 b.p(DATA['stages'][5]['lead'],11)
 for label in ['PERSON / name and the three identity records','INTERVAL / both inspection endpoints','METHOD / how the frame stayed sealed','TRANSPORT / attendant observation','HIDING PLACE / validated note and two storage observations']:b.line(label)
 b.p('Keep R-01 from page 12 available. Return the jewel only after the chain is checked. The square below holds the recovery token. If using the paper display, slide STAR back into its window.',11)
 b.c.setStrokeColor(INK);b.c.setDash(4,3);b.c.rect(42,b.y-35*MM,45*MM,35*MM);b.c.setDash();b.c.setFont('Helvetica-Bold',11);b.c.drawString(195,b.y-30,'DAWN JEWEL / RESERVED PLACE')
 b.page('R-01 / Recovered Dawn Jewel','RECOVERY / RELEASE AFTER ROUND 5, BEFORE ROUND 6')
 b.p('The team opens the Music box after checking MOON, FELT and LOWER. This is the recovered object. Inspect its underside: the STAR hallmark matches the genuine-jewel standard in A2.',12)
 b.box('Before opening this card','The adult checks the round-5 finding first. Release this page now; keep the separate confession and certificate on page 13 hidden until round 6 is complete.')
 x=50;y=b.y-100;c=b.c;c.setStrokeColor(INK);c.setDash(3,3);c.rect(x,y,40*MM,28*MM);c.setDash();jewel(c,x+20*MM,y+15*MM,'STAR',.9);b.y=y-24
 b.p('Cut only the token outline if using cut play. Keep this recovery sheet with the evidence. In no-cut play, point to the STAR token instead.',11)
 b.line('How does A2 establish that this is genuine?')
 b.p('Keep R-01 available during the final reconstruction. Place the token in the reserved space on page 11 after the complete case is checked.',11)
 b.page('The unveiling can begin','ENDING / ADULT KEEPS HIDDEN UNTIL SIX FINDINGS ARE CHECKED')
 b.p(DATA['ending'],12)
 b.p('Return the R-01 token from page 12 to the reserved space on page 11. Restore STAR in the sleeve, or point to its STAR view in no-cut play. Read this admission only now; motive was never a required guess.',11)
 b.p('CASE CLOSED / Everyone contributed a piece of the truth.',13,True);b.line('Awarded to the investigation team');b.line('Date')
 for i,g in enumerate(DATA['guests']):mask(c,g['mask'],65+i*96,94,.43)
 b.finish()

def role_pack(paper,role):
 b=Book(paper,'role-'+role,3)
 for page in range(3):
  b.page(role+' / '+DATA['roles'][role],'PRIVATE PORTFOLIO / ADULT CUTS AND SORTS BY ROUND')
  b.p('Do not hand this whole sheet to a player. Cut its two cards, then place each in the matching round packet. Reveal only the current card. Keep earlier cards for later comparisons.',10.5)
  top=b.y
  for offset in range(2):
   item=DATA['cards'][role][page*2+offset];y=top-offset*295;c=b.c;c.setStrokeColor(INK);c.setDash(3,3);c.rect(32,y-275,b.w-64,280);c.setDash();b.y=y-8
   b.p(item['id']+' / ROUND '+str(item['round'])+' / '+item['title'],13,True,x=43,width=b.w-86)
   b.p({1:'GUEST BRIEF',2:'INSPECTION / ACCESS RECORD',3:'WITNESS / MOVEMENT LOG',4:'TRANSFER DESK / INVENTORY',5:'STORAGE EVIDENCE',6:'TEAM EVIDENCE REVIEW'}[item['round']],9,True,gap=8,x=43,width=b.w-86)
   if item['id']=='B4':
    yy=b.y-133;col=(b.w-106)/2
    for i,n in enumerate(DATA['documents']):
     xx=43+i*(col+20);c.setFillColor(PALE);c.rect(xx,yy,col,130,fill=1);c.setFillColor(INK);c.setFont('Helvetica-Bold',12);c.drawString(xx+9,yy+111,n['id']+' / batch '+n['batch']);c.setFont('Helvetica',11);c.drawString(xx+9,yy+89,'Receiving signature:');c.setFont('Helvetica-Oblique',12);c.drawString(xx+120,yy+89,'Eden');c.setFont('Helvetica',11)
     c.drawString(xx+9,yy+66,'Seal:')
     for j in range(n['dots']):c.circle(xx+55+j*16,yy+70,4,fill=1)
     c.drawString(xx+9,yy+41,'Destination:');c.setFont('Helvetica-Bold',11);c.drawString(xx+9,yy+22,n['destination'])
    b.y=yy-13
   elif item['id']=='C4':b.table(['Container','Mark','Lining','Shelf'],[[r['name'],r['symbol'],r['lining'],r['shelf']]for r in DATA['containers']],compact=True)
   else:[b.p(part,11 if item['id']=='C2' else 11.5,gap=7,x=43,width=b.w-86) for part in item['text'].split('\n\n')]
   b.p('Ask the others: '+item['prompt'],10.5,True,x=43,width=b.w-86)
   if b.y<y-266:raise ValueError('Private card crossed cut boundary: '+item['id'])
   if b.y>y-210:
    c.setFillColor(INK);c.setFont('Helvetica',10);c.drawString(43,y-221,'My short message to the team (optional):');c.setStrokeColor(HexColor('#b8acbe'));c.line(43,y-241,b.w-43,y-241);c.line(43,y-259,b.w-43,y-259)
 b.finish()

def setup(paper):
 b=Book(paper,'setup',3)
 b.page('Start here / adult preparation','NO SOLUTIONS / KEEP THIS MAP BESIDE YOU')
 b.p('One adult host plus 3-6 investigation players is recommended. Two-player play is supported with the same adult host. The host reads the solutions; the players discover them.',12)
 for title,body in [
  ('1 / CHOOSE ONE PAPER SIZE','Use all A4 files OR all Letter files. Print single-sided at 100%, not fit-to-page. Player Pack: 13 sheets. Roles A, B, C: 3 sheets each. Total: 22 player sheets.'),
  ('2 / CHOOSE YOUR PREPARATION MODE','STANDARD: cut 18 role cards and the marked props; sort them by round. NO-CUT: keep sheets whole, cover future cards with spare paper and uncover only the current card. Use the two printed insert views instead of assembling the sleeve.'),
  ('3 / SORT BEFORE PLAY','Use the packet labels on the next page. Keep R-01 / Player page 12 separate until round 5 is checked. Keep the confession / page 13 hidden until round 6 is checked. Never give an entire private role sheet to a player.'),
  ('4 / START THE INVESTIGATION','Put Player pages 1-4 on the table. Give A1, B1 and C1 to their readers. Read the opening on Player page 1. Use the Adult Guide to check findings and release one packet at a time.')]:b.box(title,body)
 b.p('The 8-page Adult Guide may stay on the host\'s screen. This 3-page map may also stay on screen; printing its packet-label page is optional. Paper, pencil and adult-handled scissors are enough. No envelopes are required: use labelled piles or folders.',11)
 b.p('Offline browser aid: extract the WHOLE ZIP, then open companion.html on a desktop browser. Keep the PDFs beside it. Phone handling of downloaded HTML varies; paper play uses the Adult Guide throughout.',11)
 b.page('Packet labels / keep in order','OPTIONAL CUTTING / SEVEN LABELS, NO EXTRA GAME PIECES REQUIRED')
 packets=[('START / ROUND 1','Player pages 1-4 + A1 / B1 / C1'),('ROUND 2','Player pages 5-7 + A2 / B2 / C2'),('ROUND 3','Player page 8 + A3 / B3 / C3; retain seating board and C2'),('ROUND 4','Player pages 9-10 + A4 / B4 / C4'),('ROUND 5','A5 / B5 / C5; reuse page 10, C4 and valid note. After check: page 12 / R-01'),('ROUND 6','Player page 11 + A6 / B6 / C6; retain R-01 and earlier evidence'),('ENDING / KEEP HIDDEN','Player page 13; release only after the complete round-6 case is checked')]
 for title,body in packets:b.box(title,body,cut=True)
 b.page('Your table / your paper display','SETUP EXAMPLE / KEEP FUTURE EVIDENCE WITH THE HOST')
 b.p('Place private cards beside their readers. Keep the seating board and case notebook in the shared centre. The adult host keeps future packets and the confession away from players.',11)
 c=b.c;top=b.y;cx=b.w/2
 for x,y,w,h,label in [(38,top-60,b.w-76,52,'HOST / future packets + Adult Guide'),(38,top-195,110,105,'A / private'),(b.w-148,top-195,110,105,'B / private'),(165,top-195,b.w-330,105,'SHARED / board'),(165,top-260,b.w-330,48,'C / private')]:
  c.setFillColor(PALE);c.setStrokeColor(INK);c.roundRect(x,y,w,h,5,fill=1);c.setFillColor(INK);c.setFont('Helvetica-Bold',10);c.drawCentredString(x+w/2,y+h/2,label)
 b.y=top-282
 b.p('Optional sleeve / three steps',15,True)
 # Diagram keeps cut, fold and slide operations separate and visible.
 for i,label in enumerate(['1 CUT + WINDOW','2 FOLD BACK','3 SLIDE LEFT']):
  x=40+i*178;y=b.y-72;c.setStrokeColor(INK);c.setFillColor(white);c.rect(x,y,156,55,fill=1);c.rect(x+65,y+20,35,16);c.setFont('Helvetica-Bold',10);c.setFillColor(INK);c.drawString(x,y-16,label)
  if i==0:
   c.setDash(4,3);c.line(x,y+18,x+156,y+18);c.line(x,y+38,x+156,y+38);c.setDash()
  if i==1:
   for yy in [y+8,y+47]:c.line(x+20,yy,x+55,yy);c.line(x+55,yy,x+47,yy+4)
  if i==2:c.line(x+135,y+28,x+105,y+28);c.line(x+105,y+28,x+113,y+33)
 b.y-=115
 b.p('Cut the sleeve outline and dotted window on page 6. Fold BOTH long-dashed flaps behind the middle band. Keep the strip on page 7 connected. Insert it behind the middle band; hold lightly. Align STAR, then move the strip 50 mm left to show BUBBLE. The fixed FRONT SEAL stays unchanged.',11)
 b.p('Measure the 50 mm line on Player page 7 before assembly. If the sleeve catches, ease your grip and check folds and actual-size printing. No-cut mode: compare the two whole printed views; all answers stay the same.',11)
 b.finish()

def guide(paper):
 b=Book(paper,'guide',8)
 b.page('Adult Guide','SPOILERS / READ BEFORE PRINTING OR HANDING OUT MATERIALS')
 b.box('Files and print plan','Choose A4 OR Letter. Print the 13-page Player Pack plus the three 3-page A/B/C portfolios: 22 player pages. The 8-page guide can stay on screen. Keep Player page 13 and all later private cards away from players until needed. Print single-sided at 100%, never two pages per sheet.')
 b.box('Exact full-cut inventory','18 private role cards; 6 guest portraits from Player page 2; 3 event cues and 1 seal certificate from page 5; 1 connected sleeve from page 6; 1 connected strip from page 7; 1 recovery jewel token from page 12: 31 game pieces total. Seven optional packet labels are extra. Also cut the sleeve window. Fold both flaps backwards. Do not cut the strip in half. No tape is needed.')
 b.box('No-cut and reading support','Leave sheets whole and cover future private cards while the named reader looks. Compare the two printed insert views on page 7 rather than operating the sleeve. Point to portraits and write seat names. Point to the ending token instead of cutting it. All case answers are unchanged. Adults may read a private card aloud quietly, or allow it to be shown.')
 b.p('Printed sleeve: 180 x 90 mm; centre band 30 mm high; window 40 x 18 mm. Strip: 170 x 25 mm, with picture centres 50 mm apart. Ending token: 40 x 28 mm, fitting a 45 x 35 mm reserved place. File geometry has been designed digitally; physical print/cut performance and family playtests remain unverified.',10.5)
 b.page('Round packets and hosting')
 b.table(['Round','Give out'],[['Start / 1','Player pages 1-4 and A1/B1/C1. Keep page 13 hidden.'],['2','Pages 5-7 and A2/B2/C2. Rotate portfolios.'],['3','Page 8 and A3/B3/C3. Retain the seating board and C2.'],['4 / parallel','Page 9, page 10 for preparation, and A4/B4/C4. C explores inventory while A/B validate notes.'],['5 / combine','A5/B5/C5, page 10, C4 and validated note. AFTER checking: page 12 / R-01.'],['6','Page 11 and A6/B6/C6. Keep R-01 and earlier evidence available.'],['Ending','Only after the complete chain: Player page 13.']],[105,b.w-181],compact=True)
 b.box('Distribute fairly','One adult host prepares and checks findings; this host is additional to the player count. 3 players: one portfolio each. 4-6: pair readers in three portfolios. 2: one takes A+B, one C, then swap responsibility every round. In each pair, one reads and reports; the other records and checks. Swap these duties each round. Rotate Reader/Recorder/Checker duties. Nobody plays the culprit, lies or improvises facts. Spoken sharing is the default; accessibility support may include showing a card.')
 b.box('Recovery and pacing','Give one hint at a time. Accept equivalent spoken explanations offline if all required facts agree. A copied answer without the source is not a full explanation. If stuck, explain the solution and continue; the story has no timed failure. Do not advertise a measured duration before a real first-time playtest.')
 for i,s in enumerate(DATA['stages']):
  b.page(str(i+1)+' / '+s['title'],'HOST SCRIPT / SOLUTION AND PROGRESSIVE HELP')
  b.p('Read aloud',11,True);b.p(s['lead'],11.5);b.p('Accepted finding and reasoning',11,True);b.p(s['solution'],11.5)
  for n,h in enumerate(s['hints']):b.p('Hint '+str(n+1)+': '+h,11)
  if i==0:b.p('Opposite seats differ by three. Clockwise is fixed by the numbered board. Test the children’s full six-place arrangement, not merely Iris’s seat.',11)
  if i==1:b.p('The three opportunity requirements are justified by C2: one operator, no handover, six-guest closed set and actual identity checks. Without those facts, separate helpers or borrowed credentials would be an unsupported alternative.',11)
  if i==2:b.p('Require the three pairwise overlaps as well as Iris. This is a provisional identity result, not permission to open the ending. Any two records alone leave a different second candidate.',11)
  if i==3:b.p('Do not conclude that Iris wrote the invalid note from its stamp alone. C’s inventory work runs in parallel here; do not release the target packing/shelf observations until round 5.',11)
  if i==4:b.p('Reopen C4 if the group has put the inventory away. Moon+felt leaves Music box/Mask drawer; moon+lower leaves Music box/Portrait box; felt+lower leaves Music box/Violin case. Release R-01 (Player page 12) NOW and inspect STAR. Keep page 13 hidden.',11)
  if i==5:b.p('Check A3+B3+C3 for person; A2+B2 for interval; C2 for method/transport; valid N2+B5+C5 using C4 for hiding place. Do not score an unknown motive. Give the ending, return the STAR token and invite each child to explain one piece of evidence.',11)
  b.p('After checking',11,True);b.p(s['reward'],11)
 b.finish()

manifest={'id':DATA['id'],'version':2,'title':DATA['title'],'status':'local_development_review','price':DATA['price'],'physicalPlaytest':False,'printPagesPerFormat':{'players':13,'setup':3,'role-A':3,'role-B':3,'role-C':3,'guide':8},'files':[]}
for paper in ['A4','Letter']:
 player(paper)
 setup(paper)
 for r in 'ABC':role_pack(paper,r)
 guide(paper)
 for role,n in manifest['printPagesPerFormat'].items():
  f=OUT/f'{paper}-{role}.pdf';pdf=PdfReader(f);assert len(pdf.pages)==n
  expected=A4 if paper=='A4'else letter
  for p in pdf.pages:assert abs(float(p.mediabox.width)-expected[0])<.1 and abs(float(p.mediabox.height)-expected[1])<.1
  manifest['files'].append({'paper':paper,'role':role,'path':f.name,'pages':n,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');print(json.dumps(manifest,indent=2))

