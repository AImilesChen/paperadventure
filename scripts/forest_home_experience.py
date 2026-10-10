"""An illustrated, hosted forest-post-office adventure with physical delivery."""
import math
from reportlab.platypus import Flowable, Image, Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
import generate_celebration_samples as g
from dinosaur_home_experience import p, head, steps, cardgrid
from space_home_experience import symbol

JOBS=['Postmaster','Routekeeper','Registrar','Inspector']
LABELS=['4, 5','6, 7','8, 9, 10','11, 12, 13','14, 15, 16, 17']
STORIES=[
 'The rain has stopped, but Nori finds a parcel with a blurred address. A surviving postmark note describes its border, stars and weekday. Four postal records look similar. Which one belongs to this parcel?',
 'Nori knows the mail batch now. The route strips fell out of the sorting tray during the shower. Put the right batch together so Nori can reach the parcel\'s district.',
 'At the sorting desk, several parcel records look alike. Three workers each remember a different feature. Nobody knows everything: listen to all three before choosing the parcel record.',
 'A piece of the address survived on the parcel record. The forest address map has similar codes in different districts. Use both discoveries to find the home, then make a replacement label.',
 'Nori places the parcel on the delivery board. Before it leaves the post office, your team must check every address field. Attach the repaired label and deliver the whole board to the correct paper home.'
]
FEEDBACK=[
 'The postmark identifies batch M2. Nori can now pick the matching route strips. Release mission 2.',
 'The route reaches BLUE TREE. Nori has arrived at the sorting desk for that district. Release mission 3.',
 'Parcel C has the right district, two leaves and a round outline. W4 is the surviving address fragment. Release mission 4.',
 'BLUE TREE and W4 identify OWL HOUSE. Your replacement label gives Nori a readable address. Release mission 5.',
 'All four fields match, and the parcel is at OWL HOUSE. The adult returns a checked receipt and reads Nori\'s thank-you note.'
]
ACTIONS=[
 ['Postmaster reads the surviving note: LEAF border, TWO stars, weekday TUE. Read each feature separately.',
  'Routekeeper spreads cards A-D upright. Inspect the border, count the drawn stars and read the weekday.',
  'Inspector checks all three features on each card. Point to the first wrong feature on every rejected card.',
  'Registrar writes the matching card letter and BATCH in record row 1. Show the adult the card and three matching features.'],
 ['Registrar reads BATCH from row 1. Routekeeper sorts the five route strips into matching batch and other batch. Keep other-batch strips aside.',
  'Postmaster finds the matching strip starting at POST OFFICE. Routekeeper joins its TO place to the next strip\'s FROM place, left to right beside the route board.',
  'Inspector checks every joined name and batch. Move Nori along the joins. Finish at a named TREE district; never add an excluded batch.',
  'Registrar fills the four places on the route board and writes strip letters plus the complete district in row 2. Show the adult the joins and one excluded strip.'],
 ['Adult gives the three private clues to Postmaster, Routekeeper and Inspector. In a two-player team one person holds two clue cards. Registrar listens.',
  'Each clue holder reads their own fact aloud, then shows it. Registrar reads the previous district when asked and repeats all three requirements.',
  'Routekeeper spreads parcel cards A-D. Postmaster checks district, Routekeeper counts drawn leaves, Inspector checks the drawn parcel outline. One parcel must match all three.',
  'Registrar records the parcel letter and FRAGMENT in row 3. Each clue holder points to their matching feature before adult acceptance.'],
 ['Registrar reads DISTRICT from row 2 and FRAGMENT from row 3. Routekeeper finds the district panel on the whole map. Do not cut the map.',
  'Within that district, find the exact fragment. Inspector checks BOTH fields: a matching fragment in another district is not enough.',
  'Postmaster reads the matched home name. Registrar records RECIPIENT in row 4 and fills all four replacement-label fields on page 13 from record rows 1-4.',
  'Inspector checks the label against the record and map. Show the adult the map location and label. Keep the label whole until mission 5.'],
 ['Registrar reads BATCH, DISTRICT, FRAGMENT and RECIPIENT from the record. Divide the four checks between the jobs: Postmaster batch, Routekeeper district, Registrar fragment, Inspector recipient.',
  'Compare each dispatch card with ALL four facts. Mark a tick for a match and X for a mismatch on page 16. Choose only the dispatch card with four ticks.',
  'Registrar records its letter in row 5. Inspector rechecks the repaired label. Adult cuts only its outer rectangle from page 13. Place it in the label box on page 16; glue is optional.',
  'Routekeeper places the four home cards apart on the table, then slides the delivery board to the matching home. Two players show two different earlier sources to the adult.',
  'Adult checks the chosen dispatch, label and delivery position. Correct any mismatch and resubmit. Only after acceptance receive the receipt on page 18 and hear the thank-you note.']
]
MATERIALS=[
 'Jobs (2), record (3), task (4), four postmarks (5).',
 'Record (3), task/route board (6), five route strips and Nori marker (7).',
 'Record (3), task (8), three private clues (9), four parcel records (10).',
 'Record (3), task (11), whole address map (12), replacement label (13).',
 'Record (3), repaired label (13), task/check table (14), five dispatch cards (15), delivery board (16), four homes (17). Adult holds receipt (18).'
]
EVIDENCE=[
 'B: leaf border, two stars, TUE; batch M2. A has one star; C has a moon border; D says FRI. Accept only after all three checks.',
 'A-B-C: POST OFFICE > BRIDGE > MOSS LANE > BLUE TREE, all M2. D and E carry M1 and must be excluded before joining; they lead to NO MAILBOX. Accept the district, not only the strip letters.',
 'C: BLUE TREE, two leaf marks, round parcel; fragment W4. A has one leaf, B has a square parcel, D is in POND. Each clue holder must show their fact.',
 'BLUE TREE / W4 = OWL HOUSE. BLUE TREE / W2 = FOX DEN; POND / W4 and MOSS LANE / W4 are wrong districts. Label must show M2, BLUE TREE, W4, OWL HOUSE.',
 'Dispatch A matches M2 / BLUE TREE / W4 / OWL HOUSE. B has wrong recipient, C wrong district, D wrong batch, E wrong fragment. The same four facts must be on the label, and the delivery board must be beside OWL HOUSE. Ask for two earlier sources before giving the receipt.'
]

def leaf(c,x,y,r=20,vein=True):
 q=c.beginPath();q.moveTo(x,y-r);q.curveTo(x-r*1.4,y-r*.1,x-r*.7,y+r*.7,x,y+r);q.curveTo(x+r*.7,y+r*.7,x+r*1.4,y-r*.1,x,y-r);c.drawPath(q)
 if vein:c.line(x,y-r,x,y+r*.7)

def home_icon(c,x,y,name,r=24):
 c.setStrokeColor(g.NAVY);c.setLineWidth(1.5)
 c.rect(x-r,y-r,r*2,r*1.3,stroke=1,fill=0)
 q=c.beginPath();q.moveTo(x-r-5,y+r*.3);q.lineTo(x,y+r);q.lineTo(x+r+5,y+r*.3);c.drawPath(q)
 c.rect(x-6,y-r,12,20,stroke=1,fill=0)
 # Each destination has a different animal sign, plus a printed full name.
 if name=='OWL HOUSE':
  c.circle(x,y+8,10,stroke=1,fill=0);c.circle(x-4,y+10,3,stroke=1,fill=0);c.circle(x+4,y+10,3,stroke=1,fill=0)
 elif name=='FOX DEN':symbol(c,x,y+8,'TRIANGLE',10)
 elif name=='BEAVER HUT':c.rect(x-10,y,20,14,stroke=1,fill=0);c.line(x,y,x,y+10)
 else:
  c.ellipse(x-8,y,x+8,y+13);c.ellipse(x-7,y+10,x-1,y+25);c.ellipse(x+1,y+10,x+7,y+25)
 c.setLineWidth(1)

class ForestBoard(Flowable):
 def __init__(self,w,kind,rows=None,h=300):self.width=w;self.height=h;self.kind=kind;self.rows=rows or []
 def draw(self):
  c=self.canv;w=self.width;h=self.height
  def label(x,y,t,size=12):c.setFillColor(g.NAVY);c.setFont('ArialBold',size);c.drawString(x,y,t)
  def box(x,y,bw,bh,t=''):
   c.setStrokeColor(g.NAVY);c.setLineWidth(1);c.rect(x,y,bw,bh,stroke=1,fill=0)
   if t:label(x+10,y+bh-23,t)
  if self.kind=='record':
   for i,t in enumerate(['1 / Postmark: ____   BATCH: __________','2 / Route: ______   DISTRICT: __________','3 / Parcel: ____   FRAGMENT: __________','4 / RECIPIENT: ______________________','5 / Dispatch: ____   Delivery checked: ____']):
    yy=h-(i+1)*64;box(0,yy,w,58,t);label(10,yy+12,'Evidence: __________________________________',11)
  elif self.kind=='route':
   label(0,h-18,'OUR ROUTE / keep whole');bw=(w-36)/4
   for i,t in enumerate(['START','PLACE 2','PLACE 3','DISTRICT']):
    xx=i*(bw+12);box(xx,45,bw,75,t)
    if i<3:label(xx+bw+3,75,'>')
   label(0,18,'Lay strips beside this board; move Nori along their arrows.',11)
  elif self.kind=='check':
   label(0,h-18,'DISPATCH CHECK / tick matches, X mismatches',12)
   for j,t in enumerate(['Card','Batch','District','Fragment','Recipient']):label(j*w/5+4,h-47,t,11)
   for i,t in enumerate('ABCDE'):
    yy=h-76-i*25;label(8,yy,t);c.setStrokeColor(g.NAVY);c.line(0,yy-6,w,yy-6)
    for j in range(1,5):c.rect(j*w/5+15,yy-2,12,12,stroke=1,fill=0)
  elif self.kind=='label':
   # Physical rectangle fits the identically sized box on the delivery board.
   bw=w-20;box(10,h-230,bw,215,'REPAIRED ADDRESS / cut outer rectangle in mission 5')
   for i,t in enumerate(['BATCH','DISTRICT','FRAGMENT','RECIPIENT']):
    yy=h-70-i*39;label(22,yy,t,13);c.line(140,yy-3,w-24,yy-3)
   label(0,15,'No real names or addresses. Copy only the fictional record.',11)
  elif self.kind=='delivery':
   box(0,0,w,h,'NORI\'S PAPER PARCEL / keep this whole board')
   box(10,h-260,w-20,215,'PLACE THE REPAIRED LABEL HERE')
   label(12,55,'Slide this board beside the correct home card.',12)
   label(12,30,'Adult checks the record and two evidence sources.',11)
  elif self.kind=='receipt':
   box(0,0,w,h,'DELIVERY RECEIPT / adult keeps until accepted')
   for i,t in enumerate(['Dispatch A / batch M2','District BLUE TREE / fragment W4','Delivered to OWL HOUSE','Adult checked: __________________']):label(15,h-65-i*36,t,13)
   home_icon(c,w/2,60,'OWL HOUSE',25)
  elif self.kind=='map':
   # Whole-page address directory, arranged by district and address code.
   panels=[('BLUE TREE',[('W2','FOX DEN'),('W4','OWL HOUSE')]),('POND',[('W4','BEAVER HUT')]),('MOSS LANE',[('W4','RABBIT GATE')])]
   for i,(district,homes) in enumerate(panels):
    yy=h-(i+1)*145;box(0,yy,w,135,district+' DISTRICT')
    for j,(code,name) in enumerate(homes):
     xx=22+j*w/2;home_icon(c,xx+35,yy+61,name,22);label(xx+73,yy+65,code,16);label(xx+73,yy+42,name,12)
   label(0,4,'Use BOTH district and fragment. The same code can repeat.',11)
  else:
   ch=h/math.ceil(len(self.rows)/2);cw=w/2
   for i,row in enumerate(self.rows):
    xx=i%2*cw;yy=h-(i//2+1)*ch;c.setStrokeColor(g.NAVY)
    c.saveState();c.setDash(4,3);c.rect(xx,yy,cw,ch,stroke=1,fill=0);c.restoreState()
    if self.kind=='postmark':
     card,border,stars,day,batch=row;label(xx+12,yy+ch-24,'1 / POSTMARK '+card);label(xx+12,yy+ch-47,'BATCH '+batch,14)
     cx=xx+cw/2;cy=yy+ch*.40
     c.setStrokeColor(g.NAVY)
     if border=='Leaf':leaf(c,cx,cy,48,False)
     else:
      q=c.beginPath();q.moveTo(cx+48,cy+48);q.curveTo(cx-58,cy+48,cx-58,cy-48,cx+48,cy-48);q.curveTo(cx+37,cy-30,cx+37,cy+30,cx+48,cy+48);c.drawPath(q)
     for k in range(int(stars)):symbol(c,cx-13*(int(stars)-1)+26*k,cy+12,'STAR',9)
     label(cx-16,cy-19,day,13);label(xx+12,yy+12,'Inspect border, stars and day.',11)
    elif self.kind=='parcel':
     card,district,leaves,outline,fragment=row;label(xx+12,yy+ch-24,'3 / PARCEL '+card);label(xx+12,yy+ch-46,district,13)
     cx=xx+cw/2;cy=yy+ch*.4;c.setStrokeColor(g.NAVY)
     if outline=='Round':c.circle(cx,cy,49,stroke=1,fill=0)
     else:c.rect(cx-49,cy-49,98,98,stroke=1,fill=0)
     for k in range(int(leaves)):leaf(c,cx-17*(int(leaves)-1)+34*k,cy+12,12)
     label(cx-13,cy-22,fragment,17);label(xx+12,yy+12,'Count leaves; inspect parcel outline.',10.5)
    elif self.kind=='home':
     name=row;label(xx+12,yy+ch-24,'5 / HOME / '+name,12);home_icon(c,xx+cw/2,yy+ch*.43,name,40)
    elif self.kind=='dispatch':
     label(xx+12,yy+ch-24,'5 / DISPATCH '+row[0],13)
     for j,(t,v) in enumerate(zip(['BATCH','DISTRICT','FRAGMENT','RECIPIENT'],row[1:])):label(xx+12,yy+ch-51-j*25,t+': '+v,11.5)
    elif self.kind=='routes':
     if row[0]=='NORI':
      label(xx+12,yy+ch-24,'2 / NORI MARKER');c.setStrokeColor(g.NAVY);c.circle(xx+cw/2,yy+ch*.44,24,stroke=1,fill=0);leaf(c,xx+cw/2,yy+ch*.44,15);label(xx+12,yy+12,'Move this card along the route.',11)
     else:
      card,batch,start,end=row;label(xx+12,yy+ch-24,'2 / ROUTE '+card+' / '+batch,13);label(xx+12,yy+ch-49,'FROM '+start,11.5);label(xx+12,yy+33,'TO '+end,11.5);c.setStrokeColor(g.NAVY);c.line(xx+25,yy+56,xx+cw-25,yy+56);c.line(xx+cw-25,yy+56,xx+cw-34,yy+62);c.line(xx+cw-25,yy+56,xx+cw-34,yy+50)

def task(i,w,board=None):
 f=head(['Find the rain-blurred postmark','Rebuild Nori\'s route','Listen at the sorting desk','Repair the address','Check and deliver the parcel'][i],f'CHECKPOINT {i+1} / KEEP WHOLE')+[p(STORIES[i]),p('PUT ON THE TABLE',True),p(MATERIALS[i]),p('DO THIS TOGETHER',True)]+steps(ACTIONS[i])+[p('READY FOR THE ADULT?',True),p('Show the result and the evidence described above. Ask the adult to check before taking the next mission.')]
 if board:f+=[board]
 return f

def player(s,w):
 pages=[head(s['title'],'PLAYER / FOREST HOME')+[p('Rain has blurred a parcel address. Join Nori\'s forest post office: inspect the postmark, rebuild a route, compare parcels, repair the label and complete a paper delivery.'),Image(str(g.ROOT/s['cover']),width=320,height=240,kind='proportional'),p('FIVE CONNECTED MISSIONS',True),p('Batch > district > address fragment > recipient > checked delivery.'),p('Everything needed for the puzzle is printed here. An adult hosts and holds later pages. No real mailbox, outdoor walk, envelope, box or purchased prize is needed.')]]
 pages.append(head('Your forest post office team','PAGE 2 / CUT FOUR JOBS')+[p('2-4 players: pass job cards or combined bundles clockwise after missions 1-4. 5-6 players: keep jobs for this game; paired players swap reader/mover and checker each mission. Singles keep their job. The adult is outside the player count.'),cardgrid(list(zip(['ALL / '+j for j in JOBS],[
 'Read one instruction at a time. Invite every teammate to share. Partner points at the clue being read.',
 'Sort, connect and move pieces. Show the route or map location. Partner checks a join or rejected choice.',
 'Write the team\'s agreed facts, repair the label and keep the record visible. Adult may write dictated answers.',
 'Check every required field. Ask for evidence and show it to the adult. Return incorrect work for a correction.'
 ])),w,155),p('Everyone may discuss. No acting voices are required. Teams of 7-12 use two complete packs; the host guide gives exact groups.')])
 pages.append(head('Our postal work record','PAGE 3 / KEEP WHOLE')+[p('Registrar keeps this page in the centre. Record only agreed results. Speak and point if writing is difficult; an adult can write for you. Keep solved props as evidence.'),ForestBoard(w,'record',h=330),p('Invented team name: ____________________<br/>Ask for one hint, try again, then request another. Pencil answers can be corrected.')])
 pages.append(task(0,w))
 pages.append(head('Postal postmark records','CHECKPOINT 1 / PAGE 5 / CUT FOUR')+[p('Cut the outer rectangles, not the postmark drawings. Keep cards upright. Inspect the drawn border, stars and weekday; the batch is the result to record.'),ForestBoard(w,'postmark',s['stages'][0]['rows'],h=460)])
 pages.append(task(1,w,ForestBoard(w,'route',h=145)))
 pages.append(head('Route strips and Nori marker','CHECKPOINT 2 / PAGE 7 / CUT SIX')+[p('Example only: FROM EARTH / TO MARS joins FROM MARS / TO BASE. Match the repeated place name, then follow the arrows. The example words are not forest clues.'),ForestBoard(w,'routes',s['stages'][1]['rows']+[('NORI',)],h=420)])
 pages.append(task(2,w))
 pages.append(head('Three workers, three facts','CHECKPOINT 3 / PAGE 9 / CUT THREE')+[p('Adult hands each clue to its named job. Read your own clue aloud and show it. These worker messages are not additional player roles.'),cardgrid([
 ('3 / Postmaster / Carrier','Use the DISTRICT from your route record.'),('3 / Routekeeper / Sorter','The correct parcel has TWO drawn leaf marks.'),('3 / Inspector / Keeper','The correct parcel has a ROUND outline.')],w,125),p('Registrar combines the spoken facts. With two players one holds two clues. Keep the spare cell uncut; it is not another clue.')])
 pages.append(head('Parcel records at the sorting desk','CHECKPOINT 3 / PAGE 10 / CUT FOUR')+[p('Inspect the leaf drawings and parcel outline. Use the district you already found. The fragment inside the parcel becomes your next clue.'),ForestBoard(w,'parcel',s['stages'][2]['rows'],h=460)])
 pages.append(task(3,w))
 pages.append(head('Forest address map','CHECKPOINT 4 / PAGE 12 / KEEP WHOLE')+[p('This is an address directory, not another route puzzle. Find the district panel first, then the exact fragment. Drawings identify homes; full printed names work in black and white.'),ForestBoard(w,'map',h=455)])
 pages.append(head('A readable replacement label','CHECKPOINT 4 / PAGE 13 / KEEP WHOLE UNTIL MISSION 5')+[p('Registrar copies four facts from record rows 1-4. Inspector checks them against the map and earlier props. Leave this label attached to the page until the adult cuts it in mission 5.'),ForestBoard(w,'label',h=290),p('Example only: batch Z9 / district RED HILL / fragment X8 / recipient BADGER CABIN. This shows the field format, not a game answer. Write your own discovered facts.'),p('Show your map location and label. Do not guess the recipient from the cover illustration.')])
 pages.append(task(4,w))
 pages.append(head('Final dispatch records','CHECKPOINT 5 / PAGE 15 / CUT FIVE')+[p('Compare ALL four fields with your record and repaired label. A card with one mismatch cannot be dispatched. Keep rejected cards visible until checked.'),ForestBoard(w,'dispatch',s['stages'][4]['rows'],h=490)])
 pages.append(head('Nori\'s parcel delivery board','CHECKPOINT 5 / PAGE 16 / KEEP WHOLE')+[p('Place the repaired label inside the box; hold it by hand. Keep this board whole. Slide it to the matching home card after checking.'),ForestBoard(w,'delivery',h=340),ForestBoard(w,'check',h=190),p('Show two earlier sources to the adult. Glue is optional.')])
 pages.append(head('Four forest homes','CHECKPOINT 5 / PAGE 17 / CUT FOUR')+[p('Place the four home cards apart on the table. Read the full name before delivering. Only one matches your repaired address.'),ForestBoard(w,'home',['FOX DEN','OWL HOUSE','BEAVER HUT','RABBIT GATE'],h=380)])
 pages.append(head('Parcel received!','PAGE 18 / ADULT HOLDS UNTIL DELIVERY ACCEPTED')+[p('Adult: complete the check line only after verifying the dispatch, label, home and two evidence sources. Return this receipt to the team.'),ForestBoard(w,'receipt',h=255),p('<b>NORI\'S NOTE:</b> "Your repaired label brought the parcel to Owl House in Blue Tree. The forest neighbours can trust the post office again. Thank you for listening, sorting and checking together!"'),p('Each player names or points to one contribution.<br/>I helped by: ______________________________<br/>Our strongest check: ______________________'),p('Replay uses the same solution. Sort the numbered piles, erase pencil marks and try different jobs next time.')])
 return pages

def gp(t,b=False):
 style=ParagraphStyle('forest-guide',fontName='ArialBold' if b else 'Arial',fontSize=11.5,leading=15.5,textColor=g.NAVY if b else g.INK,spaceAfter=7)
 return Paragraph(t,style)

def grid(heads,rows,widths):
 sty=ParagraphStyle('forest-table',fontName='Arial',fontSize=10.5,leading=14,textColor=g.INK)
 bold=ParagraphStyle('forest-table-head',parent=sty,fontName='ArialBold',textColor=g.NAVY)
 t=Table([[Paragraph(str(x),bold) for x in heads]]+[[Paragraph(str(x),sty) for x in r] for r in rows],colWidths=widths,repeatRows=1)
 t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.6,g.NAVY),('BACKGROUND',(0,0),(-1,0),g.BLUE),('ROWBACKGROUNDS',(0,1),(-1,-1),[g.CREAM,g.PALE]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
 return t

def guide(s,w,counts,base):
 pages=[head(s['title'],'HOST / QUICK START')+[gp('Read this guide on screen. Children use the printed Player Pack; keep the answers and receipt out of view.'),gp('1. Choose one team for 2-6 players, two balanced teams for 7-12. You are the adult host, outside that count.'),gp('2. Standard: print player pages 1-18 per team (18 sheets). Minimum: pages 2-18 (17 sheets); read the cover from your screen. Choose A4 OR US Letter, single-sided, Actual size / 100%. Do not print several pages per sheet.'),gp('3. Cut and sort the 30 initial pieces using page 2. Keep label page 13 whole until mission 5, when it becomes piece 31.'),gp('4. Give jobs and record. Prepare one clear table per team; hold five mission piles and receipt page 18 behind you.'),gp('5. Read the opening on guide page 4. Release each mission only after checking the previous result. Read its story, lead its actions, accept its evidence, then read the next-scene feedback.'),gp('Required: printed pack, ordinary paper, two pencils and an eraser per team. Adult-handled scissors are recommended; five envelopes, glue and tape are optional. No box, toy, real postal item or prize is required.'),gp('Without scissors: compare whole candidate pages, number route strips and trace with a finger. Place the whole label page beside the delivery board. The same solution applies.')]]
 pages.append(head('Print, cut and sort','HOST / PREPARATION')+[gp('Each team gets a complete pack. Two teams: 36 standard sheets or 34 minimum. No guide page is a required prop.'),grid(['Player pages','Prepare / distribute'],[
 ['2-3','4 job cards; whole work record. Give before the opening.'],['4-5','Whole task + 4 postmark cards. Mission 1.'],['6-7','Whole route board/task + 5 routes and Nori marker. Mission 2.'],['8-10','Whole task + 3 named private clues + 4 parcel cards. Mission 3.'],['11-13','Whole task, map and replacement-label page. Mission 4. Do not cut map.'],['14-17','Whole task + delivery board/check table + 5 dispatch cards + 4 home cards. Mission 5. Cut the repaired label only now.'],['18','Whole receipt and ending. Adult holds until accepted.']],[w*.17,w*.83]),gp('Final cut count: 31 = 4 jobs + 4 postmarks + 5 routes + 1 Nori marker + 3 clues + 4 parcels + 1 label + 5 dispatches + 4 homes.'),gp('Cut only the outside rectangular boundaries. Keep drawings, card IDs and job names attached. Never cut the map, tasks, record, delivery board or receipt. Empty cells are not cards.'),gp('Before starting, count each pile and check all text and shapes are visible. Reprint a missing piece by its page number; do not invent replacement clues.')])
 pages.append(head('Make every player useful','HOST / JOB ASSIGNMENTS')+[grid(['Players','Assignment'],[
 ['2','Person 1: Postmaster + Registrar. Person 2: Routekeeper + Inspector. Exchange both bundles after missions 1-4.'],['3','Postmaster; Routekeeper; Registrar + Inspector. Pass the three bundles clockwise after missions 1-4.'],['4','One job each; pass job cards clockwise after missions 1-4.'],['5','Postmaster pair + Routekeeper + Registrar + Inspector. Jobs stay fixed; the pair swaps reader and clue-pointer each mission.'],['6','Postmaster pair + Routekeeper pair + Registrar + Inspector. Jobs stay fixed; pairs swap reader/mover and checker each mission.']],[w*.13,w*.87]),gp('7 = 3+4; 8 = 4+4; 9 = 4+5; 10 = 5+5; 11 = 5+6; 12 = 6+6. Each team has its own materials. One host visits both tables; an extra adult is optional.'),gp('Before accepting, invite every player to point to one fact or describe one action. Let early readers move pieces and dictate answers. Older readers must allow others to decide too.'),gp('Story workers Carrier, Sorter and Keeper are messages for the named player jobs, not extra roles to assign.')])
 from generate_celebration_home_v04 import Diagram
 pages.append(head('Open the forest post office','HOST / TABLE SETUP AND OPENING')+[Diagram(w,'table'),gp('Host-only area: five piles, this guide, receipt 18. Team centre: record and pencils. Active area: current task and props. Evidence area: solved cards and repaired label, kept visible.'),gp('Read aloud',True),gp('"Rain has blurred a parcel address. Nori needs your post office team to put it right. We will inspect, sort, connect, repair and deliver. Read one step at a time. Everyone shares before deciding. Show me evidence before the next mission."'),gp('Give jobs and page 3, then mission 1 pages 4-5. Later facts stay hidden. Before mission 2 demonstrate a non-game join: EARTH > MARS connects MARS > BASE. Point to the repeated name.'),gp('Keep the last page away from players: it reveals the destination. Once printed, hold it separately, not beneath the work record.')])
 for i in range(5):
  pages.append(head(['Postal observation','Route sorting','Shared parcel clues','Address repair','Checked paper delivery'][i],f'HOST / CHECKPOINT {i+1} / PLAYER PAGES {LABELS[i]}')+[gp('Prepare and distribute',True),gp(MATERIALS[i]),gp('Story to read',True),gp(STORIES[i]),gp('Lead the actions',True)]+[gp(f'<b>{j+1}.</b> '+a) for j,a in enumerate(ACTIONS[i])]+[gp('Accept only after checking',True),gp(EVIDENCE[i]),gp('If wrong, point to the first failed condition; allow correction. Use guide page 10 hints one at a time. Accept spoken evidence and adult-assisted writing.'),gp('Handover',True),gp(FEEDBACK[i]+(' Keep solved evidence. 2-4 players pass bundles; 5-6 swap partner tasks. Give player pages '+LABELS[i+1]+'.' if i<4 else ' Give receipt page 18 only now; follow guide page 12.'))])
 hints=[list(st['hints']) for st in s['stages']]
 hints[4][2]='Dispatch A. Help check its four label fields and deliver to OWL HOUSE before giving the receipt.'
 pages.append(head('Hints without taking over','HOST / ONE HINT AT A TIME')+[gp('Offer Hint 1, allow another attempt, then Hint 2. Hint 3 can reveal a result, but never skips recording, label repair or final delivery.'),grid(['Mission','What to say'],[[str(i+1),'<br/>'.join('<b>Hint '+str(j+1)+':</b> '+x for j,x in enumerate(h))] for i,h in enumerate(hints)],[w*.13,w*.87]),gp('Wrong earlier result: bring back that evidence pile, correct its record row and retry the current step. Pause with each team\'s record and numbered piles together.')])
 pages.append(head('Support, printing and troubleshooting','HOST / FIRST-USE HELP')+[gp('Early readers: read one numbered action at a time. Let the child point, sort or move. Adult writes dictated results. Check-table ticks are optional; the main record and repaired label must be complete.'),gp('Confident readers: before acceptance ask why each rejected option fails. In mission 2 explain why other-batch strips cannot extend the route; in mission 4 demonstrate why using W4 alone gives several homes. These are extra reasoning tasks, not a different mystery.'),gp('Two teams: keep receipts and completed delivery boards out of the other team\'s view. Give a finished team a quiet drawing task while checking the second team.'),gp('Black-and-white copies: use the printed district words. Shapes and counts are drawn, not colour-dependent. If lines are faint or cropped, reprint at Actual size; never several pages per sheet.'),gp('No-cut play: number or point to candidates; trace route joins on the whole page. Hold the whole label page next to the delivery board and move both to the chosen home. Share private clues by covering other messages until read.'),gp('A label will not fit if one page is scaled differently: reprint label and delivery board in the same paper size at 100%. Until then, place the label beside the board; do not change its facts.'),gp('Replay: clues keep the same answer. Change jobs; do not promise a new mystery. Completion needs no real names, real addresses, outdoor walk or purchased reward.')])
 pages.append(head('Sign, thank and reset','HOST / FINALE')+[gp('Accept only Dispatch A, label M2 / BLUE TREE / W4 / OWL HOUSE, and the delivery board beside OWL HOUSE. Ask two different players for two earlier sources, such as postmark B and the map location.'),gp('If one field or location is wrong, ask the team to check that source and resubmit. Do not make them replay all five missions.'),gp('Mark the adult check line on receipt page 18. Give the receipt to the team and read:',True),gp('"Your repaired label brought the parcel to Owl House in Blue Tree. The forest neighbours can trust the post office again. Thank you for listening, sorting and checking together!"'),gp('Invite each player to name or point to one contribution. The receipt is the game reward; no gift is required.'),gp('Reset: erase pencil answers, count 31 cut pieces and put them in their numbered piles. Keep the label with mission 4 until mission 5 needs it; store receipt 18 with adult material. A damaged label can be reprinted from player page 13.')])
 return pages
