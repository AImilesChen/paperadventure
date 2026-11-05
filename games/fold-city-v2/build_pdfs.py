"""Build four vector PDFs from the same road/art/state data as the companion."""
from pathlib import Path
from xml.sax.saxutils import escape
import json,hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph,Table,TableStyle

ROOT=Path(__file__).resolve().parents[2];SRC=Path(__file__).parent;OUT=ROOT/'output/private/fold-city-v2';QA=ROOT/'tmp/fold-city-v2-qa';QA.mkdir(parents=True,exist_ok=True)
D=json.loads((SRC/'game.json').read_text(encoding='utf8'));ART=json.loads((OUT/'print-art.json').read_text(encoding='utf8'));SOL=json.loads((SRC/'solutions.json').read_text(encoding='utf8'));RESCUES=json.loads((SRC/'rescues.json').read_text(encoding='utf8'))
INK=HexColor('#23464d');PALE=HexColor('#edf1e6');GOLD=HexColor('#ac6436');measurements=[];placements=[]

def primitives(c,ops):
 for o in ops:
  typ=o['t'];c.saveState()
  if typ=='group':
   x,y=o['translate'];deg,cx,cy=o['rotate'];c.translate(x,y);c.translate(cx,cy);c.rotate(deg);c.translate(-cx,-cy);c.scale(*o.get('scale',[1,1]));primitives(c,o['ops']);c.restoreState();continue
  fill=o.get('fill','none')!='none';stroke=o.get('stroke','none')!='none'
  if fill:c.setFillColor(HexColor(o['fill']))
  if stroke:c.setStrokeColor(HexColor(o['stroke']))
  c.setLineWidth(o.get('sw',1));c.setLineCap(0 if o.get('cap')=='butt'else 1)
  c.setDash([float(v)for v in o['dash'].split()]if o.get('dash')else [])
  if typ=='rect':c.rect(o['x'],o['y'],o['w'],o['h'],fill=int(fill),stroke=int(stroke))
  elif typ=='line':c.line(o['x1'],o['y1'],o['x2'],o['y2'])
  elif typ=='circle':c.circle(o['x'],o['y'],o['r'],fill=int(fill),stroke=int(stroke))
  elif typ=='poly':
   p=c.beginPath();p.moveTo(*o['points'][0])
   for v in o['points'][1:]:p.lineTo(*v)
   p.close();c.drawPath(p,fill=int(fill),stroke=int(stroke))
  elif typ=='text':
   c.translate(o['x'],o['y']);c.scale(1,-1);c.setFont('Helvetica-Bold'if o.get('weight')=='bold'else'Helvetica',o['size'])
   method=c.drawCentredString if o['anchor']=='middle'else c.drawRightString if o['anchor']=='end'else c.drawString
   method(0,0,o['text'])
  else:raise ValueError(typ)
  c.restoreState()

class Book:
 def __init__(self,paper,role,total):
  self.paper=paper;self.role=role;self.total=total;self.w,self.h=A4 if paper=='A4'else letter;self.width=self.w-76;self.page_no=0
  self.path=OUT/f'{paper}-{role}.pdf';self.c=canvas.Canvas(str(self.path),pagesize=(self.w,self.h),invariant=1)
  self.c.setTitle(D['title']+' / '+role);self.c.setAuthor('Paper Adventure');self.c.setSubject('Original household spatial escape adventure / edition 2')
 def page(self,code,title):
  if self.page_no:self.end()
  self.page_no+=1;c=self.c;c.setFillColor(INK);c.setFont('Helvetica-Bold',8);c.drawString(38,self.h-28,'PAPER ADVENTURE / FOLD CITY / E05')
  c.setStrokeColor(GOLD);c.setLineWidth(2);c.line(38,self.h-39,self.w-38,self.h-39);c.setFillColor(INK);c.setFont('Helvetica-Bold',8);c.drawString(38,self.h-58,code)
  self.y=self.h-72;self.p(title,22,True,gap=18)
 def p(self,text,size=10.8,bold=False,gap=10,width=None,x=38):
  w=width or self.width;p=Paragraph(escape(str(text)).replace('\n','<br/>'),ParagraphStyle('body',fontName='Helvetica-Bold'if bold else'Helvetica',fontSize=size,leading=size*1.34,textColor=INK))
  h=p.wrap(w,10000)[1];assert self.y-h>=49,(self.paper,self.role,self.page_no,'text',text[:60],self.y,h)
  p.drawOn(self.c,x,self.y-h);self.y-=h+gap
 def box(self,title,text,size=10.5):
  parts=[Paragraph(escape(t).replace('\n','<br/>'),ParagraphStyle('box',fontName='Helvetica-Bold'if i==0 else'Helvetica',fontSize=size,leading=size*1.35,textColor=INK))for i,t in enumerate([title,text])]
  hs=[p.wrap(self.width-24,10000)[1]for p in parts];h=sum(hs)+27;assert self.y-h>=49,(self.paper,self.role,self.page_no,'box')
  self.c.setFillColor(PALE);self.c.rect(38,self.y-h,self.width,h,fill=1,stroke=0);y=self.y-10
  for p,ph in zip(parts,hs):p.drawOn(self.c,50,y-ph);y-=ph+6
  self.y-=h+14
 def art(self,name,width=None,height=None,x=None,top=None):
  a=ART[name];w=width or self.width;scale=w/a['w'];h=height or a['h']*scale
  if height is not None:assert abs(h/a['h']-scale)<.001
  x=38 if x is None else x;top=self.y if top is None else top
  assert top-h>=44,(self.paper,self.role,self.page_no,name,'art bottom')
  c=self.c;c.saveState();c.translate(x,top);c.scale(scale,-scale);primitives(c,a['ops']);c.restoreState();self.y=min(self.y,top-h-14)
  placements.append(dict(paper=self.paper,role=self.role,page=self.page_no,art=name,x=x,top=top,scale=scale,width=w,height=h))
 def table(self,rows,widths=None,size=9.7):
  widths=widths or [self.width/len(rows[0])]*len(rows[0]);cells=[]
  for i,row in enumerate(rows):cells.append([Paragraph(escape(str(t)).replace('\n','<br/>'),ParagraphStyle('cell',fontName='Helvetica-Bold'if i==0 else'Helvetica',fontSize=size,leading=size*1.3,textColor=INK))for t in row])
  t=Table(cells,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#bdcbc0'))]))
  w,h=t.wrap(self.width,10000);assert self.y-h>=49,(self.paper,self.role,self.page_no,'table',h,self.y);t.drawOn(self.c,38,self.y-h);self.y-=h+14
 def end(self):
  assert self.y>=35,(self.paper,self.role,self.page_no,self.y);measurements.append(dict(paper=self.paper,role=self.role,page=self.page_no,bottom=round(self.y,2)))
  c=self.c;c.setFillColor(INK);c.setFont('Helvetica',8);c.drawString(38,24,'Household edition 2 / (c) 2026 Paper Adventure');c.drawRightString(self.w-38,24,f'{self.paper} / {self.role.upper()} / {self.page_no} OF {self.total}');c.showPage()
 def finish(self):self.end();assert self.page_no==self.total;self.c.save()

def setup_sheet(b,back=False):
 top=b.h-110;side=88*mm;gap=10*mm;x0=(b.w-2*side-gap)/2
 for k,(col,row)in enumerate([(0,0),(1,0),(0,1)]):
  x=x0+col*(side+gap);t=top-row*(side+34);b.art(('back-'if back else'front-')+D['tiles'][k]['id'],width=side,x=x,top=t)
  b.c.setFillColor(INK);b.c.setFont('Helvetica',9);b.c.drawString(x,t-side-14,D['tiles'][k]['id']+(' BACK / glue blank side to FRONT'if back else' FRONT / keep the outer square'))
 b.y=top-side-34
 right=x0+side+gap
 if back:
  b.p('BACKS / same paper size',11,True,width=side,x=right)
  b.p('Print single-sided. Cut A, B and C. Match each letter with its front. Keep both TOP edges at the top; turn the back over left-to-right, then glue the blank sides together.',10,width=side,x=right)
  b.p('The road on the BACK RIGHT strip becomes the top road when the FRONT LEFT strip folds inward.',10,width=side,x=right)
 else:
  b.p('FRONTS / cut outer squares',11,True,width=side,x=right)
  b.p('Do not cut the dashed line. It is the fold line. Pre-crease gently, open flat, then match the reverse pieces from page 5.',10,width=side,x=right)
  b.p('Three assembled double-sided cards are placed on page 3. The fixed square D is already printed on that board.',10,width=side,x=right)
 b.y=117;b.p('Scale check: this line must measure 88 mm. Print at actual size / 100%, not Fit.',9.5)
 b.c.setStrokeColor(INK);b.c.setLineWidth(.8);b.c.line(38,83,38+88*mm,83);b.c.line(38,78,38,88);b.c.line(38+88*mm,78,38+88*mm,88);b.y=63

def players(paper):
 b=Book(paper,'players',10)
 b.page('OPENING / READ TOGETHER','The Secret of Fold City')
 b.art('cover');b.p(D['story']['opening']);b.box('YOUR SHARED GOAL','Find the leaf and spool return clasps, bring both to the Inner Gate [M], install them and actually walk to E.')
 b.p('English / 2-4 players sharing one party / age 9+ design target. Preparation and play times are unmeasured.',9.5)
 b.page('KEEP BESIDE THE CITY','How to walk through both sides')
 for title,text in D['rules']:b.p(title,11,True,gap=4);b.p(text,10.4,gap=9)
 b.page('BOARD / DO NOT CUT / START WITH ALL CARDS FLAT','The city beneath the streets')
 b.p('A top-left; B top-right; C bottom-left. Fronts up, flat, letters upright. Keep this board whole. D stays fixed. Folded cards reveal the bottom streets.',10.2)
 scale=176*mm/800;w=860*scale;b.art('base',width=w,x=(b.w-w)/2,top=b.y)
 b.p('Put the party on H. CA / CB / CC are turntables. G holds the leaf clasp; W holds the spool. F is Crease Lane. M is the Inner Gate; E is outside.',9.5,gap=7)
 b.p('Study the bottom map freely. Walk only where the current top surface has a connected street. The bar between M and E stays closed until both clasps are installed at M.',9.5)
 b.page('CUT THREE SQUARES / EACH 88 x 88 mm','Map-card fronts');setup_sheet(b)
 b.page('CUT THREE SQUARES / MATCH PAGE 4','Map-card backs');setup_sheet(b,True)
 b.page('CUT MARKERS / KEEP BESIDE THE MAP','Your party and return clasps')
 b.p('Cut one party marker and the two clasp markers. Use a small coin instead of the party marker if easier. Keep clasps in a shared bag area beside the map. A clasp is taken only after the party reaches its stop.',10.7)
 c=b.c;y=b.y-40
 for i,label in enumerate(['PARTY','LEAF','SPOOL']):
  x=90+i*145;c.setFillColor(PALE);c.setStrokeColor(INK);c.setLineWidth(1);c.rect(x-25,y-25,50,50,fill=1,stroke=1);c.setFillColor(INK)
  if i==0:
   for xx in [x-7,x+7]:c.circle(xx,y+11,4,fill=1,stroke=0);c.roundRect(xx-4,y-2,8,9,2,fill=1,stroke=0)
  elif i==1:
   p=c.beginPath();p.moveTo(x-12,y+4);p.curveTo(x-10,y+20,x+8,y+23,x+13,y+20);p.curveTo(x+12,y+7,x+5,y-1,x-12,y+4);c.drawPath(p,fill=1,stroke=0);c.setStrokeColor(PALE);c.line(x-8,y+6,x+9,y+18)
  else:
   c.rect(x-8,y+3,16,14,fill=1,stroke=0);c.ellipse(x-12,y+14,x+12,y+21,fill=1,stroke=0);c.ellipse(x-12,y-1,x+12,y+6,fill=1,stroke=0)
  c.setFillColor(INK);c.setFont('Helvetica-Bold',8);c.drawCentredString(x,y-17,label)
 b.y=y-50;b.box('GATE PATCH / OPTIONAL','Cut the narrow rectangle below. After installing both clasps at M, cover the printed gate bar with it, keeping its dark street horizontal. Alternatively, tick GATE OPEN on your log and treat the marked bar as passable.')
 px=80;py=b.y-52;pw=8*mm;ph=18*mm;c.setFillColor(HexColor('#f5efdd'));c.setStrokeColor(INK);c.setLineWidth(.5);c.rect(px,py,pw,ph,fill=1,stroke=1);c.setFillColor(HexColor('#31575c'));c.rect(px,py+ph/2-3.3*mm,pw,6.6*mm,fill=1,stroke=0)
 c.setFillColor(INK);c.setFont('Helvetica',10);c.drawString(px+pw+22,py+ph/2,'8 x 18 mm / place between M and E only after installation')
 b.y=py-24;b.p('Before playing, practise with one assembled card away from the board. Fold its printed LEFT strip inward. The BACK RIGHT road strip should now be on top. Open flat again. Return all cards to their slots with letters upright.',10.7)
 b.box('CHECK BEFORE PLAY','Compare the real folded A with Guide page 3. Restore all fronts upright and flat as in Guide page 4. H must reach only CC. Dark streets are routes; building pictures and dashed lines are not. Road ends must meet at matching edges.')
 b.page('PLACE EVENTS / READ AFTER YOU ARRIVE','The garden and the bindery')
 for id in ['CA','G','CB','W']:b.box(id+' / '+D['events'][id]['title'],D['events'][id]['text'])
 b.p('The garden and bindery may be explored in either order. You may pass a stop without interacting. Take a clasp before leaving if you want to carry it.',10.5)
 b.page('PLACE EVENTS / READ AFTER YOU ARRIVE','Along the crease to the gate')
 for id in ['H','CC','F','M']:b.box(id+' / '+D['events'][id]['title'],D['events'][id]['text'],10.3)
 b.page('PAUSE SNAPSHOT / SHARED JOBS','Keep your place and share the work')
 b.p('Circle the current choices when pausing. Record the visible state; no complete move history is needed. Keep collected or installed clasps when continuing.',10.5)
 b.table([['Card','Printed TOP faces','Flap'],['A','up 0 / right 1 / down 2 / left 3','open O / folded F'],['B','up 0 / right 1 / down 2 / left 3','open O / folded F'],['C','up 0 / right 1 / down 2 / left 3','open O / folded F']],[48,b.width*.56,b.width*.44-48],9.6)
 b.p('Party stop: __________   Gate: closed / OPEN',10.5,gap=10)
 b.p('Leaf: not taken / carried / installed    Spool: not taken / carried / installed',10.5,gap=10)
 b.p('Rescue used: yes / no    Last action (optional): _________________________',10.5,gap=10)
 b.p('Current Reader: player ____    Visited turntables (circle): CA / CB / CC',10.5,gap=14)
 b.table([['Job','What this player does'],*zip(D['roles']['names'],D['roles']['descriptions'])],[100,b.width-100],9.6)
 b.p('Number yourselves. Start jobs in Reader / Planner / Handler / Checker order: 2 players = 1 / 2 / 1 / 2; 3 players = 1 / 1 / 2 / 3; 4 players = 1 / 2 / 3 / 4. On the first visit to each turntable and after taking a clasp, pass every job to the next player number, wrapping to 1. Keep the job order and visited stops when pausing.',10.1,gap=12)
 b.box('CONTINUE / GET HELP','Restore this snapshot on paper. For a hint from this exact state, choose I am playing on paper in the companion and check all fields. In the Adult Guide, page 9 gives gradual hints; page 10 gives optional rescue resets. Read the ending only after the party reaches E.',10.2)
 b.page('ENDING / KEEP WITH THE ADULT UNTIL E','Back outside the book')
 b.art('cover',width=b.width*.85,x=(b.w-b.width*.85)/2);b.p(D['story']['ending'],11.5,gap=22)
 b.box('FOLD CITY EXPLORERS',D['story']['certificate'],11)
 b.p('You finished when the whole party actually reached E, with both clasps installed. There is no score or timer. Tell each other which change in the map surprised you most.',10.5)
 b.finish();return b

def state_text(s):
 return s['at']+' / '+' '.join(D['tiles'][k]['id']+str(t['r'])+('F'if t['f']else'O')for k,t in enumerate(s['tiles']))+' / '+('installed'if s['gate'] else'both carried'if s['clips']==3 else'leaf'if s['clips']==1 else'spool'if s['clips']==2 else'none')+(' / OPEN'if s['gate']else'')

def guide(paper):
 b=Book(paper,'guide',12)
 b.page('ADULT GUIDE / SPOILERS','Prepare one shared escape')
 b.p('The Secret of Fold City is one continuous spatial escape. Players walk through the current map, change a quarter only at its turntable and recover two clasps before reaching the exit. Every legal solution is valid. The two walks in this guide are examples, not the only accepted answers.',11)
 b.table([['Print / prepare','What to do'],['One Player Pack','Choose A4 OR US Letter. Print all 10 player pages single-sided at actual size / 100%. Never mix paper sizes.'],['Six map faces','Cut A/B/C fronts on page 4 and matching backs on page 5. Glue blank sides together to make THREE double-sided cards.'],['Markers','Page 6 supplies one party, two clasps and an optional gate patch.'],['Keep nearby','Board page 3, rules page 2, place events pages 7-8 and log page 9. Read opening page 1 together.'],['Keep for the end','Adult holds ending/certificate page 10 until the party walks to E.'],['Adult Guide','12 pages. Read pages 1-4 before play; keep later pages from players. Read on screen or add 12 printed sheets.']],[100,b.width-100],10)
 b.box('WHAT HAS NOT BEEN VERIFIED','Physical printing/black-and-white output, back-to-back gluing on household paper, repeated folding, unfamiliar adult setup, independent family play, age suitability and actual preparation/play duration still require real-world validation.',10.5)
 b.p('English; 2-4 players sharing one party; age 9+ design target. Ordinary 80-100 gsm paper is the starting recommendation for a physical trial. Use a thin glue stick, pencil and adult-handled scissors. Thick card may resist folding.',10.5)
 b.page('ASSEMBLY / PRINT SINGLE-SIDED','Three cards, two useful faces')
 b.art('assembly')
 for title,text in [
  ('1. Check scale','The card-sheet line must measure 88 mm and the board field 176 mm. All faces must be the same size. Print every page at 100%, with Fit / Shrink off. Keep the board whole.'),
  ('2. Cut and pre-crease','Cut only the six solid OUTER squares. Gently pre-crease each dashed line, then flatten. Never cut the fold line or cut away a road.'),
  ('3. Match the faces','Use A FRONT with A BACK, and similarly B and C. Hold both printed TOP edges at the top. Flip the BACK over left-to-right so its print faces down. Bring the blank sides together. The front top-left triangle corresponds to the back top-right triangle.'),
  ('4. Glue and dry','Put the back UNDER the front so the blank sides touch and both TOP edges stay aligned. Apply a thin, even layer of glue and dry flat. Compare a practice fold with page 3, then open it again.'),
  ('5. Set the city','Put A top-left, B top-right and C bottom-left on board page 3, all fronts up, flat, letters upright. D is fixed. Put the party on H, clasps outside the map, gate closed. Share the opening and rules.')]:b.p(title,11,True,gap=3);b.p(text,10.5,gap=11)
 b.page('FOLD / TURN / CHECK THE ORIGINAL SLOT','See what actually changes')
 b.p('Practice away from the board first. These are diagrams of the real A card. The front LEFT column folds onto the second column; the original footprint stays fixed.',10.5)
 b.art('fold')
 b.p('The exposed strip is BOTTOM MAP, not missing paper. The new top strip is REVERSE ROAD. The other two columns remain FRONT. The frame shows the original square slot; do not centre the narrower folded piece.',10.3)
 b.art('turn',width=b.width*.90,x=38+b.width*.05)
 b.p('Turn the whole folded arrangement around the ORIGINAL slot centre. Align the unfolded footprint, not the centre of its narrower paper shape. Lift the marker and return it to the SAME printed turntable. TOP and the card letter rotate with the card.',10.3)
 b.page('SETUP SELF-CHECK / THEN READ PLAYER RULES','Your city should look like this')
 b.art('initial',width=91*mm,x=(b.w-91*mm)/2)
 b.p('All fronts face up, TOP upright, flaps open. A is upper-left; B upper-right; C lower-left. D stays fixed. Party at H; no clasps collected; gate closed.',10.5)
 b.box('THREE CHECKS BEFORE PLAY','1. Card line = 88 mm; board field = 176 mm. 2. A practice fold matches page 3; reopen it. 3. In this initial city, H reaches CC and no other labelled stop. A mismatch is a setup question, not a puzzle.',10.3)
 b.box('SHARE THE JOBS','Read all rules on Player page 2. Reader reads the reached event; Planner names a connection; Handler changes the map; Checker traces it afterwards. Rotate jobs on the FIRST visit to each turntable and after taking a clasp. Player page 9 assigns jobs for 2, 3 or 4 players.',10.3)
 for route_name,title in [('gardenFirst','Garden first'),('binderyFirst','Bindery first')]:
  route=SOL[route_name]
  for start in [0,14]:
   b.page('SAMPLE WALK / ALL LEGAL ROUTES ARE ACCEPTED',title+f' / steps {start+1}-{min(start+14,len(route))}')
   if start==0:b.p('Begin at H with all cards 0O, no clasps and gate closed. Read each After state before proceeding. A2F means A TOP down, flap folded. O is the letter O: open flat. These steps include taking the clasps and opening the gate.',10.3)
   else:b.p('Continue from step 14; do not reset the city. Current state: '+state_text(route[start-1]['after'])+'. Read each After state before proceeding. O means open flat; F means folded inward.',10.3)
   rows=[['Step','Action','After: stop / cards / clasps']]+[[v['step'],v['text'],state_text(v['after'])]for v in route[start:start+14]]
   b.table(rows,[44,b.width*.52,b.width*.48-44],9.4)
   if start==14:b.box('ENDING CHECK','Both clasps are installed, gate open and party at E. Reaching M or opening the gate alone does not finish. Give Player page 10 only after the last walk.',10.5)
   else:b.p('Continue on the next Guide page. Keep all current card states and collected clasps.',10.3)
 b.page('PROGRESSIVE HINTS / GIVE ONE AT A TIME','Help them see the space')
 for title,text in [
  ('Getting started','1: Trace a street that already exists. 2: H connects to CC. 3: Walk to CC; turn C twice clockwise for one route to CA.'),
  ('Garden hut G','1: The hut streets are isolated on A\'s front. 2: Compare that island with the back of its left strip. 3: At CA, fold A and walk along the newly connected road to G. Take the leaf clasp.'),
  ('Bindery desk W','1: The desk is printed on the bottom map. 2: Expose the right edge of the B slot. 3: At CB, set B to 2F. Follow the exposed road to W and take the spool.'),
  ('Reaching the other quarter','1: Find the matching turntable before changing a map. 2: A\'s orientation affects the route to B. 3: In the sample walks, A2O connects CA and CB while C is 2O. These are examples, not forced checkpoints.'),
  ('Crease Lane and the gate','1: Trace the bottom map along C\'s top edge. 2: Return to CC before changing C. 3: C1F connects CC through F to M in the sample finish. Install both clasps at M, then actually walk to E.')]:b.p(title,11,True,gap=4);b.p(text,10.6,gap=13)
 b.p('Level 3 picture examples only / the road shapes depend on your card states:',9.3)
 top=b.y;b.art('hint-garden',width=43*mm,x=70,top=top);b.art('hint-bindery',width=43*mm,x=b.w-70-43*mm,top=top)
 b.y=top-43*mm-10
 b.p('LEFT: A2F joins CA to G. RIGHT: B2F uncovers W beside CB. These examples are help, not mandatory checkpoints. For a different current state use page 11, or choose a page 10 rescue.',9.3)
 b.box('A DIFFERENT LEGAL POSITION?','First check placement and trace a visible return to a turntable. For exact paper-position hints, use Guide page 11. If the team chooses a rescue instead, page 10 gives explicit reset points that keep its clasps. No browser is required for a paper rescue.',10.5)
 b.page('OPTIONAL ADULT RESCUE / SPOILERS','Keep your discoveries, reset the city')
 b.p('Offer one gradual hint at a time from page 9 first. If the team still wants help, agree to a RESCUE RESET. This is a special assistance rule, not a legal walk or a new road. Nobody loses a clasp.',10.5)
 b.p('Choose exactly ONE row matching collected or installed clasps. Rebuild the three card states, put the party at the stated stop and keep the recorded gate state. Circle Rescue used on Player page 9. Restart jobs in their starting order; clear visited turntables except the stop where you are placed. Then continue normal play.',10.5)
 rows=[['Progress','Party / cards','Continue from here']]
 for r in RESCUES:
  a=next((v for v in SOL['gardenFirst'] if v['before']==r['state']),None)
  if r['id']=='spool':a=SOL['binderyFirst'][13]
  text=a['text'] if a else 'Walk to CC'
  rows.append([r['label'],state_text(r['state']),text])
 b.table(rows,[88,b.width*.47,b.width*.53-88],9.4)
 b.p('O = open flat; F = folded. TOP direction: 0 up, 1 right, 2 down, 3 left. Gate stays closed in the first four rows and OPEN in the installed row. Keep the clasps beside the map or marked installed.',10)
 b.art('rescue-both',width=75*mm,x=(b.w-75*mm)/2)
 b.p('Example picture: BOTH CARRIED row. Use your own matching row, not this picture for every rescue. With no clasps, the rescue is the original start. With installed clasps, walk from M to E to finish.',9.8)
 b.page('OPTIONAL COMPANION / NO ACTION HISTORY NEEDED','Help halfway through paper play')
 for title,text in [
  ('1. Record what you can see','On Player page 9, circle each printed TOP direction and flap. Record the party stop, both clasp statuses and whether the gate is open. You do not need to list previous moves.'),
  ('2. Open the helper','Extract the whole ZIP and open companion.html in a modern desktop browser. Select I am playing on paper. Choose the three card states, party stop, taken clasps and gate state. Installed clasps count as taken; an open gate means both are installed.'),
  ('3. Check before changing anything','Check this position validates whether the combination is reachable under the rules. An invalid entry leaves your browser journey unchanged. Check TOP, fold placement, covered stops and the two clasps. The helper cannot see or diagnose your actual printed sheet.'),
  ('4. Compare, then ask for a hint','A valid entry shows a map. Compare it to your paper city before using the three hint levels. You can read hints without replacing the browser journey. If the pictures differ, cancel and recheck the paper.'),
  ('5. Continue in sync if you choose','Use this position and continue replaces the current browser journey. Download the old journey first if you want to keep it. Undo begins at the synchronised position. Restart jobs in their starting order; clear visited turntables except your current stop. Each later digital action must also be made on paper. If you play only on paper again, re-enter its position when seeking help.'),
  ('6. Pause or change device','Download save file stores this starting position plus later actions. Open saved journey restores it. Valid edition 1 action-history files can also be imported. When browser storage is blocked, save a file before closing the tab.')]:b.p(title,11,True,gap=4);b.p(text,10.5,gap=12)
 b.box('STAY ENTIRELY ON PAPER','Use page 9 hints and page 10 adult rescue resets. A browser is optional. Phone handling of local HTML varies; the complete printed game and adult help remain usable without it.',10.5)
 b.page('PAUSE / RECOVER / FINISH','Keep the adventure usable')
 for title,text in [
  ('A road almost meets','Check that squares sit in their exact slots and the flap is creased on the dashed line. Read roads centre-to-centre at matching edges. A visible gap or wrong-way endpoint is not a connection. Reprint a distorted part rather than inventing a bridge.'),
  ('A clasp seems available too soon','G is on A\'s front but isolated before its fold. W and F belong to the bottom map and can be entered only while exposed. Seeing them before assembly is allowed; that does not make a covered street walkable.'),
  ('You opened the gate','At M with both clasps, mark OPEN on log page 9. Optionally cover the printed bar with the page 6 road patch. The final road from M to E is now passable. The whole party must actually follow it.'),
  ('The browser cannot save','Keep the tab open or download a journey file. Open that file later with Open saved journey. It contains only this game\'s starting position and later actions. The paper snapshot also supports continuing entirely on paper.'),
  ('The offline PDF link fails','Extract the WHOLE ZIP first. Keep companion.html and all four PDFs together. Open HTML in a modern desktop browser. Phone local-file handling varies. The paper game and this guide work without a browser.'),
  ('After escaping','Read the ending and fill the certificate. Ask which map change helped the team most. The story has a known ending after the first play; this edition does not promise fresh surprises on every repeat.')]:b.p(title,11,True,gap=3);b.p(text,10.5,gap=10)
 b.p('Licence: adult purchaser and household, private non-commercial play and reasonable household reprinting. Original story, diagrams and game code (c) 2026 Paper Adventure. Physical and independent user validation remains pending.',9.5)
 b.finish();return b

files=[]
for paper in ['A4','Letter']:
 for role,builder in [('players',players),('guide',guide)]:
  b=builder(paper);data=b.path.read_bytes();files.append(dict(path=b.path.name,paper=paper,role=role,pages=b.total,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
(OUT/'manifest.json').write_text(json.dumps(dict(id=D['id'],version=2,title=D['title'],pagesPerFormat=dict(players=10,guide=12),boardMillimetres=176,tileMillimetres=88,files=files),indent=2),encoding='utf8')
(QA/'pdf-layout.json').write_text(json.dumps(measurements,indent=2),encoding='utf8')
(QA/'print-placements.json').write_text(json.dumps(placements,indent=2),encoding='utf8')
print('Built four vector PDFs / 44 pages. Same 176 mm board and 88 mm cards in both paper formats.')
