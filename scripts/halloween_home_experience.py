"""Halloween Home: illustrated paper festival with causal clues and host-held finale."""
import math,re
from reportlab.platypus import Paragraph,Spacer,Table,TableStyle,Image,Flowable
from reportlab.lib.styles import ParagraphStyle
import generate_celebration_samples as g
BODY=ParagraphStyle('halloween-reader',fontName='Arial',fontSize=15,leading=21,textColor=g.NAVY,spaceAfter=10)
HOST=ParagraphStyle('halloween-host',parent=BODY,fontSize=13.5,leading=19,spaceAfter=9)
BOLD=ParagraphStyle('halloween-label',parent=BODY,fontName='ArialBold')
def p(t,host=False):return Paragraph(t.replace('<b>','<font name="ArialBold">').replace('</b>','</font>'),HOST if host else BODY)
def head(t,tag):return [p(tag),Paragraph(t,g.STYLES['title']),Spacer(1,8)]
def lines(xs,host=False):return [p(f'<b>{i+1}.</b> '+x,host) for i,x in enumerate(xs)]
def grid(items,w,h=170,host=False):
 rows=[]
 for i in range(0,len(items),2):
  row=[[p(a,host),p(b,host)] for a,b in items[i:i+2]]
  if len(row)==1:row.append([p('KEEP THIS SPACE UNCUT',host)])
  rows.append(row)
 t=Table(rows,colWidths=[w/2]*2,rowHeights=[h]*len(rows));t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),16),('RIGHTPADDING',(0,0),(-1,-1),16),('TOPPADDING',(0,0),(-1,-1),16),('BACKGROUND',(0,0),(-1,-1),g.PALE)]))
 for i in range(len(items)):t.setStyle(TableStyle([('BOX',(i%2,i//2),(i%2,i//2),1,g.NAVY,1,(4,3))]))
 return t
SCENES=[
 ('A letter at the festival gate',[
  'Orange bunting hangs over the village gate. Pip is getting the paper pumpkin ready for the evening festival, but a gust of wind has scattered its four seals. The pumpkin picture has lost its bright face.',
  '<b>Pip:</b> "I sent a letter asking for help. Mine has a fox seal, two stars and a moon postmark. Can you find it among the fallen letters?"',
  'The team spreads the letters on the table. Almost every letter matches part of the description. Only one matches all three features.',
  '<b>Pip:</b> "The right letter will tell us where to begin and help us recover the first seal."'], 'Which three features must your team check?'),
 ('The wind-tangled festival trail',[
  'Pip opens the checked letter and hands over the SUN seal. The letter names GATE as the starting place. Across the festival, a paper trail has blown apart into separate strips.',
  '<b>Pip:</b> "Our next seal is waiting at the parcel table. Join the place names carefully. One branch leads to a closed shed instead."',
  'The team sets a marker at the gate. The banner and pumpkin stand are places on the paper map; nobody needs to leave the table.',
  '<b>Pip:</b> "Walk the marker along every joined strip. The last strip has a batch code we will need next."'], 'How will you prove that the route reaches the right place?'),
 ('Three helpers, one special parcel',[
  'The marker reaches the parcel table. Pip finds the MOON seal and a batch note. Four decorated parcels wait nearby. The helpers remember different details about the one holding the next seal.',
  '<b>Courier:</b> "I kept the batch note." <b>Decorator:</b> "I remember the stripes." <b>Keeper:</b> "I remember the outline."',
  'Each helper gives one player a separate clue. Everyone must share what they know; no single clue identifies the parcel by itself.',
  '<b>Pip:</b> "Listen to every helper. Then show us one parcel that agrees with all three clues."'], 'Who will share first, and who will listen for the next clue?'),
 ('The festival picture code',[
  'The selected parcel opens to reveal the HAT seal and a picture message. A letter printed on the parcel points to the matching decoder card.',
  '<b>Pip:</b> "The festival helpers wrote the installation order in pictures. Please use the decoder with the same letter as our parcel."',
  'Kite, tree, acorn and flag each stand for a seal name. The team translates them from left to right. The chosen decoder also carries the STAR number.',
  '<b>Pip:</b> "Keep the order exactly as written. Four correct seals in the wrong order will not finish our paper picture."'], 'What earlier discovery tells you which decoder to use?'),
 ('One final check before the celebration',[
  'Pip lays out the dark pumpkin board. Its four spaces are empty; the adult still holds the bright face.',
  '<b>Pip:</b> "Write the numbers we found on their matching seals. Put them in the order from our picture message."',
  'Match each seal to a recorded number, then follow the decoded order. Every teammate checks one result.',
  '<b>Pip:</b> "Show the adult your completed board and two earlier clues. When the checks agree, we can unfold the bright pumpkin together!"'], 'Which discovery will you use to prove your seal is correct?')]
ACTIONS=[
 ['Reader reads FOX, TWO stars, MOON postmark one at a time. Investigator spreads letters A-D, picture side up.', 'Checker compares all three features on every letter. Move a letter aside if any feature fails; explain which one.', 'Recorder writes the chosen letter, its SUN number and its start place in record row 1.', 'Show the adult the letter and all three matches. After acceptance, write the SUN number on its seal and keep it on the record.'],
 ['Read the start place in record row 1. Put the marker at that place on the whole trail board.', 'Find each route strip beginning there. Join a TO place to the same FROM place on another strip, left to right.', 'Try both branches. Park the branch ending at END. Keep the chain that reaches PARCEL TABLE.', 'Move the marker along the kept chain. Record strip letters, MOON number and batch in row 2.', 'Show every join to the adult. After acceptance, fill the MOON seal and keep it with SUN.'],
 ['Give one helper clue to Reader, Investigator and Checker. With two players, share two clues with one player and one with the other.', 'Each holder reads their own clue aloud, then places it where everyone can see it. Recorder reads the batch from row 2.', 'Compare every parcel against all three clues. Choose one parcel satisfying every condition, not just one.', 'Record its letter and HAT number in row 3. Each clue holder points to their matching feature.', 'Show the parcel and all three clues to the adult. After acceptance, fill the HAT seal.'],
 ['Read the parcel letter in row 3. Choose the decoder card with that same letter.', 'Place the picture message beside it. Read KITE, TREE, ACORN, FLAG from left to right.', 'Look up each picture on that decoder. Write the four translated seal names into the order strip.', 'Read the STAR number on that same card. Record the order and number in row 4.', 'Checker repeats all four lookups. Show the adult the decoder and order; after acceptance, fill STAR.'],
 ['Lay the board flat. Bring the four seals, record and decoded order.', 'Recorder reads each number; Checker points to its source letter, route, parcel or decoder.', 'Investigator lays seals in the four slots in decoded order. Everyone checks one.', 'Read the four digits left to right. Write them in row 5 and choose the matching check card.', 'Show the board and two earlier evidence cards to the adult. Correct any mismatch.', 'After acceptance, lift the seals, unfold the bright face over the dark face, replace the seals and hear the ending.']]
FEEDBACK=[
 'Pip checks letter C: fox, two stars, moon. "All three agree! Here is SUN. Write 5 on it. Our trail begins at GATE." Pip points to the scattered route strips. The next seal waits where the parcels are sorted.',
 'Pip traces A-B-C from GATE through BANNER and PUMPKIN STAND to PARCEL TABLE. "You avoided the closed shed! Write 7 on MOON and keep batch P3." Three helpers step forward beside the waiting parcels.',
 'All three helpers point to parcel B: P3, two stripes, round outline. "Our clues agree! Write 2 on HAT," says Pip. Inside is a picture message. The parcel letter B will tell the team which decoder to use.',
 'Pip reads the translation: SUN, MOON, HAT, STAR. "You used decoder B for every picture! Write 3 on STAR. Now we have every number and the installation order." The dark pumpkin board is ready for the final check.',
 'Pip smiles as the adult unfolds the bright pumpkin face. "Every seal has its place, and every clue helped us get here. The paper festival can begin!" Each teammate shows one action they contributed. The pumpkin stays on the table as your finished team creation.']
class Art(Flowable):
 def __init__(self,w,kind):self.width=w;self.kind=kind;self.height=340 if kind=='letters' else 440 if kind=='parcels' else 450 if kind in ['pumpkin','bright'] else 410 if kind=='message' else 350
 def label(self,x,y,s,size=14,bold=False):
  self.canv.setFillColor(g.NAVY);self.canv.setFont('ArialBold' if bold else 'Arial',size);self.canv.drawString(x,y,s)
 def star(self,x,y,r=10):
  path=self.canv.beginPath()
  for i in range(10):
   a=math.pi/2+i*math.pi/5;rr=r if i%2==0 else r*.43;xx=x+math.cos(a)*rr;yy=y+math.sin(a)*rr
   if i==0:path.moveTo(xx,yy)
   else:path.lineTo(xx,yy)
  path.close();self.canv.drawPath(path,fill=0,stroke=1)
 def icon(self,x,y,name):
  c=self.canv;c.setStrokeColor(g.NAVY);c.setLineWidth(1.5)
  if name in ['STAR','Stars']:self.star(x,y,13)
  elif name in ['SUN','Sun']:c.circle(x,y,9);[c.line(x+math.cos(i*math.pi/4)*13,y+math.sin(i*math.pi/4)*13,x+math.cos(i*math.pi/4)*18,y+math.sin(i*math.pi/4)*18) for i in range(8)]
  elif name in ['MOON','Moon']:c.arc(x-14,y-14,x+14,y+14,60,240);c.arc(x-2,y-14,x+20,y+14,90,180)
  elif name=='HAT':c.line(x-18,y-10,x+18,y-10);path=c.beginPath();path.moveTo(x-12,y-10);path.lineTo(x,y+17);path.lineTo(x+12,y-10);path.close();c.drawPath(path)
  elif name in ['Fox','Owl']:
   c.circle(x,y,15);c.circle(x-5,y+2,2);c.circle(x+5,y+2,2)
   if name=='Fox':c.line(x-14,y+6,x-15,y+25);c.line(x-15,y+25,x-4,y+13);c.line(x+14,y+6,x+15,y+25);c.line(x+15,y+25,x+4,y+13)
   else:c.circle(x-5,y+2,6);c.circle(x+5,y+2,6)
  elif name=='TREE':c.line(x,y-17,x,y+7);c.circle(x,y+8,14)
  elif name=='KITE':path=c.beginPath();path.moveTo(x,y+18);path.lineTo(x+13,y);path.lineTo(x,y-18);path.lineTo(x-13,y);path.close();c.drawPath(path);c.line(x,y-18,x+9,y-27)
  elif name=='FLAG':c.line(x-12,y-20,x-12,y+20);c.rect(x-12,y+2,25,18)
  elif name=='ACORN':c.ellipse(x-10,y-13,x+10,y+10);c.line(x-13,y+7,x+13,y+7);c.line(x,y+10,x+3,y+18)
 def draw(self):
  c=self.canv;w=self.width;h=self.height;c.setStrokeColor(g.NAVY);c.setLineWidth(1)
  if self.kind in ['letters','parcels']:
   rows=([('A','Fox',2,'Sun','4 / SHED'),('B','Owl',2,'Moon','6 / TREE'),('C','Fox',2,'Moon','5 / GATE'),('D','Fox',1,'Moon','8 / PATH')] if self.kind=='letters' else [('A','P3',1,'Round','4'),('B','P3',2,'Round','2'),('C','P3',2,'Square','6'),('D','P2',2,'Round','8')])
   cw=w/2;ch=h/2
   for i,row in enumerate(rows):
    x=i%2*cw;y=(1-i//2)*ch;c.setDash(4,3);c.rect(x,y,cw,ch);c.setDash();self.label(x+15,y+ch-24,row[0],16,True)
    if self.kind=='letters':
     self.icon(x+42,y+ch-65,row[1]);self.label(x+70,y+ch-67,row[1],13)
     for j in range(row[2]):self.star(x+35+j*28,y+ch-99)
     self.label(x+95,y+ch-103,str(row[2])+(' star' if row[2]==1 else ' stars'),13);self.icon(x+35,y+ch-128,row[3]);self.label(x+65,y+ch-132,row[3]+' postmark',12)
     self.label(x+15,y+10,'SUN / Start: '+row[4],12,True)
    else:
     cx=x+cw/2;cy=y+ch/2
     if row[3]=='Round':c.roundRect(cx-65,cy-40,130,70,24)
     else:c.rect(cx-65,cy-40,130,70)
     for j in range(row[2]):c.line(cx-20+j*40,cy-39,cx-20+j*40,cy+29)
     self.label(x+15,y+ch-46,'Batch: '+row[1],14);self.label(x+15,y+32,f'{row[2]} '+('stripe' if row[2]==1 else 'stripes')+' / '+row[3],13);self.label(x+15,y+12,'HAT number: '+row[4],13,True)
  elif self.kind=='trail':
   names=['GATE','BANNER','PUMPKIN STAND','PARCEL TABLE','SHED','END']
   for i,n in enumerate(names):
    x=(i%2)*(w/2);y=270-(i//2)*95;c.roundRect(x+5,y,w/2-10,72,6);self.label(x+17,y+30,n,13,True)
   self.label(10,5,'Point or move the marker as you read each joined strip.',12)
  elif self.kind in ['pumpkin','bright']:
   c.ellipse(20,115,w-20,h-35);c.ellipse(75,115,w-75,h-35);c.ellipse(130,115,w-130,h-35);c.rect(w/2-14,h-35,28,25)
   # Same face geometry on both boards: bright top overlays dark at actual size.
   for x in [w*.35,w*.65]:c.circle(x,285,18,fill=self.kind=='bright')
   c.arc(w*.3,170,w*.7,250,180,180)
   if self.kind=='pumpkin':
    sw=(w-20)/4
    for i in range(4):c.rect(10+i*sw,12,sw,85);self.label(18+i*sw,78,str(i+1),14,True)
   else:
    for sx,sy,rad in [(58,350,13),(w-56,345,13),(79,165,10),(w-79,160,10),(w/2,375,12),(w/2,133,9)]:self.star(sx,sy,rad)
    c.setDash(4,3);c.line(0,105,w,105);c.setDash();self.label(10,85,'FOLD HERE / ADULT HOLDS THIS FACE',12,True);self.label(10,60,'Our team helped by: __________________________',12);self.label(10,30,'A clue we checked: ___________________________',12)
  elif self.kind=='message':
   for i,n in enumerate(['KITE','TREE','ACORN','FLAG']):
    x=15+i*w/4;c.rect(x,90,w/4-20,250);self.icon(x+40,285,n);self.label(x+8,245,n,14,True);self.label(x+8,170,'Seal '+str(i+1)+':',13);self.label(x+8,137,'________',15)
   self.label(10,55,'Translate the pictures on ONE matching decoder.',14)
   self.label(10,25,'STAR number: ______',14,True)

class Marker(Art):
 def __init__(self,w):self.width=w;self.height=100;self.kind='marker'
 def draw(self):
  c=self.canv;c.setStrokeColor(g.NAVY);c.setDash(4,3);c.rect(0,30,65,55);c.setDash();self.icon(23,58,'Fox');self.label(43,52,'PIP',10,True)
  self.label(90,65,'CUT ONE SMALL MARKER',13,True);self.label(90,40,'Move it on the whole trail board.',13)

class SealSheet(Art):
 def __init__(self,w):self.width=w;self.height=190;self.kind='seals'
 def draw(self):
  c=self.canv;sw=(self.width-20)/4
  for i,name in enumerate(['SUN','MOON','HAT','STAR']):
   x=14+i*sw;c.setStrokeColor(g.NAVY);c.setDash(4,3);c.rect(x,70,sw-8,75);c.setDash();self.icon(x+26,116,name);self.label(x+48,111,name,11,True);self.label(x+8,83,'Number: ____',12)
  self.label(10,20,'Four seals: each fits inside one pumpkin slot.',13)

class RecordBoard(Flowable):
 def __init__(self,w):self.width=w;self.height=470
 def draw(self):
  c=self.canv;c.setStrokeColor(g.LINE);c.setFillColor(g.NAVY)
  rows=[('1 / LETTER','Choice: ______   SUN: ______   Start: ______________'),
        ('2 / ROUTE','Strips: __________   MOON: ______   Batch: ______'),
        ('3 / PARCEL','Choice: ______   HAT: ______'),
        ('4 / MESSAGE','Decoder: ______   STAR: ______   Order: ______________'),
        ('5 / PUMPKIN','Four digits: ______   Adult checked: YES / RETRY')]
  for i,(title,fields) in enumerate(rows):
   y=376-i*94;c.roundRect(0,y,self.width,88,7,stroke=1,fill=0)
   c.setFont('ArialBold',14);c.drawString(14,y+64,title)
   c.setFont('Arial',12);c.drawString(14,y+39,fields)
   c.setFont('Arial',11);c.drawString(14,y+15,'Our evidence: _________________________________________________')

def mission(i,w):
 title,paras,q=SCENES[i]
 return head(title,f'CHECKPOINT {i+1} / READ THE STORY, THEN PLAY')+[p(t) for t in paras]+[p('<b>Talk together:</b> '+q),p('<b>Put on the table:</b> '+MATERIALS[i])]+lines(ACTIONS[i])
GROUPS=[('2','Reader + Recorder; Investigator + Checker. Swap both bundles each mission.'),('3','Reader; Investigator; Recorder + Checker. Pass the three bundles clockwise.'),('4','One job each. Pass all four cards clockwise after each mission.'),('5','Reader pair; one Investigator, Recorder and Checker. Partners swap reader/pointer.'),('6','Reader pair; Investigator pair; Recorder; Checker. Partners swap operator/verifier.')]
MAP=[(4,5),(6,8),(9,11),(12,14),(15,17)]
MATERIALS=['Letters A-D (page 5), record and jobs. Adult holds the blank seals.','Trail board and marker (page 7), five strips (page 8), record and SUN.','Three helper clues (page 10), four parcels (page 11), record and earned seals.','Picture message (page 13), four decoder cards (page 14), record.','Pumpkin board (page 16), four completed seals, check cards (page 17), record. Adult holds page 18.']
def player(s,w):
 pages=[head(s['title'],'PLAYER / HALLOWEEN HOME')+[p('Help Pip find four seals and restore the festival pumpkin.'),Image(str(g.ROOT/s['cover']),width=400,height=300,kind='proportional'),Spacer(1,14),p('<b>A letter from Pip</b>'),p('A gust of wind has blown four paper seals off the festival pumpkin. Follow Pip through five connected discoveries, then put the seals back in the order hidden in the picture message.'),p('The adult gives one mission at a time. Read the story at the top of each mission page, then follow the steps beneath it. Your choices change what you can use next.'),p('Ages 6-12. One team for 2-6 players; two complete sets for 7-12. An adult hosts and reads when needed.')]]
 pages.append(head('Your festival team','PAGE 2 / CUT FOUR JOB CARDS')+[p('The adult assigns jobs before the first story. Share decisions; pass jobs after missions 1-4.'),grid([('Reader','Read one sentence. Invite every teammate to share. Partner points to the clue.'),('Investigator','Move and compare pieces. Explain one match. Partner checks a rejected choice.'),('Recorder','Write agreed discoveries. Ask the adult to write your spoken answers if needed.'),('Checker','Check every condition. Show evidence to the adult. Request the next mission.')],w,215),p('With two or three players, one person can hold two jobs. Paired players swap actions. Nobody needs to act a story character.')])
 pages.append(head('Our festival discoveries','PAGE 3 / KEEP WHOLE')+[p('Keep this board in the middle of the table. After each mission, write the result and one fact that proves it. Spoken answers are welcome; an adult can write for you.'),RecordBoard(w),p('Keep earned seals beside this board. If something does not match later, return to the printed clue and correct that row.')])
 props=[
  [head('Four letters and the seal pieces','CHECKPOINT 1 / PAGE 5 / CUT CARDS AND SEALS')+[p('Cut four letters on their dashed borders. Compare all three clues. Adult: cut the four blank seals too; keep them until each mission is accepted.'),Art(w,'letters'),SealSheet(w)]],
  [head('The festival trail board','CHECKPOINT 2 / PAGE 7 / KEEP BOARD WHOLE, CUT MARKER')+[p('Join strips beside this board. The whole game stays at the table.'),Art(w,'trail'),Marker(w),p('To join strips, match the place after > on one strip with the place before > on the next. Move the marker one joined place at a time.')],head('Wind-scattered route strips','CHECKPOINT 2 / PAGE 8 / CUT FIVE STRIPS')+[grid([('D','GATE > SHED'),('B','BANNER > PUMPKIN STAND'),('E','SHED > END'),('C','PUMPKIN STAND > PARCEL TABLE<br/>MOON: 7 / Batch: P3'),('A','GATE > BANNER')],w,165),p('Dashed borders: cut. Lay strips left to right and keep the branch reaching PARCEL TABLE.')]],
  [head('Three helpers share clues','CHECKPOINT 3 / PAGE 10 / CUT THREE CLUES')+[p('Each helper knows only one part. Give cards to different players where possible. Read aloud, then place them together.'),grid([('Courier','Use the batch recorded at the parcel table.'),('Decorator','Our parcel has TWO stripes.'),('Keeper','Our parcel has a ROUND outline.')],w,230),p('All three clues must describe the SAME parcel. With two players, one reads two cards; both discuss the answer.')],head('The waiting parcels','CHECKPOINT 3 / PAGE 11 / CUT FOUR PARCELS')+[p('Compare the parcel drawings and printed words with all three helper clues.'),Art(w,'parcels')]],
  [head('The picture message','CHECKPOINT 4 / PAGE 13 / KEEP WHOLE')+[p('Choose one decoder using your parcel letter. Read the four pictures left to right and write each seal name in its numbered space.'),Art(w,'message')],head('Festival decoder cards','CHECKPOINT 4 / PAGE 14 / CUT FOUR DECODERS')+[p('Cut four decoders. Only the card matching your parcel letter gives the order to use.'),grid([('Decoder A','KITE: MOON<br/>TREE: SUN<br/>ACORN: HAT<br/>FLAG: STAR<br/>STAR number: 4'),('Decoder B','KITE: SUN<br/>TREE: MOON<br/>ACORN: HAT<br/>FLAG: STAR<br/>STAR number: 3'),('Decoder C','KITE: STAR<br/>TREE: HAT<br/>ACORN: SUN<br/>FLAG: MOON<br/>STAR number: 6'),('Decoder D','KITE: HAT<br/>TREE: SUN<br/>ACORN: STAR<br/>FLAG: MOON<br/>STAR number: 8')],w,265)]],
  [head('Restore the paper pumpkin','CHECKPOINT 5 / PAGE 16 / KEEP WHOLE')+[p('Put the completed seals in the four numbered slots. Use the order from the picture message and explain where every number came from.'),Art(w,'pumpkin')],head('Final number check','CHECKPOINT 5 / PAGE 17 / CUT FOUR CHECK CARDS')+[p('Read your four seals left to right, then choose the matching check card. Tell the adult two earlier clues.'),grid([('A','5723'),('B','5732'),('C','7523'),('D','5724')],w,220),p('The matching card verifies your work. The pumpkin reveal is the team result.')]]]
 for i in range(5):
  pages.append(mission(i,w))
  pages.extend(props[i])
 pages.append(head('The bright pumpkin reveal','PAGE 18 / ADULT HOLDS UNTIL FINAL ACCEPTANCE')+[p('Fold the lower panel behind along the dashed line. After the final check, unfold and lay the illustrated panel over the dark pumpkin face. Leave the four seal slots visible.'),Art(w,'bright')])
 return pages

def guide(s,w,counts,base):
 hp=lambda t:p(t,True)
 pages=[head(s['title'],'HOST / QUICK START')+[hp('Keep this guide on screen. Your 2-12 players do not include the adult host.')]+lines(['For 2-6 players, prepare one team. For 7-12, make two balanced teams: 3+4, 4+4, 4+5, 5+5, 5+6 or 6+6. Prepare a separate complete set per team.','Print 25 Player Pack sheets per team in ONE size, single-sided at 100% / Actual size. Minimum: 24 if you read the cover on screen. Do not print both sizes.','You need paper, printer, two pencils and an eraser per team. Adult-handled scissors are recommended; no glue, candles, toys or prize are needed.','Read preparation page 2 and grouping page 3. Keep page 25 and future mission piles behind you. Give only jobs and record first.','Read the opening on page 4. Release one mission at a time and check its evidence before advancing.'],True)]
 inventory=['2: four jobs. 3: whole record.','4-7: story, actions, four letters, four seals. Cut seals now; release SUN only.','8-12: story, actions, whole trail, five strips, one marker. Release MOON after check.','13-16: story, actions, three private clues, four parcels. Release HAT after check.','17-20: story, actions, whole message, four decoders. Release STAR after check.','21-24: story, actions, whole pumpkin board and four number cards.','25: bright face / keepsake. Fold back the lower half. Hold until final acceptance.']
 pages.append(head('Print, cut and sort','HOST / PREPARATION')+[hp(t) for t in inventory]+[hp('<b>33 pieces per team:</b> 4 jobs + 4 letters + 4 seals + 5 routes + 1 marker + 3 helper clues + 4 parcels + 4 decoders + 4 check cards.'),hp('Cut only dashed card borders; do not cut empty cells. Keep solid boards whole. No-cut option: point on whole sheets, record seal names/numbers on page 3 and point to the four board slots.'),hp('Page 25: fold at the dashed line; the image half overlays the dark face, not the seal slots. No need to build a real lamp. Keep adult-only pages out of reach.')])
 pages.append(head('Make every player useful','HOST / GROUPING')+[hp('<b>'+n+' players:</b> '+v) for n,v in GROUPS]+[hp('For 5-6 players, pairs keep their jobs and swap actions after each mission. Other groups pass card bundles clockwise. Invite a quieter player to show one fact before accepting an answer.'),hp('Low reading confidence: read a sentence, let children point/move/say the result, and write their dictated answer. Confident readers explain why a near-match fails. Both use the same puzzle.'),hp('Two teams solve independently. Visit both tables; let a waiting team explain rejected choices or draw its favourite scene without sharing answers.')])
 pages.append(head('Set the table and begin','HOST / OPENING')+[hp('Table areas: CURRENT MISSION in the middle; RECORD + earned seals beside it; SOLVED EVIDENCE to one side. HOST ONLY: later piles, this guide and bright face.'),hp('<b>Read:</b> "Pip is preparing a friendly paper festival. The wind scattered four seals from the pumpkin picture. Your team will find them, discover their order and restore the picture together."'),hp('"Everyone shares a clue before choosing. Show me what you found and why. Ask for a hint if you need one. We can correct mistakes; nobody is eliminated."'),hp('Assign jobs. Ask each child to say or show their action. Give pages 4-6; keep page 7 until the first check. Read story page 4, then use action page 5.')])
 answers=['C / SUN 5 / GATE','A-B-C / MOON 7 / P3','B / HAT 2','B / SUN-MOON-HAT-STAR / STAR 3','A / 5723']
 evidence=['C is Fox, 2 stars, Moon. A has Sun postmark; B has Owl; D has 1 star.','A joins GATE to BANNER; B to PUMPKIN STAND; C to PARCEL TABLE. D-E stops at END.','B has P3, 2 stripes, Round. A has 1 stripe; C is Square; D is P2.','Only decoder B matches parcel B. Its four lookups give SUN, MOON, HAT, STAR, with STAR 3.','SUN 5, MOON 7, HAT 2, STAR 3 in that order gives 5723. B swaps the last digits; C swaps the first; D changes STAR.']
 for i in range(5):
  lo,hi=MAP[i];title,paras,q=SCENES[i]
  pages.append(head(title,f'HOST / CHECKPOINT {i+1} / STORY')+[hp('<b>Prepare and distribute:</b> '+f'Player pages {lo}-{hi}. '+('Hold page 7 until the letter is accepted. ' if i==0 else '')+MATERIALS[i]),hp('Read the player story aloud, or invite the Reader to read it. Keep answers below out of player view.')]+[hp(x) for x in paras]+[hp('<b>Ask:</b> '+q),hp('<b>After acceptance, read:</b> '+FEEDBACK[i])])
  pages.append(head('Run and check mission '+str(i+1),f'HOST / CHECKPOINT {i+1} / OPERATIONS')+lines(ACTIONS[i],True)+[hp('<b>Accept only:</b> '+answers[i]),hp('<b>Evidence:</b> '+evidence[i]),hp('<b>If wrong:</b> Ask which condition fails. Return to the relevant evidence and correct only the affected record field. Let the team try again.'),hp('<b>Handover:</b> '+('Keep evidence and record. Rotate jobs or paired actions. Release the next pile after reading the checked-result story.' if i<4 else 'Release page 25 only after checking all four seals, their order and two earlier supporting clues.'))])
 pages.append(head('Hints without taking over','HOST / SUPPORT')+[hp('Give hint 1, allow a new attempt, then hint 2. Use the answer only after another attempt or when frustration prevents progress.')]+[hp('<b>Mission '+str(i+1)+'</b><br/>1: '+a+'<br/>2: '+b+'<br/>3: '+answers[i]) for i,(a,b) in enumerate([('Check all three letter features.','A moon postmark alone is not enough.'),('Begin at the recorded start.','Compare the destination of both branches.'),('Listen to all three helper cards.','The same parcel must match P3, two stripes and round.'),('Find the parcel letter first.','Use one decoder for all four pictures, left to right.'),('Match seal names before reading numbers.','Trace every number back to its original evidence.')])])
 pages.append(head('Finish, keep and reset','HOST / FINALE')+[hp('Check: all four names used once; each number agrees with its source; order agrees with decoder B; final code agrees with A. Ask two different children to show two supporting discoveries.'),hp('Take seals off the dark board. Give the folded bright face. Let the children unfold it and align the pumpkin outline on its upper panel with the dark pumpkin outline, keeping the numbered slots uncovered. Return the seals. Read the final checked-result story.'),hp('Invite each child to show one contribution. Use the lower keepsake area for a drawing or dictated sentence. No extra prize is necessary.'),hp('Reset: collect all 33 pieces, keep five mission piles, erase pencil values and fold the bright face back. The solution stays the same; change jobs for another play.'),hp('Lost piece: reprint its labelled prop page. If an earlier result is wrong, return to that pile and correct the discovery before proceeding. Pause by keeping each team\'s record and piles together.')])
 return pages

# One operational page per mission keeps the story, handout, validation and
# checked-result transition together in the adult's reading order.
_legacy_guide=guide
def guide(s,w,counts,base):
 hp=lambda text:p(text,True)
 old=_legacy_guide(s,w,counts,base)
 out=[head(s['title'],'HOST / QUICK START')+[hp('Read this guide on screen. The adult host is outside the 2-12 player count.')]+[
  hp('<b>1.</b> Use one team for 2-6, or two complete teams for 7-12.'),
  hp('<b>2.</b> Print all 18 Player Pack pages per team, single-sided at 100% / Actual size. Print 17 only if you show the cover on screen. Choose A4 or US Letter, not both.'),
  hp('<b>3.</b> Provide ordinary paper, two pencils and an eraser per team. Adult-handled scissors are useful. No candle, lamp, toy, glue or prize is needed.'),
  hp('<b>4.</b> Cut and sort as listed on the next page. Keep the four blank seals and final reveal yourself.'),
  hp('<b>5.</b> Give jobs and record first. Read the opening, then release one numbered mission at a time. Check each result before the next story.')]]
 out.append(head('Print, cut and sort','HOST / PREPARATION')+[
  hp('Pages 2-3: cut four jobs; keep the team record whole.'),
  hp('Mission 1 / pages 4-5: story and actions on 4, four letters and four seals on 5. Cut the seals; adult holds all four until earned.'),
  hp('Mission 2 / pages 6-8: story and actions on 6, whole route board and small cut marker on 7, five cut strips on 8.'),
  hp('Mission 3 / pages 9-11: story and actions on 9, three separate helper clues on 10, four parcels on 11.'),
  hp('Mission 4 / pages 12-14: story and actions on 12, whole picture message on 13, four cut decoders on 14.'),
  hp('Mission 5 / pages 15-17: story and actions on 15, whole pumpkin board on 16, four cut check cards on 17.'),
  hp('Page 18: adult-held folding pumpkin face and keepsake. Give only after the final check.'),
  hp('<b>33 cut pieces per team:</b> 4 jobs + 4 letters + 4 seals + 5 route strips + 1 marker + 3 helper clues + 4 parcels + 4 decoders + 4 check cards.'),
  hp('Cut dashed borders only; keep solid boards whole. Ignore empty card-grid cells. For no-cut play, point to printed pieces and record seal names and values on page 3.')])
 out.append(old[2])
 out.append(head('Set the table and begin','HOST / OPENING')+[
  hp('CURRENT MISSION goes in the middle; RECORD + earned seals stay beside it; SOLVED EVIDENCE goes to one side. Keep later piles, this guide, blank seals and page 18 with you.'),
  hp('<b>Read:</b> "Pip is preparing a friendly paper festival. The wind scattered four seals from the pumpkin picture. Your team will find them, discover their order and restore the picture."'),
  hp('"Every mission begins with the next part of the story. Read it before touching new props. Share a clue, then show your answer and evidence. You may ask for help or correct a mistake."'),
  hp('Give pages 2 and 3. Assign jobs and ask each child to show what their job does. Read the story at the top of page 4, then give the four letters from page 5. Keep the blank seals with you.')])
 for i in range(5):
  lo,hi=MAP[i]
  flow=head(SCENES[i][0],f'HOST / CHECKPOINT {i+1} / READ, PLAY, VERIFY')+[
   hp(f'<b>Prepare and distribute:</b> Player pages {lo}-{hi}. Read the story on page {lo} aloud or let the Reader read it. Give only this mission\'s props.'),
   hp('<b>Ask before play:</b> '+SCENES[i][2])]
  operation=old[5+i*2][3:]
  for el in operation:
   if hasattr(el,'text'):
    value=el.text.replace('page 25','page 18').replace('Give checkpoint','Give mission')
    if 'Release page 18' in value and i==4:value='After accepting, ask two children for two earlier facts. Then give folded page 18 and use the finale instructions on page 11.'
    if 'Handover' in value and i<4:value=value.replace('after reading the checked-result story','after you read the checked-result story below')
    flow.append(hp(value))
   else:flow.append(el)
  if i<4:flow.append(hp('<b>After acceptance, read before the next mission:</b> '+FEEDBACK[i]))
  out.append(flow)
 out.append(old[-2])
 out.append(head('Unfold the ending','HOST / FINALE')+[
  hp('Check that all four seal names appear once. Trace every number to an earlier clue. Decoder B gives SUN-MOON-HAT-STAR; the completed number is 5723 and matches card A. Two players should show two different supporting clues.'),
  hp('Give folded page 18 only now. Lift the four seals from page 16. Let children unfold the bright face, align its pumpkin outline over the dark one, and leave the four numbered slots visible. Return the seals in order.'),
  hp('<b>Read:</b> '+FEEDBACK[4]),
  hp('Invite each child to show one thing they contributed. Use the lower panel to record a team memory. Nothing beyond the printed pack is needed to finish.'),
  hp('Reset: count all 33 pieces, keep the five piles, erase pencil marks and fold page 18 again. The solution stays the same; change jobs if playing again.')])
 return out
