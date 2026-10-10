"""A physical, cooperative Dinosaur Home edition; fixed clue contract unchanged."""
from reportlab.platypus import Flowable, Table, TableStyle, Image, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
import generate_celebration_samples as g

STYLE=ParagraphStyle('dino-player',fontName='Arial',fontSize=13,leading=18,textColor=g.INK,spaceAfter=7)
BOLD=ParagraphStyle('dino-label',parent=STYLE,fontName='ArialBold',textColor=g.NAVY)
SMALL=ParagraphStyle('dino-note',parent=STYLE,fontSize=11,leading=15)
def p(t,b=False):return Paragraph(t,BOLD if b else STYLE)
def head(t,tag):return [g.p(tag,'eyebrow'),g.p(t,'title')]
def steps(items):return [p(f'<b>{i+1}.</b> {t}') for i,t in enumerate(items)]
def cardgrid(items,w,h=140):
 rows=[]
 for i in range(0,len(items),2):
  row=[[p(a,True),p(b)] for a,b in items[i:i+2]]
  if len(row)<2:row.append([p('NOT A CARD',True),p('Keep this area uncut.')])
  rows.append(row)
 t=Table(rows,colWidths=[w/2]*2,rowHeights=[h]*len(rows))
 t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),1,g.LINE),('INNERGRID',(0,0),(-1,-1),1,g.LINE),('BACKGROUND',(0,0),(-1,-1),g.PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),12)]))
 return t

class Board(Flowable):
 def __init__(self,w,kind,rows=None,h=290):self.width=w;self.height=h;self.kind=kind;self.rows=rows or []
 def draw(self):
  c=self.canv;w=self.width;h=self.height;c.setStrokeColor(g.LINE);c.setFillColor(g.NAVY)
  def label(x,y,t,size=12):c.setFillColor(g.NAVY);c.setFont('ArialBold',size);c.drawString(x,y,t)
  def box(x,y,bw,bh,t):c.setStrokeColor(g.LINE);c.roundRect(x,y,bw,bh,5,fill=0,stroke=1);label(x+10,y+bh-23,t)
  if self.kind=='record':
   names=['1 / Footprint letter: ____   START: __________','2 / Strip letters: ______   SIGN: __________','3 / Backpack letter: ____   CODE: ______','4 / TURN: __________   GATE: __________','5 / CAMP: ______']
   for i,t in enumerate(names):
    y=h-(i+1)*68;box(0,y,w,58,t);c.setFont('Arial',11);c.drawString(10,y+12,'Because: ____________________________________________')
  elif self.kind=='map':
   label(12,h-23,'TRAIL BUILDING MAT / keep whole')
   bw=(w-48)/4
   for i,t in enumerate(['START','PLACE 2','PLACE 3','SIGN']):
    x=12+i*(bw+8);box(x,h-125,bw,70,t)
    if i<3:label(x+bw+1,h-90,'>')
   label(12,h-145,'Lay matching strips below the boxes, or beside the mat.',11)
   label(12,23,'DEAD END / park unused strips beside the mat',11)
  elif self.kind=='sign':
   label(12,h-25,'BUILD YOUR SIGNPOST / keep whole')
   box(12,h-83,w/2-20,45,'SIGN: __________');box(w/2+8,h-83,w/2-20,45,'CODE: ______')
   box(12,h-240,w-24,140,'PLACE ONE DIRECTION ARROW HERE')
   box(12,8,w-24,140,'PLACE ONE GATE SHAPE HERE')
  elif self.kind=='check':
   label(12,h-25,'CAMP CHECK / copy your discoveries first')
   label(12,h-48,'START: _________   SIGN: _________',12)
   label(12,h-70,'TURN: _________    GATE: _________',12)
   cols=[0,w*.16,w*.35,w*.55,w*.74,w]
   for i,t in enumerate(['Camp','Start','Sign','Turn','Gate']):label(cols[i]+5,h-96,t,11)
   for i,letter in enumerate('ABCDE'):
    y=h-119-i*23;c.line(0,y-7,w,y-7);label(8,y,letter)
    for j in range(1,5):c.rect(cols[j]+12,y-2,12,12,fill=0,stroke=1)
   label(8,10,'FOUR ticks = a match. Any mismatch rejects the camp.',10)
  elif self.kind=='draw':
   box(0,0,w,h,'DRAW MILO AT THE CAMP / optional keepsake')
  elif self.kind in ['features','supplies']:
   label(12,h-24,'CHECK EACH FEATURE / tick matches, X mismatches')
   names=['3 toes','Round heel','Right notch'] if self.kind=='features' else ['Sign fits','Straps fit','Tag fits']
   xs=[w*.25,w*.5,w*.75]
   for x,t in zip(xs,names):label(x,h-55,t,11)
   for i,letter in enumerate('ABCD'):
    y=h-85-i*27;label(12,y,letter)
    for x in xs:c.rect(x+12,y-2,13,13,fill=0,stroke=1)
   label(12,12,'One card must pass all THREE checks.',11)
  else:
   n=len(self.rows);ch=h/((n+1)//2);cw=w/2
   for i,row in enumerate(self.rows):
    x=i%2*cw;y=h-(i//2+1)*ch;box(x,y,cw,ch,f'{row[0]} / {self.kind.upper()}')
    c.setFont('Arial',12)
    for j,t in enumerate(row[1:]):c.drawString(x+12,y+ch-47-j*19,t)
    cx=x+cw-57;cy=y+48;c.setStrokeColor(g.NAVY);c.setLineWidth(1.5)
    if self.kind=='footprint':
     for j in range(int(row[1].split()[0])):c.circle(cx-20+j*20,cy+27,7,fill=0,stroke=1)
     if 'ROUND' in row[2]:c.ellipse(cx-30,cy-24,cx+30,cy+14,fill=0,stroke=1)
     else:
      q=c.beginPath();q.moveTo(cx-30,cy+14);q.lineTo(cx+30,cy+14);q.lineTo(cx,cy-25);q.close();c.drawPath(q)
     if 'ONE' in row[3]:
      c.setFillColor(g.CREAM);c.rect(cx+17,cy-8,15,17,fill=1,stroke=0);c.line(cx+29,cy+9,cx+15,cy);c.line(cx+15,cy,cx+29,cy-8)
    elif self.kind=='backpack':
     c.roundRect(cx-30,cy-23,60,52,6,fill=0,stroke=1)
     for j in range(int(row[2].split()[0])):c.line(cx-14+j*25,cy+29,cx-14+j*25,cy+43)
     self.shape(c,cx,cy+2,'TRIANGLE' if 'TRIANGLE' in row[3] else 'ROUND')
    elif self.kind=='camp':
     q=c.beginPath();q.moveTo(cx-32,cy-22);q.lineTo(cx,cy+32);q.lineTo(cx+32,cy-22);q.close();c.drawPath(q)
     self.shape(c,cx,cy-7,row[-1].split()[-1],8)
    elif self.kind=='direction':
     q=c.beginPath();q.moveTo(cx-36,cy-8);q.lineTo(cx+8,cy-8);q.lineTo(cx+8,cy-18);q.lineTo(cx+35,cy);q.lineTo(cx+8,cy+18);q.lineTo(cx+8,cy+8);q.lineTo(cx-36,cy+8);q.close();c.drawPath(q)
    elif self.kind=='gate':self.shape(c,cx,cy,row[1],24)
   c.setLineWidth(1)
 @staticmethod
 def shape(c,x,y,name,r=12):
  if name=='ROUND':c.circle(x,y,r,fill=0,stroke=1)
  elif name=='SQUARE':c.rect(x-r,y-r,r*2,r*2,fill=0,stroke=1)
  else:
   q=c.beginPath();q.moveTo(x,y+r);q.lineTo(x-r,y-r);q.lineTo(x+r,y-r);q.close();c.drawPath(q)

TASKS=[
 ('Find Milo\'s footprint','4 footprint cards (page 5), record (page 3), job cards.',[
  'Reader: read Milo\'s description: THREE toes, a ROUND heel, ONE notch on the RIGHT edge. Right means the right side of the printed card.',
  'Investigator: spread all four footprints upright. Count toes first. Point to each heel, then inspect the right edge.',
  'Checker: reject any card with a wrong feature. Tell the team which feature failed; leave rejected cards visible.',
  'Recorder: write the matching footprint letter and its START word in row 1 of the record. Everyone checks all three features before asking the adult.'
 ],'Show the matching footprint and explain all THREE features. Keep the START word for checkpoint 2.'),
 ('Repair the trail map','5 route strips (page 7), building mat (page 6), record.',[
  'Reader: read START from record row 1. Write it in the mat\'s first box. The route must finish at a SIGN.',
  'Investigator: find every strip whose FROM equals START. Try a branch: match its TO to the next strip\'s FROM. Lay strips left to right below the boxes.',
  'Checker: trace each join with a finger. A branch that stops before a SIGN is a dead end; park its strips beside the mat. Try the other branch.',
  'Recorder: write the four places into the mat boxes. Copy the strip letters and final SIGN into record row 2. Each player traces one join.'
 ],'Show the complete chain and the rejected branch. Keep the SIGN name for checkpoint 3.'),
 ('Choose the paper supplies','3 private clue cards (page 9), 4 backpack cards (page 10), record.',[
  'Adult gives the first clue to Reader, second to Investigator, third to Checker. Recorder listens. With two players, one person receives two clues.',
  'Each clue holder reads their own card aloud; do not choose yet. Recorder reads the SIGN from row 2 when a clue asks for it.',
  'Investigator: arrange the backpack cards. Reader checks the sign, Investigator counts straps, Checker checks the tag shape. All three clues must fit ONE backpack.',
  'Recorder: write the backpack letter and its CODE in row 3. Each clue holder points to their matching feature. Show all three clues to the adult.'
 ],'Keep the SIGN and backpack CODE. Both are needed to assemble the signpost.'),
 ('Build the signpost','rule sheet (page 13), arrows and gates (page 14), signpost mat (page 12), record.',[
  'Reader: copy SIGN from row 2 into the mat. Investigator copies CODE from row 3. PINE SIGN is written as PINE on the rule sheet.',
  'Reader checks the sign column of every rule. Investigator checks its code. Checker selects the row matching BOTH inputs; a sign-only match is not enough.',
  'Investigator places that row\'s direction arrow on the mat. Checker places its gate shape below. Say the direction WORD; the arrow on a cut card does not tell you to walk anywhere.',
  'Recorder: write TURN and GATE in row 4. Draw the gate beside its word. Show the built signpost and matching rule to the adult.'
 ],'Keep your assembled signpost. Carry START, SIGN, TURN and GATE to the final checkpoint.'),
 ('Find the welcoming camp','camp check mat (page 15), 5 camp cards (page 16), record, signpost.',[
  'Recorder: copy START, SIGN, TURN and GATE into the check mat. Use rows 1, 2 and 4; PINE SIGN means PINE.',
  'Reader checks START; Investigator checks SIGN; Recorder checks TURN; Checker checks GATE. In a pair each person checks two fields. Report matches aloud.',
  'For each camp, tick a box only when that field matches. A camp with any mismatch is rejected. Agree on the only camp with FOUR ticks.',
  'Recorder writes CAMP in row 5. Two players show two earlier sources: say which earlier result supports a matching camp field. Ask the adult to reveal the ending.'
 ],'Show the four-tick camp and TWO earlier pieces of evidence. The adult gives page 17 only after checking.')]

def task(i,w,extra=None):
 title,materials,actions,done=TASKS[i]
 flow=head(title,f'CHECKPOINT {i+1} / KEEP WHOLE')+[p('PUT ON THE TABLE',True),p(materials),p('DO THIS TOGETHER',True)]+steps(actions)+[p('READY FOR THE ADULT?',True),p(done)]
 if extra:flow+=[Spacer(1,8),extra]
 return flow

def player(s,w):
 pages=[]
 pages.append(head(s['title'],'PLAYER PACK / DINOSAUR HOME')+[p(s['opening']),Image(str(g.ROOT/s['cover']),width=320,height=240,kind='proportional'),p('YOUR FIVE MISSIONS',True),p('Observe footprints > connect the trail > share backpack clues > assemble a signpost > check the camp.'),p('Your adult gives one checkpoint at a time. Stay at the table. You can ask for a hint and correct an answer; nobody is eliminated.')])
 pages.append(head('Everyone has a job','PAGE 2 / CUT FOUR CARDS')+[p('These are team jobs, not acting roles. After checkpoints 1-4, pass cards clockwise. Two players pass their two-card bundles; three players pass three bundles. In teams of 5-6, pairs swap their speaking/moving and checking tasks.'),cardgrid([
 ('ALL / Reader','Read one sentence at a time. Ask each player to share their clue. Pair: one reads, one points; swap next checkpoint.'),('ALL / Investigator','Arrange and move the pieces. Explain what you checked. Pair: one moves, one checks a rejected choice; swap next checkpoint.'),('ALL / Recorder','Keep page 3 in the centre. Record the team\'s decision, not your own guess. You may ask the adult to write your spoken words.'),('ALL / Checker','Test every condition. Ask for printed evidence. Show the completed work to the adult, then request the next checkpoint.')],w,175),p('Everyone can discuss. Listen to each contribution before deciding. Your adult assigns combined jobs for 2-3 players.')])
 pages.append(head('Our expedition record','PAGE 3 / KEEP WHOLE')+[p('Fill one row after each checkpoint. Keep this in the middle. An adult may write your spoken answer. Use an invented team name: __________________'),Board(w,'record',h=345),p('Keep the solved pieces beside the record: they are evidence for the final camp check. Ask for one hint, try again, then ask for another if needed.'),p('Working together: point to a clue when you disagree. Pencil marks can be changed. This is a shared mission, not a race.')])
 pages.append(task(0,w,Board(w,'features',h=200)))
 pages.append(head('Milo\'s footprints','CHECKPOINT 1 / CUT FOUR CARDS')+[p('Cut the four outer rectangles. Keep every label. All features are also written as words; colour is not needed.'),Board(w,'footprint',[
 ('A','3 toes','ROUND heel','ONE right notch','START: SUN'),('B','3 toes','POINTED heel','ONE right notch','START: MOON'),('C','2 toes','ROUND heel','ONE right notch','START: STAR'),('D','3 toes','ROUND heel','NO right notch','START: RAIN')],h=450)])
 pages.append(task(1,w,Board(w,'map',h=200)))
 pages.append(head('Connect the trail','CHECKPOINT 2 / CUT FIVE STRIPS')+[p('Match a TO word to an identical FROM word. Example only: FROM LAKE / TO HILL joins FROM HILL / TO GATE. These example places are not game pieces.'),cardgrid([(f'2 / STRIP {r[0]}',f'<b>FROM:</b> {r[1]}<br/><br/><b>TO:</b> {r[2]}') for r in s['stages'][1]['rows']],w,125),p('Keep the letters attached. Two strips start at SUN; test both branches. Spare area is not a sixth strip.')])
 pages.append(task(2,w,Board(w,'supplies',h=200)))
 pages.append(head('Three explorer messages','CHECKPOINT 3 / CUT THREE CLUES')+[p('Adult distributes these before showing the backpack choices. Read your own message, then share it. Each message describes the SAME backpack.'),cardgrid([
 ('3 / Reader / Guide','Use the SIGN from your repaired trail. PINE SIGN is shortened to PINE on the backpack labels.'),('3 / Investigator / Milo','The backpack has exactly TWO straps. Count them on each card; one strap is not enough.'),('3 / Checker / Scout','The backpack has a TRIANGLE tag. A circle tag does not match.')],w,180),p('Recorder repeats the three conditions after hearing everyone. Do not hide useful information. Guide, Milo and Scout are story messengers, not additional player jobs.')])
 pages.append(head('Choose one backpack','CHECKPOINT 3 / CUT FOUR CARDS')+[p('Check sign, straps and tag together. After choosing, copy its CODE into record row 3.'),Board(w,'backpack',[
 ('A','SIGN: PINE','1 strap','TRIANGLE tag','CODE: 2'),('B','SIGN: PINE','2 straps','TRIANGLE tag','CODE: 4'),('C','SIGN: PINE','2 straps','CIRCLE tag','CODE: 5'),('D','SIGN: ROCK','2 straps','TRIANGLE tag','CODE: 3')],h=450)])
 pages.append(task(3,w))
 pages.append(head('Our assembled signpost','CHECKPOINT 4 / PAGE 12 / KEEP WHOLE')+[p('Copy SIGN and CODE into the top boxes. Place the chosen direction and gate cards inside the large boxes. Keep the assembled mat for the camp check.'),Board(w,'sign',h=440)])
 pages.append(head('Signpost rules','CHECKPOINT 4 / KEEP WHOLE')+[p('Match BOTH inputs before taking an arrow or gate. Check the sign first, then the code. Keep this sheet whole beside the signpost mat.'),cardgrid([(f'4 / RULE {r[0]}',f'SIGN: {r[1]}<br/>CODE: {r[2]}<br/><b>TURN: {r[3]}</b><br/><b>GATE: {r[4]}</b>') for r in s['stages'][3]['rows']],w,180),p('The arrow and gate must come from the SAME rule. No physical compass or movement is required; direction words are puzzle labels.')])
 pages.append(head('Assemble the signpost','CHECKPOINT 4 / CUT SEVEN PIECES')+[p('Cut all seven outer rectangles. Place the chosen arrow and gate on page 12. Keep unused pieces beside the mat.'),Board(w,'direction',[(x,x) for x in ['NORTH','EAST','WEST','SOUTH']],h=220),Spacer(1,8),Board(w,'gate',[(x,x) for x in ['ROUND','SQUARE','TRIANGLE']],h=220)])
 pages.append(task(4,w,Board(w,'check',h=245)))
 pages.append(head('Which camp welcomes Milo?','CHECKPOINT 5 / CUT FIVE CARDS')+[p('Compare every field using page 15. All four must match. The small tents are illustrations; read the labelled facts.'),Board(w,'camp',[(r[0],f'START: {r[1]}',f'SIGN: {r[2]}',f'TURN: {r[3]}',f'GATE: {r[4]}') for r in s['stages'][4]['rows']],h=465)])
 pages.append(head('Milo is home!','PAGE 17 / ADULT HOLDS UNTIL FINISHED')+[p(s['ending']),p('Everyone names one thing they contributed. An adult can write your words.'),p('I helped by: __________________________________<br/>Evidence from checkpoint ____: __________________<br/>Evidence from checkpoint ____: __________________'),Board(w,'draw',h=290),p('Keep your picture. No purchased prize is required. Replaying uses the same solution; try a different job next time.')])
 return pages

EVIDENCE=[
 'A has 3 toes, a round heel and one right notch. B fails the heel, C fails the toe count, D fails the notch. The START printed on A is SUN.',
 'A joins SUN to FERN; B joins FERN to RIVER; C joins RIVER to PINE SIGN. D and E lead SUN to CAVE to ROCK, which is not a sign.',
 'B has PINE, two straps and a triangle tag; its code is 4. A has only one strap, C has a circle tag, D has the wrong sign.',
 'Rule B alone has both PINE and 4. It supplies EAST and ROUND. A and C have wrong codes; D has ROCK. Place EAST arrow and ROUND gate on the mat.',
 'Camp A matches SUN, PINE, EAST and ROUND. B has the wrong gate; C the wrong sign; D the wrong start; E the wrong turn. Accept two different earlier sources, such as footprint A and rule B.'
]
LABELS=['4, 5','6, 7','8, 9, 10','11, 12, 13, 14','15, 16']
def guide(s,w,counts,base):
 pages=base(s,w,dict(player=17,stages=LABELS))
 pages[1]=head('Print, cut and sort','HOST / PREPARATION')+[g.p('One team: print player pages 1-17 once. Two teams: print 34 sheets. Use ONE paper size, single-sided, Actual size. Keep this guide on screen; no guide page is a game prop.'),g.grid(['Player pages','Contents / cutting','When to give'],[
 ['1-3','Cover; 4 cut job cards; whole record','Before opening'],['4-5','Whole task; 4 footprint cards','Checkpoint 1'],['6-7','Whole task/map mat; 5 route strips','Checkpoint 2'],['8-10','Whole task; 3 clue cards; 4 backpacks','Checkpoint 3'],['11-14','Whole task, mat and rule sheet; 4 arrows + 3 gates','Checkpoint 4'],['15-16','Whole task/check mat; 5 camps','Checkpoint 5'],['17','Whole ending/drawing keepsake','After final check']],[w*.15,w*.57,w*.28]),g.p('Count 32 cut pieces per team: 4 jobs + 4 footprints + 5 strips + 3 clues + 4 backpacks + 7 signpost pieces + 5 camps = 32 pieces. Keep all 32 together.'),g.p('Cut only the outer prop rectangles; do not cut task pages, record, mats, rule sheet or keepsake. Ignore areas labelled NOT A CARD. Keep each piece\'s identifier attached.'),g.p('Prepare five numbered piles using the table. Put tasks on top; put the three private clues above backpack cards in pile 3. Keep ending page 17 separately. Check labels and shapes are not cropped before starting.'),g.p('No-cut option: use whole prop pages; point/circle choices and draw the selected arrow and gate on the mat. In checkpoint 3, cover unused messages while each clue holder reads. Missing piece: reprint its page, not an invented clue.')]
 # Exact card count: 4 + 4 + 5 + 3 + 4 + 7 + 5 = 32.
 for i in range(5):
  title,materials,actions,done=TASKS[i]
  pages[4+i]=head(title,f'HOST / CHECKPOINT {i+1} / PLAYER PAGES {LABELS[i]}')+[g.p('Prepare and distribute','h2'),g.p(materials+' Give only this checkpoint. Keep later piles and the ending hidden.'),g.p('Say','h2'),g.box(['"Milo needs us to check his footprint carefully. Let us inspect all three features."','"Our footprint gave us a start. Build a trail from that word to a sign; one branch goes nowhere."','"Three explorers each know one part of the backpack description. Listen to all three before choosing."','"Use the sign and code together. Build the paper signpost that tells Milo which way and which gate."','"Bring your discoveries together. Only one camp agrees with every fact."'][i],w),g.p('Lead the actions','h2')]+[g.p(f'<b>{j+1}.</b> '+a) for j,a in enumerate(actions)]+[g.p('Accept only after checking','h2'),g.box(EVIDENCE[i],w),g.p('If incorrect: point to the first mismatched feature or join. Let the team change only that choice. Use progressive hints on guide page 10; do not add new conditions.'),g.p('Handover','h2'),g.p(done+' '+('Park solved pieces, pass jobs and give player pages '+LABELS[i+1]+'.' if i<4 else 'Reveal player page 17, read the ending and invite each player to describe a contribution.'))]
 return pages
