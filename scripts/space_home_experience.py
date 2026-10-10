"""Complete paper control-centre experience for Space Home."""
import math
from reportlab.platypus import Flowable, Image, Spacer
import generate_celebration_samples as g
from dinosaur_home_experience import p, head, steps, cardgrid

JOBS=['Commander','Navigator','Communicator','Verifier']
LABELS=['4, 5','6, 7','8, 9, 10','11, 12','13, 14, 15']

def symbol(c,x,y,name,r=12):
 name=name.upper()
 c.setStrokeColor(g.NAVY);c.setLineWidth(1.5)
 if name in ['SUN','RING']:
  c.circle(x,y,r,fill=0,stroke=1)
  if name=='RING':c.circle(x,y,r*.6,fill=0,stroke=1)
  else:
   for i in range(8):
    a=i*math.pi/4;c.line(x+math.cos(a)*r*1.3,y+math.sin(a)*r*1.3,x+math.cos(a)*r*1.8,y+math.sin(a)*r*1.8)
 elif name=='MOON':
  q=c.beginPath();q.moveTo(x+5,y+r);q.curveTo(x-r*1.5,y+r,x-r*1.5,y-r,x+5,y-r);q.curveTo(x-r*.5,y-r*.5,x-r*.5,y+r*.5,x+5,y+r);c.drawPath(q)
 elif name=='STAR':
  q=c.beginPath()
  for i in range(10):
   a=math.pi/2+i*math.pi/5;rr=r if i%2==0 else r*.45;xx=x+math.cos(a)*rr;yy=y+math.sin(a)*rr
   if i==0:q.moveTo(xx,yy)
   else:q.lineTo(xx,yy)
  q.close();c.drawPath(q)
 elif name=='PATH':
  c.line(x-r,y-r,x+r,y+r);c.line(x+r,y+r,x+r-8,y+r);c.line(x+r,y+r,x+r,y+r-8)
 elif name=='TRIANGLE':
  q=c.beginPath();q.moveTo(x,y+r);q.lineTo(x-r,y-r);q.lineTo(x+r,y-r);q.close();c.drawPath(q)
 elif name=='CIRCLE':c.circle(x,y,r,fill=0,stroke=1)
 c.setLineWidth(1)

class SpaceBoard(Flowable):
 def __init__(self,w,kind,rows=None,h=260):self.width=w;self.height=h;self.kind=kind;self.rows=rows or []
 def draw(self):
  c=self.canv;w=self.width;h=self.height;c.setStrokeColor(g.LINE)
  def label(x,y,t,size=12):c.setFillColor(g.NAVY);c.setFont('ArialBold',size);c.drawString(x,y,t)
  def box(x,y,bw,bh,t=''):
   c.setStrokeColor(g.LINE);c.roundRect(x,y,bw,bh,4,stroke=1,fill=0)
   if t:label(x+9,y+bh-22,t)
  if self.kind=='record':
   for i,t in enumerate(['1 / Signal: ____   SECTOR: __________','2 / Route: ______   STATION: ______','3 / Device: ____   CODE: ______','4 / Five-letter MESSAGE: __________','5 / PROBE: ____   Reply checked: ____']):
    y=h-(i+1)*65;box(0,y,w,58,t);label(10,y+12,'Evidence: ______________________________________',11)
  elif self.kind=='route':
   label(0,h-20,'FLIGHT MAT / keep whole');bw=(w-40)/4
   for i,t in enumerate(['SECTOR','STAR','NEXT PLACE','STATION']):
    x=i*(bw+12);box(x,55,bw,70,t);symbol(c,x+bw/2,138,'STAR',6)
    if i<3:label(x+bw+3,83,'>')
   label(0,25,'Lay route strips beside the mat; trace the joins with the probe.',11)
  elif self.kind=='decode':
   label(0,h-18,'DECODE LEFT TO RIGHT / CODE: ______');bw=w/5
   for i,name in enumerate(['SUN','MOON','STAR','PATH','RING']):
    symbol(c,bw*(i+.5),h-64,name,12);box(i*bw+5,15,bw-10,55);label(i*bw+12,2,str(i+1),10)
  elif self.kind=='check':
   label(0,h-18,'IDENTITY CHECK / tick matching fields, X mismatches',11)
   for i,t in enumerate(['Probe','Sector','Station','Code','Message']):label(i*w/5+5,h-44,t,11)
   for i,name in enumerate('ABCDE'):
    y=h-68-i*24;label(8,y,name);c.setStrokeColor(g.LINE);c.line(0,y-6,w,y-6)
    for j in range(1,5):c.rect(j*w/5+15,y-2,12,12,stroke=1,fill=0)
  elif self.kind=='reply':
   box(0,0,w,h,'OUTGOING REPLY / submit this whole page to the adult')
   for i,t in enumerate(['TO PROBE:','SECTOR:','STATION:','DEVICE CODE:','DECODED MESSAGE:','Evidence 1 / checkpoint:','Evidence 2 / checkpoint:']):
    y=h-60-i*35;label(12,y,t,12);c.line(w*.5,y-2,w-12,y-2)
   label(12,20,'We checked every field. Ready to restore contact!',12)
  elif self.kind=='drawing':box(0,0,w,h,'DRAW PIP AT THE STATION / optional')
  elif self.kind in ['signal-check','device-check']:
   label(0,h-20,'CHECK ALL THREE CONDITIONS',12)
   names=['Round border','3 waves','Right gap'] if self.kind=='signal-check' else ['Station','Rings','Badge']
   xs=[w*.25,w*.5,w*.75]
   for x,t in zip(xs,names):label(x,h-49,t,11)
   for i,name in enumerate('ABCD'):
    yy=h-80-i*27;label(8,yy,name)
    for x in xs:c.rect(x+10,yy-2,13,13,stroke=1,fill=0)
   label(0,10,'Tick a match, X a mismatch. One choice needs three ticks.',10)
  else:
   n=len(self.rows);ch=h/math.ceil(n/2);cw=w/2
   for i,row in enumerate(self.rows):
    x=i%2*cw;y=h-(i//2+1)*ch;box(x,y,cw,ch,f'{row[0]} / {self.kind.upper()}')
    if self.kind=='signal':
     border,waves,gap,sector=row[1:];label(x+12,y+ch-45,'SECTOR: '+sector)
     cx=x+cw/2;cy=y+ch*.4;r=48;c.setStrokeColor(g.NAVY)
     if border=='Round':c.circle(cx,cy,r,stroke=1,fill=0)
     else:c.rect(cx-r,cy-r,r*2,r*2,stroke=1,fill=0)
     for j in range(int(waves)):
      yy=cy+18-j*16;q=c.beginPath();q.moveTo(cx-28,yy);q.curveTo(cx-14,yy+10,cx-2,yy-10,cx+10,yy);q.curveTo(cx+18,yy+7,cx+25,yy+5,cx+30,yy);c.drawPath(q)
     if gap=='Square':
      gx=cx+r*.70;gy=cy-r*.70 if border=='Round' else cy-r
      c.setFillColor(g.CREAM);c.rect(gx-9,gy-10,20,20,fill=1,stroke=0);c.setStrokeColor(g.NAVY);c.line(gx-9,gy+9,gx-9,gy-9);c.line(gx-9,gy-9,gx+10,gy-9)
     label(x+12,y+10,'Look at the drawing, not a written answer.',9)
    elif self.kind=='device':
     station,rings,badge,code=row[1:];label(x+12,y+ch-47,'STATION: '+station);label(x+12,y+ch-68,'CODE: '+code)
     cx=x+cw/2;cy=y+ch*.35;box(cx-64,cy-45,128,85)
     c.setStrokeColor(g.NAVY)
     for j in range(int(rings)):c.circle(cx-28+j*40,cy+17,12,stroke=1,fill=0)
     symbol(c,cx,cy-17,badge,13);label(x+12,y+12,'Count rings; inspect the badge.',10)
    elif self.kind=='dictionary':
     bw=cw/5
     for j,(name,letter) in enumerate(zip(['SUN','MOON','STAR','PATH','RING'],row[1])):
      cx=x+bw*(j+.5);symbol(c,cx,y+ch-66,name,10);label(cx-4,y+ch-103,letter,17)
    elif self.kind=='probe':
     for j,(name,v) in enumerate(zip(['SECTOR','STATION','CODE','MESSAGE'],row[1:])):label(x+12,y+ch-45-j*21,name+': '+v,12)
    elif self.kind=='marker':symbol(c,x+cw/2,y+ch*.4,'STAR',25)

TASKS=[
 ('Capture the real signal','Signal cards (page 5), expedition record (page 3), four jobs.',[
  'Commander reads: Pip uses a ROUND border, THREE waves and ONE square gap at the LOWER RIGHT. Keep each card upright.',
  'Navigator spreads the four cards. Check the border first, count the separate wavy lines, then inspect the lower-right edge.',
  'Verifier points out why each rejected signal fails. Do not reject a card because you dislike its sector name.',
  'Communicator records the matching signal letter and its SECTOR in row 1. Show the adult all three matching features.'
 ],'Keep the SECTOR for your flight route.'),
 ('Repair the flight route','Five route strips and probe marker (page 7), flight mat (page 6), record.',[
  'Commander reads SECTOR from row 1. Navigator writes it in the first mat box and places the probe beside it.',
  'Navigator tries each strip with that FROM word. Match its TO word with another strip\'s FROM. Lay strips left to right beside the mat.',
  'Verifier traces each join with the probe. If a branch stops at EMPTY FIELD, park it beside the route and try the other branch. Finish at a NUMBERED STATION.',
  'Communicator fills the four places on the mat, then writes the strip letters and station number in row 2. Everyone points to one connection.'
 ],'Show the continuous route and explain the dead end. Keep the station number.'),
 ('Calibrate the communication device','Three private clues (page 9), four device cards (page 10), record.',[
  'Adult gives Commander, Navigator and Verifier one clue each. Communicator listens. In a pair, one person holds two clue cards.',
  'Each holder reads their own clue aloud. Communicator repeats the conditions and reads the previous station number when requested.',
  'Commander checks the station, Navigator counts the drawn rings, Verifier checks the badge shape. ONE device must match all three clues.',
  'Communicator writes its device letter and CODE in row 3. All three clue holders show their matching feature to the adult.'
 ],'Keep the CODE: it selects your password dictionary.'),
 ('Decode Pip\'s message','Three dictionary cards (page 12), symbol message and decoding boxes (page 11), record.',[
  'Communicator reads CODE from row 3. Verifier chooses the dictionary with exactly the same code; put the other two aside.',
  'Commander points to the first message symbol below. Navigator finds that SAME drawing on the selected dictionary and reads its letter.',
  'Communicator writes the letter in box 1. Repeat left to right for boxes 2-5. Every letter must come from the SAME dictionary.',
  'Verifier checks all five symbol-letter pairs. Read the complete word aloud and copy it to record row 4. Show the dictionary and filled boxes to the adult.'
 ],'Keep the decoded MESSAGE and dictionary as final evidence.'),
 ('Send a paper reply','Probe records (page 14), reply card (page 15), record and earlier evidence.',[
  'Communicator reads SECTOR, STATION, CODE and MESSAGE from rows 1-4. Commander checks sector, Navigator station, Communicator code, Verifier message.',
  'Check each probe card against all four facts. Tick matching fields below; mark X for a mismatch. Only a probe with FOUR ticks is accepted.',
  'Write that probe letter in row 5. Fill all five reply fields on page 15 using the record. Two players each point to a different earlier source and fill the two evidence lines.',
  'Verifier rechecks the reply against the chosen probe. Submit the WHOLE reply page to the adult as your pretend transmission. After acceptance, receive Pip\'s confirmation on page 16.'
 ],'The game ends when your reply is accepted and Pip\'s confirmation is read.')]

def task(i,w,board=None):
 title,materials,actions,done=TASKS[i]
 f=head(title,f'CHECKPOINT {i+1} / KEEP WHOLE')+[p('PUT ON THE TABLE',True),p(materials),p('DO THIS TOGETHER',True)]+steps(actions)+[p('READY FOR THE ADULT?',True),p(done)]
 if board:f+=[Spacer(1,8),board]
 return f

def player(s,w):
 pages=[head(s['title'],'PLAYER / SPACE HOME')+[p('Pip the robot probe has lost contact with the control centre. Your crew must find the real signal, repair a route and decode a message. Finally, send a paper reply to bring Pip back online.'),Image(str(g.ROOT/s['cover']),width=320,height=240,kind='proportional'),p('FIVE MISSIONS',True),p('Signal observation > flight route > device calibration > password decoding > reply transmission.'),p('All equipment is printed in this pack. Your adult releases one mission at a time. No phone, electrical equipment or space knowledge is needed.')]]
 pages.append(head('Your control-centre crew','PAGE 2 / CUT FOUR JOBS')+[p('Jobs describe real actions, not acting voices. Pass job cards after checkpoints 1-4. With two players pass two-card bundles; with three pass three bundles. Five/six-player pairs swap speaking/moving and checking tasks.'),cardgrid(list(zip(['ALL / '+x for x in JOBS],[
 'Read one instruction at a time. Invite every teammate to share before deciding. Pair: one reads, one points to evidence.',
 'Spread, connect and move the paper pieces. Explain one connection or feature. Pair: one moves, one checks a rejected option.',
 'Keep the expedition record in the centre. Write the team\'s agreed result and complete its reply. Ask an adult to write spoken answers if needed.',
 'Check every condition, not only the first. Show the adult your result and evidence. Correct mistakes, then request the next mission.'
 ])),w,175),p('Everyone may discuss. Nobody is eliminated. Adult assigns combined jobs for 2-3 players; teams of 7-12 use two full packs.')])
 pages.append(head('Our expedition record','PAGE 3 / KEEP WHOLE')+[p('Communicator records one row after each checkpoint. Use spoken answers with adult help. Keep solved pieces as evidence. Invented crew name: ______________'),SpaceBoard(w,'record',h=330),p('Ask for one hint, try again, then ask for another. You can change a pencil answer. Keep all earlier facts visible until your final reply is accepted.')])
 pages.append(task(0,w,SpaceBoard(w,'signal-check',h=200)))
 pages.append(head('Incoming signals','CHECKPOINT 1 / CUT FOUR CARDS')+[p('Cut four outer rectangles. Keep the card upright: LOWER RIGHT refers to its printed orientation. Colour does not affect the answer.'),SpaceBoard(w,'signal',s['stages'][0]['rows'],h=460)])
 pages.append(task(1,w,SpaceBoard(w,'route',h=175)))
 pages.append(head('Flight route pieces','CHECKPOINT 2 / CUT SIX PIECES')+[p('Example only: FROM EARTH / TO MARS joins FROM MARS / TO BASE. Those example places are not game cards. Move the probe along the printed FROM > TO connections.'),cardgrid([(f'2 / ROUTE {r[0]}',f'<b>FROM:</b> {r[1]}<br/><b>TO:</b> {r[2]}') for r in s['stages'][1]['rows']]+[('2 / PROBE MARKER','PIP<br/>Use this card to trace your route. It is not a route strip.')],w,125)])
 pages.append(task(2,w,SpaceBoard(w,'device-check',h=200)))
 pages.append(head('Share three calibration clues','CHECKPOINT 3 / CUT THREE CARDS')+[p('Adult hands the three cards to their named jobs. Read your own clue aloud, then show it. Guide, Pip and Scout are story messengers, not extra player roles.'),cardgrid([
 ('3 / Commander / Guide','Use the numbered STATION from your flight route.'),('3 / Navigator / Pip','The device has exactly TWO drawn rings.'),('3 / Verifier / Scout','The device has a TRIANGLE badge.')],w,170),p('Communicator repeats the combined requirements after hearing everyone. All clues describe the SAME device. Spare area is not a fourth card.')])
 pages.append(head('Communication devices','CHECKPOINT 3 / CUT FOUR CARDS')+[p('Station and code are printed labels. Rings and badges are drawn features: inspect them before choosing.'),SpaceBoard(w,'device',s['stages'][2]['rows'],h=460)])
 pages.append(task(3,w,SpaceBoard(w,'decode',h=150)))
 pages.append(head('Password dictionaries','CHECKPOINT 4 / CUT THREE CARDS')+[p('Choose only your device code. Example only: if a sample dictionary shows a HEART above Q, a HEART in its message becomes Q. This example is not part of Pip\'s message.'),SpaceBoard(w,'dictionary',[(r[0],''.join(r[1:])) for r in s['stages'][3]['rows']],h=340),p('The drawings are SUN, MOON, STAR, PATH arrow and RING. Use their left-to-right order on page 11. Do not mix dictionaries.')])
 pages.append(task(4,w,SpaceBoard(w,'check',h=205)))
 pages.append(head('Probe identity records','CHECKPOINT 5 / CUT FIVE CARDS')+[p('A card needs all four matching facts. Circle or keep the accepted probe; keep rejected records visible until checked.'),SpaceBoard(w,'probe',s['stages'][4]['rows'],h=465)])
 pages.append(head('Transmit your reply','CHECKPOINT 5 / PAGE 15 / KEEP WHOLE')+[p('Fill every field. Evidence example format: "Checkpoint 2 route ends at our station." Use your own solved sources. Do not write real names.'),SpaceBoard(w,'reply',h=350),p('Two players show two different earlier sources. Verifier submits this page to the adult. If one field is wrong, correct it and resubmit. Paper submission is the transmission; nothing is sent online.')])
 pages.append(head('Contact restored!','PAGE 16 / ADULT HOLDS UNTIL FINAL ACCEPTANCE')+[p('<b>PIP CONFIRMS:</b> "Control crew, your reply reached Probe A in ORION, at Station 7. Device code 6 and message COMET match my records. Contact restored! Thank you for checking every clue."'),p('Everyone shares one contribution. The adult may write your words.'),p('I helped by: ______________________________<br/>One clue we checked again: __________________'),SpaceBoard(w,'drawing',h=290),p('No purchased reward is required. Collect the five numbered piles to reset. The same cards have the same solution; a new job changes your part, not the mystery.')])
 return pages

EVIDENCE=[
 'Signal C has a round border, three waves and the lower-right square gap; its sector is ORION. A has only two waves, B a square border, D no gap.',
 'Route A-B-C links ORION > BLUE STAR > CRESCENT > STATION 7. D-E ends at EMPTY FIELD and cannot reach a numbered station. Accept station 7, not a strip letter.',
 'Device B matches station 7, two rings and a triangle badge; code 6. A has one ring; C a circle badge; D station 5. Require all three clue holders to show their check.',
 'Code 6 maps SUN=C, MOON=O, STAR=M, PATH=E, RING=T: COMET. Other codes decode different words. Check each filled box against its symbol and the SAME dictionary.',
 'Probe A matches ORION, 7, 6 and COMET. B has wrong message, C wrong station, D wrong sector, E wrong code. Reply must contain Probe A plus all four values, with two different earlier evidence sources.'
]

def guide(s,w,counts,base):
 pages=base(s,w,dict(player=16,stages=LABELS))
 mapping=dict(zip(['Reader','Investigator','Recorder','Checker'],JOBS))
 for flow in pages:
  for i,el in enumerate(flow):
   if hasattr(el,'text'):
    t=el.text
    for a,b in mapping.items():t=t.replace(a,b)
    flow[i]=g.p(t,el.style.name if el.style.name in g.STYLES else 'body')
 # Group table needs the same job names as the actual cards.
 from generate_retail_packs import TEAM
 rows=[]
 for number,desc in TEAM:
  for a,b in mapping.items():desc=desc.replace(a,b)
  rows.append([number,desc])
 pages[2][3]=g.grid(['Players per team','Exact assignment'],rows,[w/2,w/2])
 pages[1]=head('Print, cut and sort','HOST / PREPARATION')+[g.p('Print player pages 1-16 once per team: 16 sheets for one team, 32 for two. Choose A4 OR US Letter, single-sided, Actual size. Read this guide on screen; no guide page is a required prop.'),g.grid(['Pages','Contents / cutting','Give when'],[
 ['1-3','Cover, 4 cut jobs, whole record','Before opening'],['4-5','Whole task, 4 cut signals','Checkpoint 1'],['6-7','Whole task/mat, 5 cut routes + 1 probe marker','Checkpoint 2'],['8-10','Whole task, 3 cut clues, 4 cut devices','Checkpoint 3'],['11-12','Whole task/message/decoding board, 3 cut dictionaries','Checkpoint 4'],['13-15','Whole task/check table, 5 cut probe records, whole reply','Checkpoint 5'],['16','Whole confirmation and drawing page','Adult holds until reply accepted']],[w*.15,w*.6,w*.25]),g.p('Count 25 cut pieces per team: 4 jobs + 4 signals + 5 routes + 1 marker + 3 clues + 4 devices + 3 dictionaries + 5 probe records = 29 pieces.'),g.p('Cut only outer prop rectangles. Keep task pages, record, mats, reply and confirmation whole. Keep identifiers attached; ignore spare cells. Separate five numbered mission piles and hold confirmation page 16 separately.'),g.p('No-cut play: point/circle signal, device and probe choices; number whole route cards in sequence and trace them with a finger. Cover unassigned clue messages until each holder reads. Use the whole selected dictionary. Reprint a missing prop page; never invent a replacement clue.')]
 pages[1][4]=g.p('Count 29 cut pieces per team: 4 jobs + 4 signals + 5 routes + 1 probe marker + 3 clues + 4 devices + 3 dictionaries + 5 probe records.')
 for i in range(5):
  title,materials,actions,done=TASKS[i]
  pages[4+i]=head(title,f'HOST / CHECKPOINT {i+1} / PLAYER PAGES {LABELS[i]}')+[g.p('Prepare and distribute','h2'),g.p(materials+' Hold later missions and page 16.'),g.p('Say','h2'),g.box(['"Our incoming signals look similar. Inspect the drawings to find Pip\'s true signal."','"Follow the sector we discovered. Test both routes and trace every join."','"Each of you knows part of the device settings. Listen to everyone before choosing."','"Choose the dictionary by its code, then translate one symbol at a time."','"Check the probe\'s identity, complete a reply and submit it to me. I will check it before restoring contact."'][i],w),g.p('Lead the actions','h2')]+[g.p(f'<b>{j+1}.</b> '+a) for j,a in enumerate(actions)]+[g.p('Accept only after checking','h2'),g.box(EVIDENCE[i],w),g.p('If wrong: show the first failed feature or lookup; allow a correction. Progressive hints are on guide page 10. Accept pointing and dictated writing.'),g.p('Handover','h2'),g.p(done+' '+('Keep evidence, rotate jobs and release pages '+LABELS[i+1]+'.' if i<4 else 'Mark reply accepted, return it to the crew and hand over player page 16. Read Pip\'s confirmation and invite each contribution.'))]
 pages[11]=head('Restore contact and reset','HOST / FINALE')+[g.p('Before reading the confirmation, accept only a reply showing Probe A, ORION, station 7, code 6 and COMET. Ask two players to point to two different solved sources. Let them correct a field without replaying every checkpoint.'),g.p('Mark the reply accepted and return it to the crew. Give player page 16 only now. Read Pip\'s confirmation aloud:'),g.box('"Control crew, your reply reached Probe A in ORION, at Station 7. Device code 6 and message COMET match my records. Contact restored! Thank you for checking every clue."',w),g.p('Go round the crew once: each player names or points to one action they contributed. Complete the optional drawing on page 16. A purchased prize is not necessary.'),g.p('Reset: erase pencil marks on whole sheets. Count the 29 cut pieces and sort the five mission piles. Store the reply and confirmation separately. The cards have the same solution on replay; rotate jobs rather than promising a different mystery.')]
 return pages
