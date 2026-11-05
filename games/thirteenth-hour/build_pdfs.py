"""Original same-scale paper mechanisms and complete offline case."""
import json,math,hashlib
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.lib.colors import HexColor,white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2];D=json.loads((Path(__file__).parent/'game.json').read_text(encoding='utf8'));OUT=ROOT/'output/private/thirteenth-hour';OUT.mkdir(parents=True,exist_ok=True)
MM=72/25.4;INK=HexColor('#193b3c');GOLD=HexColor('#a87a36');PALE=HexColor('#e9ecdf')
class Book:
 def __init__(self,paper,role,total):
  self.paper=paper;self.role=role;self.total=total;self.w,self.h=A4 if paper=='A4'else letter;self.n=0;self.c=canvas.Canvas(str(OUT/f'{paper}-{role}.pdf'),pagesize=(self.w,self.h),invariant=1);self.c.setTitle(D['title']+' / '+role)
 def page(self,title,kicker='CASE 09 / KEEP THE THREE SCENES'):
  if self.n:self.c.showPage()
  self.n+=1;c=self.c;c.setFillColor(INK);c.setStrokeColor(INK);c.setLineWidth(.6);c.setFont('Helvetica-Bold',9);c.drawString(38,self.h-30,'PAPER ADVENTURE / THE CLOCKMAKER');c.line(38,self.h-42,self.w-38,self.h-42);c.setFont('Helvetica',8);c.drawString(38,25,'Original case 09 / v2 / (c) 2026 Paper Adventure Workshop');c.drawRightString(self.w-38,25,f'{self.paper} / {self.role.upper()} / {self.n} OF {self.total}');self.y=self.h-63;self.p(kicker,9,True);self.p(title,24,True,gap=18)
 def p(self,text,size=11.5,bold=False,gap=11,x=38,width=None):
  p=Paragraph(escape(text),ParagraphStyle('p',fontName='Helvetica-Bold'if bold else'Helvetica',fontSize=size,leading=size*1.38,textColor=INK));_,h=p.wrap(width or self.w-76,1000)
  if self.y-h<47:raise ValueError(f'Overflow {self.paper} {self.role} page{self.n}: {text[:65]}')
  p.drawOn(self.c,x,self.y-h);self.y-=h+gap
 def box(self,title,text):
  self.c.setFillColor(PALE);self.c.rect(34,self.y-17,self.w-68,22,fill=1,stroke=0);self.p(title,11.5,True);self.p(text,11);self.y-=5
 def line(self,title,space=37):
  self.p(title,11,True,gap=4);self.c.setStrokeColor(INK);self.c.line(38,self.y-18,self.w-38,self.y-18);self.y-=space
 def table(self,heads,rows):
  widths=[(self.w-76)/len(heads)]*len(heads)
  for i,row in enumerate([heads]+rows):
   cells=[Paragraph(escape(str(t)),ParagraphStyle('t',fontName='Helvetica-Bold'if i==0 else'Helvetica',fontSize=10.5,leading=14,textColor=INK))for t in row];hs=[p.wrap(w-12,1000)[1]for p,w in zip(cells,widths)];rh=max(hs)+13
   if self.y-rh<48:raise ValueError('Table overflow')
   if i==0:self.c.setFillColor(PALE);self.c.rect(38,self.y-rh,self.w-76,rh,fill=1,stroke=0)
   x=38
   for p,w,h in zip(cells,widths,hs):p.drawOn(self.c,x+6,self.y-6-h);x+=w
   self.c.setStrokeColor(INK);self.c.line(38,self.y-rh,self.w-38,self.y-rh);self.y-=rh
  self.y-=16
 def finish(self):assert self.n==self.total;self.c.save()
def label(c,x,y,text,size=11,bold=False):
 c.setFillColor(INK);c.setFont('Helvetica-Bold'if bold else'Helvetica',size);c.drawCentredString(x,y,text)
def face(c,x,y,n,r=12*MM):
 c.setStrokeColor(INK);c.setFillColor(white);c.circle(x,y,r,fill=1);c.setLineWidth(1)
 for i in range(12):
  a=math.radians(90-i*30);c.line(x+math.cos(a)*r*.9,y+math.sin(a)*r*.9,x+math.cos(a)*r*.75,y+math.sin(a)*r*.75)
 a=math.radians(90-n*30);c.setLineWidth(2);c.line(x,y,x+math.cos(a)*r*.63,y+math.sin(a)*r*.63);c.circle(x,y,1.8,fill=1);c.setFillColor(white);c.rect(x-11,y-r*.8,22,14,fill=1,stroke=0);label(c,x,y-r*.7,str(n),11,True);c.setLineWidth(.6)
def origin(b,height):return (b.w-180*MM)/2,b.y-height*MM-14
def cutrect(c,x,y,w,h):c.setStrokeColor(INK);c.setLineWidth(1);c.rect(x,y,w,h)
def foldline(c,x1,y1,x2,y2):c.setDash(6,4);c.line(x1,y1,x2,y2);c.setDash()

def players(paper):
 b=Book(paper,'players',12);b.page("The Clockmaker's Thirteenth Hour",'PLAYERS / ADULT PREPARES THE PAPER SCENES')
 b.p(D['opening'],12.5);b.box('Your shared mission','Repair the lamp and drive, return to scenes that change, then satisfy the special chime release. Preserve each checked finding. The earlier cabinet-opening code and the later pin settings serve different purposes.')
 b.box('Before you begin','One adult host plus 2-5 players. Age 9+ provisional; duration unmeasured. Choose ONE paper size AND mode. Standard: print 1-9,11-12 (11 sheets). No-cut: print 1,2,4,6,7,9,10,11,12 (9 sheets), plus three spare opaque cover sheets. Read the 8-page Adult Guide privately. Single-sided at 100%. No glue, brad, tape or real clock.')
 b.box('Keep the workshop on the table','Scenes: bench 2, cabinet 4, and wall 3 with strip 5 in standard mode OR labelled views 10 in no-cut mode. Page 9 is the record; 8 is backing only. Reveal one mission from 11 at a time. Keep drive parts until round 3 passes, and ending 12 until the final check. The drive-parts cabinet is a story handover, separate from the striking cabinet on page 4.')
 b.box('Share the work','Rotate reader, operator and recorder after each round. Two players combine duties. Everyone may inspect shared evidence. There are no hidden traitors or invented clues. Ask for one hint at a time; assisted completion is welcome.')
 b.p('The paper game is complete with its Adult Guide. The optional offline companion checks findings and mirrors scene changes. Physical assembly and independent family playtests remain unverified.',10.5)

 b.page('W-01 / The workbench','SCENE 1 / KEEP THE LAMP PANEL FOLDED BEHIND UNTIL ROUND 2')
 b.p('Cut the large rectangle only. Fold the RIGHT half behind the LEFT half at the long-dashed line. After the host checks round 1, unfold it. Join the old bench line to the newly revealed lamp section.',11)
 x,y=origin(b,90);c=b.c;cutrect(c,x,y,180*MM,90*MM);foldline(c,x+90*MM,y,x+90*MM,y+90*MM);label(c,x+45*MM,y+78*MM,'BENCH / OLD LINE',11,True);label(c,x+135*MM,y+78*MM,'LAMP / REVEALED LINE',10,True)
 # Original workshop detail stays outside the evidence arrow and cut lines.
 c.setStrokeColor(GOLD);c.setLineWidth(1.4);c.line(x+7*MM,y+24*MM,x+82*MM,y+24*MM)
 for leg in [13,76]:c.line(x+leg*MM,y+24*MM,x+leg*MM,y+17*MM)
 c.circle(x+17*MM,y+62*MM,5*MM)
 for i in range(8):
  a=i*math.pi/4;c.line(x+(17+4*math.cos(a))*MM,y+(62+4*math.sin(a))*MM,x+(17+6*math.cos(a))*MM,y+(62+6*math.sin(a))*MM)
 c.line(x+164*MM,y+61*MM,x+164*MM,y+71*MM);c.line(x+157*MM,y+61*MM,x+171*MM,y+61*MM);p=c.beginPath();p.moveTo(x+159*MM,y+73*MM);p.lineTo(x+169*MM,y+73*MM);p.lineTo(x+173*MM,y+66*MM);p.lineTo(x+155*MM,y+66*MM);p.close();c.setFillColor(PALE);c.drawPath(p,fill=1);c.setStrokeColor(INK)
 c.setLineWidth(3);c.line(x+25*MM,y+45*MM,x+90*MM,y+45*MM);c.line(x+90*MM,y+45*MM,x+156*MM,y+45*MM);c.line(x+156*MM,y+45*MM,x+143*MM,y+57*MM);c.line(x+156*MM,y+45*MM,x+143*MM,y+33*MM);c.setLineWidth(.6);label(c,x+45*MM,y+13*MM,'Keep this part visible.',10);label(c,x+135*MM,y+13*MM,'Unfold; follow the complete arrow.',9)
 b.y=y-23;b.p('T-01 / Lamp ticket: SQUARE socket, TWO teeth, turn LEFT.',12,True)
 b.table(['Tool','Socket','Teeth / turn'],[[t['id'],t['socket'],str(t['teeth'])+' / '+t['turn']]for t in D['tools']]);b.p('Select by all three ticket features. The tool TURN arrow operates the lamp lock; the joined W-01 arrow is a separate instruction for mounting the drive.',11)

 b.page('C-01 / The clock wall','SCENE 2 / KEEP THE SAME WALL THROUGH BOTH STATES')
 b.p('Adult cuts the outer frame and three small-dotted windows. Keep this frame FLAT: do not fold its top or bottom. Place the connected strip from page 5 underneath it. Align the top row in the windows; BEFORE / DRIVE OFF protrudes below. Hold the narrow side margins lightly.',11)
 x,y=origin(b,110);c=b.c;cutrect(c,x,y,180*MM,110*MM)
 for xx,name in [(35,'Copper'),(90,'Porcelain'),(145,'Wood')]:
  c.setDash(2,3);c.rect(x+(xx-14)*MM,y+41*MM,28*MM,28*MM);c.setDash();label(c,x+xx*MM,y+73*MM,name,11,True);label(c,x+xx*MM,y+53*MM,'CUT WINDOW',8)
 label(c,x+90*MM,y+95*MM,'FIXED FRONT / KEEP FLAT',11,True);label(c,x+90*MM,y+13*MM,'HOLD SIDE MARGINS / SLIDE STRIP BEHIND',10,True)
 b.y=y-25;b.box('After the drive passes its check','Move the same strip UP 45 mm. Stop when all three new faces are centred and AFTER / DRIVE ON protrudes above the frame. The old faces are now covered by the frame. Do not turn the strip upside down or replace it with another sheet.')
 b.box('No-cut alternative','Use the separate no-cut views on page 10, not the grip labels on page 5. Initially show only BEFORE. After round 4, cover BEFORE and show AFTER at the same table position.')

 b.page('S-01 / The striking cabinet','SCENE 3 / SERVICE EXTENSION STAYS FOLDED UNTIL ROUND 6')
 b.p('Cut the connected cabinet rectangle. Fold the RIGHT 60 mm panel behind the main cabinet at the long-dashed line. Its visible edge is a service extension. Do not open it until the host checks all three release conditions. Do not cut this extension off.',11)
 x,y=origin(b,110);c=b.c;cutrect(c,x,y,180*MM,110*MM);foldline(c,x+120*MM,y,x+120*MM,y+110*MM);face(c,x+47*MM,y+79*MM,12,23*MM);label(c,x+94*MM,y+91*MM,'SERVICE',10,True);label(c,x+94*MM,y+83*MM,'EDGE >',10,True);label(c,x+94*MM,y+68*MM,'KEEP CLOSED',8)
 for yy,cl in [(41,D['clocks'][0]),(25,D['clocks'][1]),(9,D['clocks'][2])]:
  label(c,x+10*MM,y+(yy+3)*MM,cl['letter'],11,True)
  for n in range(12):c.rect(x+(24+n*7)*MM,y+yy*MM,7*MM,9*MM);label(c,x+(27.5+n*7)*MM,y+(yy+3)*MM,str(n+1),10)
 label(c,x+150*MM,y+93*MM,'SERVICE',11,True);label(c,x+150*MM,y+85*MM,'EXTENSION',11,True);c.circle(x+150*MM,y+60*MM,18*MM);label(c,x+150*MM,y+57*MM,'13',34,True);label(c,x+150*MM,y+27*MM,'SPECIAL CHIME',10,True);label(c,x+150*MM,y+18*MM,'Not an everyday hour.',9)
 b.y=y-25;b.p('Use C, P and W markers from page 7, pointing at the chosen numbers; or circle the settings in pencil. Keep the three tracks blank until round 5. Use the loose pointer to point to 12 before the final release, then to 13 after opening.',11)
 b.box('Release conditions','Drive setting proven from the workbench and transfer register; CURRENT pins proven from the changed wall and correction record; AFTER / DRIVE ON state visible. The host checks each source before opening. The final letter is separate on page 12.')

 b.page('The connected wall strip','ADULT ASSEMBLES / R-01 CORRECTIONS REMAIN AVAILABLE')
 b.p('Cut ONE 160 x 90 mm strip. Do not separate the rows. Slide it behind page 3. The initial TOP row is BEFORE; after the drive is checked, slide the strip UP 45 mm to reveal the lower row. Exposed grip labels confirm each state. Keep future readings covered.',11)
 x=(b.w-160*MM)/2;y=b.y-90*MM-14;c=b.c;cutrect(c,x,y,160*MM,90*MM)
 for yy,st in [(70,'before'),(25,'after')]:
  for xx,cl in zip([25,80,135],D['clocks']):face(c,x+xx*MM,y+yy*MM,cl[st],12*MM)
 label(c,x+80*MM,y+5*MM,'ASSEMBLED GRIP: BEFORE / DRIVE OFF',10,True);label(c,x+80*MM,y+84*MM,'ASSEMBLED GRIP: AFTER / DRIVE ON',10,True)
 b.y=y-23;c.setStrokeColor(INK);c.line(48,b.y-4,48+45*MM,b.y-4);c.line(48,b.y-10,48,b.y+2);c.line(48+45*MM,b.y-10,48+45*MM,b.y+2);label(c,48+22.5*MM,b.y-19,'45 mm calibration / travel',10);b.y-=38
 b.p('R-01 / The correction record',14,True);b.table(['Test dial / fixed order','Positive offset','What to do'],[[cl['name']+' / '+cl['letter'],str(cl['fast'])+' hour'+(''if cl['fast']==1 else's'),'Subtract; wrap on 12']for cl in D['clocks']]);b.p('One hour before 1 is 12. Use Copper-Porcelain-Wood order. These independent test dials are not showing one shared real time. Their offsets stay the same after repair; the readings change. No-cut play uses the labelled views and duplicate R-01 on page 10; do not read this strip as a state card.',11)

 b.page('Drive cover / M-01 register','RELEASE ONLY AFTER ROUND 3 / CUT TWO WINDOWS')
 b.p('Cut the 180 x 100 mm cover and its two dotted windows. Put both page-7 wheels in the matching bays on page 8, then lay this cover over them, aligning outer corners. Hold the loose paper layers gently; no centre hole, brad or tape. Start at LEFT + MOON. Lift the cover to adjust one wheel, leave the other in its bay, then replace the cover. Check evidence and labels before bridge alignment.',11)
 x,y=origin(b,100);c=b.c;cutrect(c,x,y,180*MM,100*MM)
 for xx,title in [(45,'DIRECTION'),(135,'LOCATING MARK')]:
  c.setDash(2,3);c.rect(x+(xx-15)*MM,y+60*MM,30*MM,20*MM);c.setDash();label(c,x+xx*MM,y+88*MM,title,10,True);label(c,x+xx*MM,y+49*MM,'READ LABEL + BRIDGE',8)
 c.setLineWidth(2);c.line(x+60*MM,y+67*MM,x+120*MM,y+67*MM);c.setLineWidth(.6);label(c,x+90*MM,y+19*MM,'Level bridge must meet BOTH window edges.',10,True)
 b.y=y-25;b.p('M-01 / Transfer register',14,True);b.table(['Checked cabinet-opening code','Locating mark'],[[r['code'],r['mark']]for r in D['voucher']]);b.p('Use the joined W-01 mounting arrow for the direction wheel. Use the row matching your historical code for the locating wheel. The host checks both window labels and the continuous bridge before allowing the wall strip to move.',11)

 b.page('Two selection wheels / three pins','RELEASE ONLY AFTER ROUND 3 / CUT OUTLINES, NOT SECTORS')
 b.p('Cut each circular wheel as ONE piece. Rotate it below the matching window on page 6. A selected sector reads upright at the top. Host: rotate to LEFT and MOON before handing over; the printed RIGHT/LEAF orientation is NOT the starting setting. Keep the centres inside the page-8 bays; lift the cover to adjust if needed. Do not cut the internal sector lines.',11)
 c=b.c;cy=b.y-44*MM
 for cx,choices in [(b.w/2-47*MM,['RIGHT','LEFT','UP']),(b.w/2+47*MM,['LEAF','STAR','MOON'])]:
  c.setStrokeColor(INK);c.circle(cx,cy,40*MM);c.setDash(2,3)
  for angle in [30,150,270]:a=math.radians(angle);c.line(cx,cy,cx+40*MM*math.cos(a),cy+40*MM*math.sin(a))
  c.setDash()
  for i,choice in enumerate(choices):
   c.saveState();c.translate(cx,cy);c.rotate(i*120);label(c,0,31*MM,choice,11,True);delta=[0,5,-5][i];c.setLineWidth(2);c.line(-15*MM,(22+delta)*MM,15*MM,(22+delta)*MM);c.restoreState()
  c.setLineWidth(.6);c.setStrokeColor(INK);c.line(cx-3,cy,cx+3,cy);c.line(cx,cy-3,cx,cy+3)
 b.y=cy-47*MM;b.p('C / Copper, P / Porcelain, W / Wood',13,True);b.p('Cut three small pin markers. Place each arrow tip at its chosen number on the corresponding cabinet track. They do not need to fit inside the boxes. No-cut play: circle the numbers instead.',11)
 yy=b.y-17*MM
 for i,t in enumerate(['C','P','W']):
  xx=60+i*60*MM;c.rect(xx,yy,7*MM,14*MM);label(c,xx+3.5*MM,yy+9*MM,t,11,True);p=c.beginPath();p.moveTo(xx+1*MM,yy+6*MM);p.lineTo(xx+6*MM,yy+6*MM);p.lineTo(xx+3.5*MM,yy+1*MM);p.close();c.drawPath(p,fill=1)
 # A loose pointer deliberately avoids pretending to be a fastened clock hand.
 xx=b.w-150;c.rect(xx,yy,18*MM,25*MM);label(c,xx+9*MM,yy+19*MM,'POINTER',8,True);p=c.beginPath();p.moveTo(xx+9*MM,yy+2*MM);p.lineTo(xx+2*MM,yy+14*MM);p.lineTo(xx+16*MM,yy+14*MM);p.close();c.drawPath(p,fill=1);b.y=yy-25;b.p('Keep the pointer loose. Before the final check point to the normal 12 dial; only after the release point to the extension\'s 13 mark.',11)

 b.page('Wheel backing / assembly map','KEEP THIS PAGE SEPARATE FROM THE REPAIR RECORD ON PAGE 9')
 b.p('Lay the two wheel centres at the crosses in these bays. Add the page-6 cover, matching its corners to this rectangle. Wheel edges stay inside the bays. Hold with fingertips; rotate by lifting and replacing if sliding is difficult.',11)
 x,y=origin(b,100);c=b.c;cutrect(c,x,y,180*MM,100*MM)
 for xx,t in [(45,'DIRECTION'),(135,'MARK')]:
  c.circle(x+xx*MM,y+45*MM,40*MM);c.line(x+xx*MM-5,y+45*MM,x+xx*MM+5,y+45*MM);c.line(x+xx*MM,y+45*MM-5,x+xx*MM,y+45*MM+5);label(c,x+xx*MM,y+93*MM,t,10,True)
 b.y=y-20
 b.p('Stack from bottom to top',13,True)
 c=b.c;top=b.y
 for i,title in enumerate(['1 / BACKING: centres at crosses','2 / WHEELS: LEFT + MOON at top','3 / COVER: match all four corners']):
  yy=top-i*25;c.setStrokeColor(INK);c.rect(48,yy-20,b.w-96,21);label(c,b.w/2,yy-14,title,10,True)
 b.y=top-90;b.p('Lift cover > adjust ONE wheel > replace and check. Keep the other centred. Realign small gaps first; judge labels and evidence too, not perfect hand-cut precision.',11)
 b.p('Handover preview / LEFT + MOON / not connected',11,True)
 c=b.c;yy=b.y-37
 if yy<48:raise ValueError('Assembly preview enters footer')
 for xx,title,offset in [(65,'LEFT',8),(b.w-155,'MOON',-8)]:
  c.rect(xx,yy,90,35);label(c,xx+45,yy+24,title,10,True);c.line(xx,yy+12+offset,xx+90,yy+12+offset)
 c.line(155,yy+12,b.w-155,yy+12)

 b.page('Shared repair record','HISTORY STAYS / CURRENT SETTINGS CHANGE')
 b.line('HISTORY / BEFORE test readings, C-P-W',31);b.line('HISTORY / corrected drive-parts cabinet code / KEEP',31)
 b.line('CURRENT / AFTER test readings, C-P-W',31);b.line('CURRENT / corrected final pin positions, C-P-W',31)
 for title in ['PROOF 1 / Drive direction + mark / evidence sources','PROOF 2 / Current pins / evidence sources','PROOF 3 / Current wall state / evidence source']:
  b.p(title,11,True,gap=5)
  for _ in range(2):b.c.line(38,b.y-18,b.w-38,b.y-18);b.y-=25
  b.p('[ ] Explained to a teammate; sources checked.',10,gap=12)
 b.p('Keep the earlier code: it opened the drive-parts cabinet. New readings determine the final pins. Do not erase history.',10.5)

 b.page('No-cut / two separate wall views','USE THIS PAGE INSTEAD OF THE SLIDING STRIP')
 b.p('Keep this sheet whole. Cover the AFTER view with opaque spare paper before play. After round 4, cover BEFORE and expose AFTER. The active label belongs to the three readings directly beneath it. Keep the sheet at the same table position.',11)
 for state,prop in [('BEFORE / DRIVE OFF','before'),('AFTER / DRIVE ON','after')]:
  top=b.y;c=b.c;c.setStrokeColor(INK);c.rect(38,top-124,b.w-76,124);label(c,b.w/2,top-20,state,13,True)
  for i,cl in enumerate(D['clocks']):
   xx=115+i*(b.w-230)/2;face(c,xx,top-66,cl[prop],12*MM);label(c,xx,top-113,cl['name'],10)
  b.y=top-140
 b.p('R-01 / fixed positive offsets',13,True)
 b.table(['Copper / C','Porcelain / P','Wood / W'],[['Subtract 1','Subtract 2','Subtract 3']])
 b.p('Independent calibration test dials, not one shared real time. Subtract on a twelve-hour cycle; one before 1 is 12. No-cut drive: circle chosen labels on page 7, record their W-01/M-01 sources on page 9, then ask the host to check. No layering or physical line alignment is required in this mode.',11)

 b.page('Six mission cards','ADULT CUTS SIX CARDS; HAND OUT ONLY THE CURRENT ONE')
 briefs=['Match the lamp ticket to one tool using socket, teeth and turning direction. Ask the host to check before unfolding or revealing the lamp.','Return to W-01. Open or reveal the lamp; join both parts of its mounting arrow. Record direction and source.','Use BEFORE test readings and R-01 offsets, C-P-W order. Record the historical drive-parts cabinet code. Keep R-01.','Start LEFT+MOON. Explain targets from W-01/M-01, then set or circle choices. Host checks evidence. Change wall: slide UP 45 mm OR reveal AFTER on page 10.','Return to the same wall. Use AFTER readings with unchanged R-01 offsets. Record CURRENT pins without erasing HISTORY.','Prove all three conditions in record 9. Host checks sources; open or reveal service extension, point to 13, receive ending 12.']
 top=b.y
 for i,brief in enumerate(briefs):
  yy=top-i*83;c=b.c;c.setStrokeColor(INK);c.setDash(3,3);c.rect(33,yy-77,b.w-66,79);c.setDash();b.y=yy-7;b.p(str(i+1)+' / '+D['stages'][i]['title'],12,True,gap=6,x=43,width=b.w-86);b.p(brief,10.5,gap=0,x=43,width=b.w-86)
  if b.y<yy-72:raise ValueError('Mission card overflow '+str(i+1))

 b.page('A chime for Ada','ENDING / ADULT RELEASES ONLY AFTER ROUND 6 IS CHECKED')
 b.p(D['ending'],13);b.box('Return, look again, repair','Your team kept the old record, noticed the changed clock wall and applied the same rule to new evidence. The historical opening code and the final pin setting were both correct for their own tasks.')
 b.line('Workshop restored by');b.line('Date');b.p('CERTIFICATE / APPRENTICE CLOCKMAKERS',17,True);b.p('Each player explains one change they noticed and one earlier finding they used again. Reset the paper scenes only after celebrating the ending.',12)
 for i,n in enumerate([5,7,11]):face(b.c,130+i*170,135,n,19*MM)
 b.finish()

def guide(paper):
 b=Book(paper,'guide',8);b.page('Adult start here','SPOILERS / ONE ADULT HOST IN ADDITION TO PLAYERS')
 b.box('Choose one paper size AND one play mode','A4 OR Letter; single-sided at 100%. STANDARD: print Player pages 1-9 and 11-12 (11 sheets); skip optional page 10. NO-CUT: print 1,2,4,6,7,9,10,11,12 (9 sheets); skip 3,5,8. The 8-page guide may stay on screen. One adult host plus 2-5 players; age 9+ is provisional. Duration unmeasured.')
 b.box('Standard preparation','Cut/fold bench 2 and cabinet 4 as marked. Keep wall frame 3 FLAT; put connected strip 5 behind it with BEFORE grip BELOW. Keep R-01, the uncut bottom of page 5. Build the three-layer drive using 6,7,8; set LEFT+MOON before handing over. Page 8 has the illustrated layer order. Record findings on separate page 9.')
 b.box('No-cut preparation','Do not cut or layer parts. Use three spare opaque sheets to hide lamp right panel, cabinet extension and the AFTER view on page 10. Use only the labelled page-10 wall views and R-01; grip labels on page 5 are not state-view labels. On page 7, circle selected wheel labels and record sources; host checks choices instead of physically aligning lines.')
 b.box('Handover and equipment','Prepare all materials before play; keep drive pages 6-7 until round 3 passes. Page 8 is backing only, 9 is the record, 10 is no-cut wall views, 11 has six mission cards, 12 is the hidden ending. Standard: 17 cut pieces and five window openings. No-cut: give one mission instruction at a time, covering future cards. Paper, pencil and adult-handled scissors in standard mode; no glue, brad or tape.')
 b.p('Reading/access support and equivalent spoken explanations are welcome. Use progressive hints; if stuck, explain and continue with assistance. No timed failure. Physical print/cut/slide performance, first-time host setup and independent family playtests remain unverified.',10.5)
 b.page('Packet map / preparation checks')
 b.table(['When','Give or change'],[['Start / 1','Prepared scenes; R-01; record 9; mission 1. No-cut wall uses 10. Keep drive parts, later missions and ending 12.'],['After 1 / 2','Mission card 2. Permit lamp fold to open; keep it open.'],['3','Mission card 3. Wall still BEFORE. R-01 stays available.'],['After 3 / 4','Drive 6-8 standard / 6-7 no-cut, initially LEFT+MOON; mission 4. Check target evidence and labels, then change wall to AFTER (slide or page 10).'],['5','Mission card 5. Read 6,9,2 and apply original corrections. Place/circle CURRENT 5,7,11.'],['6','Mission card 6. Check sources; open existing service extension and point to 13.'],['After final check','Player page 12 / message and certificate.']])
 b.p('STANDARD ONLY: before players arrive, measure the 45 mm calibration on page 5. Test both wall positions and match the cover corners to the wheel backing. Do not cut the strip rows or wheel sectors apart. The diagrams below are reduced; cut the full-size Player Pack parts.',10.5)
 b.p('Rotate reader/operator/recorder so one child does not control all repairs. The digital companion also requires an explicit lamp opening and wall move; revisiting an old round never undoes scene changes.',11)
 b.p('Standard-mode wall / front view',13,True)
 top=b.y;c=b.c
 for i,(title,vals)in enumerate([('BEFORE / below',[3,7,10]),('AFTER / above',[6,9,2])]):
  xx=48+i*94*MM;yy=top-28*MM;c.setStrokeColor(INK);c.rect(xx,yy,78*MM,24*MM)
  for j,val in enumerate(vals):c.rect(xx+(7+j*24)*MM,yy+7*MM,16*MM,10*MM);label(c,xx+(15+j*24)*MM,yy+10*MM,str(val),11,True)
  if i==0:c.rect(xx+7*MM,yy-4*MM,64*MM,4*MM)
  else:c.rect(xx+7*MM,yy+24*MM,64*MM,4*MM)
  label(c,xx+39*MM,yy-10*MM,title,10,True)
 b.y=top-42*MM;b.p('Move the connected strip UP 45 mm. The exposed tab changes from below the frame (BEFORE) to above it (AFTER).',10.5)
 for i,s in enumerate(D['stages']):
  b.page(str(i+1)+' / '+s['title'],'HOST SCRIPT / CHECKED FINDING / PROGRESSIVE HELP');b.p('Read aloud',11,True);b.p(s['lead']);b.p('Accepted finding and reasoning',11,True);b.p(s['solution'])
  for n,h in enumerate(s['hints']):b.p('Hint '+str(n+1)+': '+h,11)
  b.p('After checking',11,True);b.p(s['reward'])
  if i==0:b.p('The lamp tool turns LEFT. The later mounting arrow points RIGHT. These are different operations. Do not let the earlier tool arrow replace observation of the unfolding scene.',11)
  if i==3:b.p('Hold the wheels in their printed bays; a fixed centre line prevents two equally wrong-height segments from being accepted. This is an illustrated alignment model, not a self-locking mechanical gearbox. Use the page-8 layer diagram. If the cover slips, lift and reposition it. Small cutting errors are not wrong answers: verify sources, selected labels and alignment together. The host verifies labels before the wall moves.',11)
  if i==4:b.p('If players answer 257, ask which state they are reading. Do not call their old record wrong: it was correct for opening the cabinet. Point to the separate HISTORY and CURRENT fields.',11)
  if i==5:b.p('Accept only claims with their sources. The special 13 is an already-attached service extension, not ordinary time arithmetic. Do not require the apprentice\'s motive or a real sound to finish. Read the full letter only now.',11)
 b.finish()

m={'id':D['id'],'version':2,'status':'local_development','physicalPlaytest':False,'files':[],'pagesPerFormat':{'players':12,'guide':8}}
for paper in ['A4','Letter']:
 players(paper);guide(paper)
 for role,n in m['pagesPerFormat'].items():
  p=OUT/f'{paper}-{role}.pdf';r=PdfReader(p);assert len(r.pages)==n;m['files'].append({'paper':paper,'role':role,'path':p.name,'pages':n,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
(OUT/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf8');print(json.dumps(m,indent=2))

