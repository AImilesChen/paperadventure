"""Build the four private print-and-play files from the companion's evidence data."""
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
OUT=ROOT/'output/private/seventh-carriage';OUT.mkdir(parents=True,exist_ok=True)
INK=HexColor('#173a45');GOLD=HexColor('#a87224');PALE=HexColor('#edf1e7')
def clean(s):
 for a,b in [('’',"'"),('‘',"'"),('“','"'),('”','"'),('–','-'),('—','-'),('→',' > '),('©','(c)')]:s=s.replace(a,b)
 return s
class Book:
 def __init__(self,paper,role,total):
  self.paper=paper;self.role=role;self.total=total;self.w,self.h=A4 if paper=='A4' else letter
  self.c=canvas.Canvas(str(OUT/f'{paper}-{role}.pdf'),pagesize=(self.w,self.h),invariant=1);self.c.setTitle(DATA['title']+' / '+role);self.n=0
 def page(self,title,kicker='CASE FILE 07'):
  if self.n:self.c.showPage()
  self.n+=1;c=self.c;c.setFillColor(INK);c.setStrokeColor(INK);c.setLineWidth(.7)
  c.setFont('Helvetica-Bold',9);c.drawString(38,self.h-30,'PAPER ADVENTURE / THE MISSING SEVENTH CARRIAGE')
  c.setFont('Helvetica',8);c.drawRightString(self.w-38,25,f'{self.paper} / {self.role.upper()} / {self.n} OF {self.total}')
  c.drawString(38,25,'Original case 07 / v2 / (c) 2026 Paper Adventure Workshop')
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

def carriage(c,d,x,y,scale=.7,label=True):
 c.saveState();c.translate(x,y);c.scale(scale,scale);c.setStrokeColor(INK);c.setFillColor(PALE);c.setLineWidth(2)
 c.roundRect(8,25,180,75,4,fill=1)
 c.setFillColor(HexColor('#e4c48c'))
 p=c.beginPath();p.moveTo(8,100)
 if d['roof']=='round':p.curveTo(50,133,145,133,188,100)
 else:p.lineTo(8,114);p.lineTo(188,114);p.lineTo(188,100)
 p.close();c.drawPath(p,fill=1)
 c.setFillColor(white)
 for i in range(d['windows']):c.rect(30+i*31,68,20,20,fill=1)
 c.rect({'left':17,'middle':88,'right':163}[d['door']],29,15,30,fill=1)
 c.setFillColor(INK);c.circle(42,16,11,fill=1);c.circle(154,16,11,fill=1)
 c.setFont('Helvetica-Bold',14.6);c.drawString(110 if d['door']=='middle' else 60,43,d['mark'])
 if label:c.setFont('Helvetica-Bold',17);c.drawCentredString(98,-12,d['id'])
 c.restoreState()

def map_draw(b,old=False):
 # Identical physical geometry in both paper sizes and both maps.
 c=b.c;s=0.67;ox=(b.w-700*s)/2;top=b.y-5
 def pt(x,y):return ox+x*s,top-y*s
 c.saveState();c.setLineWidth(1)
 c.setStrokeColor(HexColor('#879c92'))
 for points in [[(110,65),(580,65)],[(110,65),(110,220),(580,220)],[(110,65),(580,220)]]:
  p=c.beginPath();p.moveTo(*pt(*points[0]));[p.lineTo(*pt(*v)) for v in points[1:]];c.drawPath(p)
 def rect(x,y,w,h):
  px,py=pt(x,y+h);c.setFillColor(white);c.setStrokeColor(INK);c.rect(px,py,w*s,h*s,fill=1)
 def t(x,y,text,size=11):c.setFillColor(INK);c.setFont('Helvetica-Bold',max(size*s,11));c.drawString(*pt(x,y),text)
 rect(75,43,70,45);t(78,59,'WATER',12);t(78,76,'TOWER',12)
 rect(75,180,70,55);t(88,211,'ARCH',14)
 rect(260,42,115,48);t(270,71,'STORE' if old else 'BAY 1',17)
 rect(515,42,115,48);t(525,71,'WORKSHOP' if old else 'BAY 2',15)
 if old:c.setDash(4,3)
 rect(485,190,170,58);c.setDash()
 t(496,166,'CLOCK DEPOT' if old else 'CURRENT BAY LABEL',11)
 if old:t(496,185,'CUT WINDOW',11)
 if not old:t(534,225,'BAY 3',20)
 t(30,50,'N',17)
 px,py=pt(40,90);c.line(px,py,px,py+20);c.line(px,py+20,px-4,py+13);c.line(px,py+20,px+4,py+13)
 # Shared registration crosses and physical edge; tabs only on survey.
 for x,y in [(110,15),(110,265)]:
  px,py=pt(x,y);c.line(px-4,py,px+4,py);c.line(px,py-4,px,py+4)
 px,py=pt(0,280);c.setDash(5,3);c.rect(px,py,700*s,280*s);c.setDash()
 if old:
  for x in [-18,700]:
   px,py=pt(x,280);c.rect(px,py,18*s,280*s)
   c.saveState();c.translate(px+8,py+50);c.rotate(90);c.setFont('Helvetica-Bold',9);c.drawString(0,0,'FOLD BACK');c.restoreState()
 if old:
  c.setDash(3,3);p=c.beginPath();p.moveTo(*pt(350,0))
  for point in [(350,80),(362,80),(362,105),(350,105),(350,170),(338,170),(338,195),(350,195),(350,280)]:p.lineTo(*pt(*point))
  c.drawPath(p);c.setDash()
 c.restoreState();b.y=top-280*s-22
 b.p('Map frame width: 165.5 mm. The two maps must have the same width. Do not fit one page differently.',9)

def celebration(c,w,y):
 c.saveState();c.setStrokeColor(INK);c.setLineWidth(1)
 for i,x in enumerate([65,125,185,w-185,w-125,w-65]):
  h=32+(i%2)*12;c.setFillColor(PALE);c.rect(x-18,y,36,h,fill=1)
  p=c.beginPath();p.moveTo(x-23,y+h);p.lineTo(x,y+h+18);p.lineTo(x+23,y+h);p.close();c.setFillColor(HexColor('#dfc38e'));c.drawPath(p,fill=1)
  c.setFillColor(INK);c.rect(x-3,y+10,6,10,fill=1)
 cx=w/2;c.setFillColor(PALE);c.rect(cx-30,y,60,64,fill=1);c.setFillColor(white);c.circle(cx,y+65,30,fill=1);c.line(cx,y+65,cx,y+85);c.line(cx,y+65,cx+17,y+65)
 c.line(45,y,w-45,y);c.restoreState()

def players(paper):
 b=Book(paper,'players',14)
 b.page('The Missing\nSeventh Carriage','YOUR MISSION / READ TOGETHER')
 b.p(DATA['opening'],13);b.p('Find the carriage. Explain its disappearance. Arrange its return.',15,True)
 b.p('Ages 9+ / 2-5 players / six linked missions / playtime not yet measured',10)
 b.box('How to use your case file','Read each numbered mission, examine the named evidence, and record your finding on page 2. Keep every checked finding: the final return request needs them. Use the purchased companion or ask an adult to check the separate guide. Hints are welcome. There is no timed failure.')
 b.box('Prepare before playing','An adult starts with pages 1-4 and keeps pages 5-14 aside. Give out the later packets only after each checked finding, as listed in the Adult Guide. Keep page 14 hidden until the ending. Print all sheets single-sided at 100%. Keep the same paper size for both maps. See the Adult Guide for cutting and handover. Use paper and pencil. No locks, special equipment or internet are required.')
 b.p('Roles: Reader reads the mission; Observer checks details; Recorder saves findings; Checker asks what evidence supports them. Rotate after each mission. With two players combine Reader/Recorder and Observer/Checker. With five, add a Materials Keeper.',11)
 b.page('Your investigation record')
 for label in ['1 / Missing carriage and seal batch','2 / Event order and station-sign clue','3 / Station, corrected reading and stop window','4 / Matching transfer and receipt','5 / Current bay, repair status and notification error','6 / Return route and reason it is valid']:b.line(label)
 b.p('NW-03 / Departure seal stubs: use after comparing the carriage silhouettes.',11,True)
 b.table(['Carriage','Mark','Batch'],[[r['carriage'],r['mark'],r['batch']]for r in DATA['seals']],compact=True)
 b.p('Keep this record for the final return application. Your answers must fit the original documents.',11)
 b.page('1 / The empty place','EVIDENCE / DEPARTURE MANIFEST')
 b.p(DATA['stages'][0]['lead'],12)
 for i,d in enumerate(DATA['carriages']):carriage(b.c,d,45+(i%3)*170,b.y-118-(i//3)*147,.72)
 b.y-=455;b.p('NW-01 / Cargo note: the CLOCK exhibition carriage carries the great paper clock. No passengers ride in it. Once you identify the missing carriage, use NW-03 on page 2 to find its seal batch.',11)
 b.page('Arrival silhouette cards','MISSION 1 / CUT OUTER RECTANGLES ONLY')
 b.p('Compare these six enlarged cards beside the manifest on page 3; they are not sized to cover its drawings. Circle the unmatched departure carriage. Do not cut the departure manifest. Arrival cards deliberately have no numbers.',12)
 for i,ident in enumerate(DATA['arrival']):
  x=42+(i%2)*255;y=b.y-132-(i//2)*155;b.c.setDash(3,3);b.c.rect(x-3,y-18,245,145);b.c.setDash();carriage(b.c,next(d for d in DATA['carriages'] if d['id']==ident),x+20,y,.94,False)
 b.page('2 / The stop nobody recorded','SHARE FOUR WITNESS SLIPS / CUT DOTTED RECTANGLES')
 b.p(DATA['stages'][1]['lead'],11)
 for w in DATA['witnesses']:b.box(w['name'],w['text'],cut=True)
 b.p('JOURNEY SUMMARY: Whitebridge arrival / NON-STOP. Check this summary against the witnesses.',10,True)
 b.p('Event cards / cut each row, then arrange earliest to latest',11,True)
 b.table(['Card','Event'],[[v['id'],v['text']] for v in DATA['events']],[55,b.w-131],cut=True)
 b.page('3 / Two clocks, one moment','TIME OFFICE / TM-01 TO TM-03')
 b.p(DATA['stages'][2]['lead'],11)
 b.box('TM-01 / simultaneous observation slips',"Rafi / platform clock: 21:14. Duty officer / duty-room clock: 21:18. Both notes were made at the same departure-warning bell.")
 b.p('TM-02 / clock inspection at the central signal',11,True)
 b.table(['Clock','Reading at central 20:00'],[[r['clock'],r['reading']]for r in DATA['clock']['inspection']],compact=True)
 b.p(DATA['clock']['notice'],10.5)
 b.p('TM-03 / candidate sightings of several trains',11,True)
 b.p('Only one report belongs to your stopped train. Combine the corrected observation with the witness sign.',10.5)
 b.table(['Station','Central-time window','Sign'],[[r['name'],r['start']+' - '+r['end'],r['mark']]for r in DATA['stations']],compact=True)
 b.line('Reliable clock / error in minutes');b.line('Corrected reading / station / evidence')
 b.page('4 / Follow the seal')
 b.p(DATA['stages'][3]['lead'],12);b.p('TR-01 / Match the cargo identity and seal batch from mission 1, then distinguish an executed transfer from a cancelled application. A request alone does not prove movement.',11)
 for t in DATA['transfers']:b.box(t['id']+' / '+t['status'],f"Mark: {t['mark']} / Batch: {t['batch']} / Carriage: {t['carriage']} / Destination: {t['to']} / Receipt: {t['receipt']}")
 b.line('Matching slip and receipt');b.line('Identity fields AND evidence that movement occurred')
 b.page('5 / Old repair-area survey','MAP A / CUT THE WINDOW, KEEP THE LANDMARKS')
 b.p(DATA['depot']['receipt'],12);b.p('Cut the outer frame with side tabs attached, then cut along the stepped middle seam to make two large pieces. Cut only the CLOCK DEPOT window. Mix the pieces. Rejoin their roads and outline; fold side tabs back. Lay both pieces over Map B, matching the frame, WATER TOWER, ARCH and north. Lift one edge if needed to check alignment.',11)
 map_draw(b,True)
 b.box('No-cut alternative','Keep the survey whole and trace its stepped seam with a finger. Compare both landmarks and the CLOCK DEPOT position with Map B. All answers are unchanged. No cutting or tape is necessary in this mode.')
 b.page('Current depot map','MAP B / KEEP FLAT / SAME PRINT SCALE AS MAP A')
 b.p('Place Map A over this map. Match the WATER TOWER and ARCH as well as both registration crosses. Read the bay label through the window, then read page 10.',12)
 map_draw(b)
 b.line('Current bay for CLOCK DEPOT');b.p('Do not cut this map. Keep both maps for the final return request.',11)
 b.page('The depot records','MISSION 5 / READ AFTER THE MAP COMPARISON')
 b.box('DP-01 / receipt R4',DATA['depot']['receipt']);b.box('DP-03A / earlier inspection',DATA['depot']['decoy']);b.box('DP-03B / signed inspection',DATA['depot']['repair']);b.box('DP-04 / returned notification',DATA['depot']['returned'])
 b.line('Why did the carriage leave the train?');b.line('Why did the conductor not know?');b.line('What evidence allows the return?')
 b.page('6 / Bring the seventh home')
 b.p(DATA['stages'][5]['lead'],11);b.box('AD-01 / Stationmaster Ada',DATA['deadline'])
 for r in DATA['routes']:b.box(r['id']+' / '+r['name'],r['rule'])
 for l in ['Carriage / station / bay','Matching receipt / earliest release time','Chosen plan / departure / arrival','Why plans A and C fail']:b.line(l)
 b.page('Your return request','MISSION 6 / FINAL PAPER ACTION')
 b.p('Read AD-03 below, then cut and arrange the three action cards. Derive their order from the work rules. Explain your plan using the original evidence, not just the selected letter.',12)
 b.p('AD-03 / Work rules',11,True)
 for rule in DATA['movementRules']:b.p(rule,10.5,gap=7)
 for title,body in [('RETURN','Ask the qualified depot crew to bring the identified carriage back on the selected route.'),('VERIFY','Check the completed seven-carriage train against the departure manifest.'),('CONFIRM','Read the signed repair record and confirm release approval.')]:b.box(title+' / ACTION CARD',body,cut=True)
 b.line('Action order / supporting rule')
 b.p('These are fictional tabletop rules, not real railway instructions. After your request is checked, open page 14 and complete the train on page 13.',10)
 b.page('The empty place waits','FINALE BOARD / KEEP UNTIL THE RETURN IS APPROVED')
 b.p('Every arrival silhouette found its place. Leave the final rectangle empty until the depot crew returns your carriage. Place the K7 finale card there when your investigation is complete.',12)
 for i,d in enumerate(DATA['carriages'][:6]):carriage(b.c,d,45+(i%3)*170,b.y-110-(i//3)*150,.72)
 b.y-=330;b.c.setDash(5,3);b.c.rect(45,b.y-145,145,145);b.c.setDash();b.p('K7 / RESERVED PLACE',11,True,x=220,width=b.w-270);b.p('Case closed by:',12,True,x=220,width=b.w-270);b.p('Investigator names:',11,x=220,width=b.w-270);b.c.line(220,b.y-10,b.w-45,b.y-10)
 b.page('Seven together','ENDING / ADULT KEEPS THIS PAGE UNTIL CASE CLOSED')
 b.p(DATA['ending'],12)
 b.p('Cut the outer two-panel rectangle below. Fold the clock panel behind the carriage at the middle line. Place the carriage face up in the empty place on page 13, with the clock face down against the board. Lift and unfold to reveal the clock.',11)
 x=60;y=b.y-165;cw=145;ch=145;b.c.setDash(4,3);b.c.rect(x,y,cw*2,ch);b.c.line(x+cw,y,x+cw,y+ch);b.c.setDash();carriage(b.c,DATA['carriages'][6],x+4,y+30,.70)
 cx=x+cw*1.5;cy=y+72.5;b.c.setStrokeColor(INK);b.c.circle(cx,cy,54);b.c.setFont('Helvetica-Bold',9)
 for n in range(1,13):a=math.radians(90-n*30);b.c.drawCentredString(cx+43*math.cos(a),cy+43*math.sin(a)-3,str(n))
 b.c.line(cx,cy,cx,cy+32);b.c.line(cx,cy,cx+23,cy);b.y=y-20
 b.p('CERTIFICATE / Evidence checked. Carriage found. Celebration restored.',12,True);b.line('Awarded to');b.line('Date')
 celebration(b.c,b.w,58)
 b.finish()

def guide(paper):
 b=Book(paper,'guide',8)
 b.page('Adult Guide','SPOILERS / KEEP SEPARATE FROM PLAYERS')
 b.p('The complete mystery is playable on paper. This guide replaces the companion when you play offline. No account, phone, locks or purchased props are needed.',13)
 b.box('Print and prepare','Print Player pages 1-14 single-sided at 100%, A4 or Letter. Do not mix paper sizes. Keep this guide on screen or print it separately. Sort seven packets: mission 1 (pages 1-4), mission 2 (page 5), mission 3 (page 6), mission 4 (page 7), mission 5 (pages 8-10), mission 6 (pages 11-13), and the ending (page 14). Give players only the current packet; later pages reveal earlier findings. Never print two player pages on one sheet: the map window and finale card need full scale.')
 b.box('Exact cutting inventory','Full-cut mode: 6 arrival cards (page 4), 4 witness slips and 4 event rows (page 5), 3 action cards (page 12), and 1 connected two-panel ending card (page 14): 18 loose pieces. Also cut Map A boundary with its two tabs, its stepped seam and one window (page 8): two map pieces, for 20 loose pieces total. Fold tabs backwards. No tape is required; place the pieces side by side. The final card stays connected at its middle fold. Do not cut page 3 or Map B.')
 b.box('No-cut mode','Leave sheets whole. Point to silhouettes; cover other witness sections; write event letters; trace the survey seam and compare the maps side by side; number the actions. Keep page 14 hidden, then place it beside the train with the clock panel folded behind the carriage. All six mission answers remain identical.')
 b.p('Preparation and play durations are design targets. Physical printing, cutting and an unfamiliar-family playtest have not yet been verified. The digital version is not proof of those checks.',10)
 b.page('Host the investigation')
 b.table(['When','Give the team'],[['Start','Player pages 1-4. Read the opening together. Keep page 14 hidden.'],['After K7 / batch 27','Page 5: share witness slips and event cards.'],['After event order','Page 6: clock, notice and journey log.'],['After clock / Moonbay check','Page 7: transfer register.'],['After T3 / R4','Pages 8-10: paired maps, repair and returned notice.'],['After Bay 3 / R4 release','Pages 11-13: routes, return request, actions and finale board.'],['After final verification','Page 14: ending, connected carriage/clock card and certificate.']],[110,b.w-186])
 b.box('Working together','Rotate Reader, Observer, Recorder and Checker each mission. Two players combine jobs. For five add a Materials Keeper. A child can dictate to an adult. In mission 2 divide four witness slips as evenly as possible; a fifth player arranges event cards after hearing the evidence. No player needs to lie or act a character.')
 b.box('Checking and recovery','Accept equivalent spoken findings offline when their facts and evidence agree. Ask which document supports an answer. Give one hint at a time. If a team remains stuck, explain the solution and continue: never withhold a necessary prop as punishment. A lost card can be read from its original sheet.')
 for i in range(6):
  s=DATA['stages'][i];b.page(f"{i+1} / {s['title']}",'MISSION SCRIPT / ANSWERS AND HINTS')
  b.p('Read aloud',11,True);b.p(s['lead'],12);b.p('Accepted finding and explanation',11,True);b.p(s['solution'],12)
  b.p('Three progressive hints',11,True)
  for n,h in enumerate(s['hints']):b.p(f'{n+1}. {h}',11)
  if i==0:b.p('Host check: each of the six numbered manifest silhouettes except K7 has one arrival match. Children must compare the two one-window carriages: door side, roof and mark distinguish them. Save batch 27.',11)
  if i==1:b.p('Host check: tea is before the blackout. The platform stop follows restored lights and precedes departure. The two independent stop witnesses are Jo and Rafi. The four event letters are A-C-B-D; no clock calculation is needed yet.',11)
  if i==2:b.p('Host check: do not accept 21:22 as the requested clock reading. That is the end of the stop window. 21:18 is the corrected observation; 21:18-21:22 is the full log window.',11)
  if i==3:b.p('Host check: T2 has matching identity but is a cancelled request; T1 has batch 26 and T4 belongs to K5. Require T3, R4 and the executed/receiver-signed status.',11)
  if i==4:b.p('Map check: frame width 165.5 mm on BOTH maps, on either paper size. Match north, WATER TOWER, ARCH and the crosses. Join the two stepped edges first; left half contains both landmarks. The window reveals BAY 3. Use no-cut comparison if alignment slips. Only R4/K7 on page 10 releases your carriage at 21:36; ignore the earlier R5/K5 record.',11)
  if i==5:b.p('Final verification: require K7, Moonbay, Bay 3, R4 release at 21:36, plan B departure 21:42 and arrival 21:58 before 22:00. Reject A as too early and C as loose-cargo only. Derive CONFIRM-RETURN-VERIFY from rule dependencies. Give page 14, read the ending, and let the team unfold the clock and complete the train. Using assistance still completes the story.',11)
  b.p('After checking',11,True);b.p(s['reward'],11)
 b.finish()

manifest={'id':DATA['id'],'version':2,'title':DATA['title'],'price':DATA['price'],'status':'private-development-package','physicalPlaytest':False,'files':[]}
for paper in ['A4','Letter']:
 players(paper);guide(paper)
 for role,n in [('players',14),('guide',8)]:
  f=OUT/f'{paper}-{role}.pdf';r=PdfReader(f);assert len(r.pages)==n
  expected=A4 if paper=='A4' else letter
  for p in r.pages:assert abs(float(p.mediabox.width)-expected[0])<.1 and abs(float(p.mediabox.height)-expected[1])<.1
  manifest['files'].append({'paper':paper,'role':role,'path':f.name,'pages':n,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(json.dumps(manifest,indent=2))
