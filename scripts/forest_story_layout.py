"""Story-first presentation; page references are resolved before PDF generation."""
import re
from reportlab.platypus import Paragraph, Table, TableStyle, Spacer, Image
from reportlab.lib.styles import ParagraphStyle
import generate_celebration_samples as g

PAGE_MAP={n:n+sum(t<=n for t in [4,6,8,11,14]) for n in range(1,19)}
STORY_PAGES=[4,7,10,14,18]
TASK_PAGES=[5,8,11,15,19]
READ_STYLE=ParagraphStyle('forest-reader',fontName='Arial',fontSize=14,leading=20,textColor=g.INK,spaceAfter=11,spaceBefore=2)
GUIDE_STYLE=ParagraphStyle('forest-host',fontName='Arial',fontSize=12,leading=17,textColor=g.INK,spaceAfter=10,spaceBefore=2)

def p(t,b=False):
 t=t.replace('<b>','<font name="ArialBold">').replace('</b>','</font>')
 return Paragraph(t,ParagraphStyle('forest-reader-bold',parent=READ_STYLE,fontName='ArialBold',textColor=g.NAVY) if b else READ_STYLE)

def gp(t,b=False):
 t=t.replace('<b>','<font name="ArialBold">').replace('</b>','</font>')
 return Paragraph(t,ParagraphStyle('forest-host-bold',parent=GUIDE_STYLE,fontName='ArialBold',textColor=g.NAVY) if b else GUIDE_STYLE)

def panel(title,paragraphs,w,host=False):
 make=gp if host else p
 t=Table([[ [make(title,True)]+[make(x) for x in paragraphs] ]],colWidths=[w])
 t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),1,g.NAVY),('BACKGROUND',(0,0),(-1,-1),g.PALE),('LEFTPADDING',(0,0),(-1,-1),18),('RIGHTPADDING',(0,0),(-1,-1),18),('TOPPADDING',(0,0),(-1,-1),15),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
 return t

SCENES=[
 ('A parcel after the rain',[
  'The last raindrops tap against the forest post office window. Nori, the young deer helping with the morning mail, lifts a damp parcel from the doorstep. Its address has run into a watery blur.',
  '<b>Nori:</b> "Someone is waiting for this. I cannot read the address, but perhaps the postmark can tell us which mail batch it came from."',
  'A small note survived beneath the sorting tray. Four postmark records are lying nearby. They look almost the same, so the team must examine every feature before choosing.',
  '<b>Your team:</b> "We will look carefully and explain our choice. No guessing!"'
 ],'What features could help you tell two similar marks apart? Point to something you would inspect first.'),
 ('The scattered route strips',[
  'Nori clips the checked batch record beside the tray. A gust through the open window has scattered the route strips across the floor. Some belong to a different mail batch.',
  '<b>Nori:</b> "We have our batch, but where does its route lead? If we mix the strips, we could take the parcel to the wrong district."',
  'The Postmaster finds the post office starting point. The Routekeeper lays out the strips while the Inspector watches for matching place names. A leaf marker will show where Nori is travelling.',
  '<b>Nori:</b> "Please show me each join before I move. When the path ends, we will know which sorting desk to visit."'
 ],'Show a teammate how one strip could connect to another. Use the example, not a guessed answer.'),
 ('Three workers remember',[
  'At the district sorting desk, Nori sees several parcel records with different shapes and marks. The Carrier, Sorter and Keeper all helped before the rain, but each remembers only one useful fact.',
  '<b>Carrier:</b> "Bring the district from your route record."<br/><b>Sorter:</b> "My message describes the marks."<br/><b>Keeper:</b> "Mine describes the outline."',
  'The workers hand their messages to different members of your team. Nobody should choose alone. The Registrar listens as each holder reads and shows their own clue.',
  '<b>Nori:</b> "When all three facts agree, the right parcel record may reveal the piece of address that survived."'
 ],'Let each clue holder speak before deciding. Who will help combine what everyone knows?'),
 ('An address with a missing home',[
  'A small address fragment has survived. Nori carries it to the forest address directory, where several districts use similar codes. One code by itself may point to more than one home.',
  '<b>Nori:</b> "We must use the district and the fragment together. A readable label will help me deliver the parcel without guessing."',
  'The Routekeeper opens the whole map. The Inspector checks the two discoveries. Once the team agrees on a home, the Registrar can repair the label using all four recorded facts.',
  '<b>Nori:</b> "Leave the label on its page for now. We will cut it only after the final checks."'
 ],'Why would an address need both a district and a code? Explain or point to the map.'),
 ('The last check before delivery',[
  'The repaired label is ready. Nori places the paper parcel at the dispatch desk, where five dispatch records wait. A record that looks almost right might still contain one wrong field.',
  '<b>Nori:</b> "This is our last chance to catch a mistake. Please check the batch, district, fragment and recipient before I leave."',
  'Each job takes responsibility for one field. The team compares the records, attaches the checked label and moves the delivery board to the correct paper home. Two earlier clues will support the delivery.',
  '<b>Nori:</b> "When the adult accepts our evidence, we can collect the receipt and celebrate together."'
 ],'Name the field you will check. Which earlier clue could help prove it?')
]

SHORT_ACTIONS=[
 ['<b>Postmaster:</b> Read the note: LEAF border, TWO stars, weekday TUE (Tuesday).',
  '<b>Routekeeper:</b> Lay postmarks A-D upright. Compare the border, stars and weekday.',
  '<b>Inspector:</b> Check all three features. Show one wrong feature on each rejected card.',
  '<b>Registrar:</b> Write the card letter and BATCH in record row 1.',
  '<b>Team:</b> Show the adult the selected card and its three matching features.'],
 ['<b>Registrar:</b> Read BATCH from record row 1.',
  '<b>Routekeeper:</b> Keep only strips from that batch. Park the others aside.',
  '<b>Postmaster:</b> Find the kept strip that starts at POST OFFICE.',
  '<b>Routekeeper:</b> Join each TO name to the next FROM name, left to right beside the board.',
  '<b>Inspector:</b> Check every join and batch. Move Nori from POST OFFICE along the arrows to each TO place.',
  '<b>Registrar:</b> Fill the four board places. Write strip letters and the final district in record row 2.',
  '<b>Team:</b> Show the joins and one excluded strip to the adult.'],
 ['<b>Adult:</b> Give the three private clues to their named jobs. With two players, one holds two.',
  '<b>Clue holders:</b> Read your own message aloud, then show it. Everyone listens.',
  '<b>Registrar:</b> Repeat the three facts, using the district from record row 2.',
  '<b>Postmaster:</b> Check the district on parcel cards A-D.',
  '<b>Routekeeper:</b> Count the leaves. <b>Inspector:</b> Check the outline.',
  '<b>Registrar:</b> Record the matching parcel letter and FRAGMENT in row 3.',
  '<b>Clue holders:</b> Show the adult how each fact matches.'],
 ['<b>Registrar:</b> Read DISTRICT (row 2) and FRAGMENT (row 3).',
  '<b>Routekeeper:</b> Find that district panel on the whole map. Do not cut the map.',
  '<b>Inspector:</b> Find the exact fragment within that district. Both must match.',
  '<b>Postmaster:</b> Read the full home name. <b>Registrar:</b> Write RECIPIENT in row 4.',
  '<b>Registrar:</b> Copy the four record facts onto label page 13.',
  '<b>Inspector:</b> Check the label against record and map. Keep the label whole.',
  '<b>Team:</b> Show the adult the map location and label.'],
 ['<b>Team:</b> Divide the fields: Postmaster batch; Routekeeper district; Registrar fragment; Inspector recipient.',
  '<b>Team:</b> Compare all four facts on each dispatch card. On page 16, tick matches and mark X for mismatches.',
  '<b>Registrar:</b> Choose the card with four matches. Write its letter in record row 5.',
  '<b>Inspector:</b> Recheck the repaired label. <b>Adult:</b> Cut its outer rectangle from page 13.',
  '<b>Routekeeper:</b> Place the label in the delivery board box (page 16). Glue is optional.',
  '<b>Routekeeper:</b> Lay out the four home cards. Slide the board beside the matching home.',
  '<b>Two players:</b> Show two different earlier evidence sources to the adult.',
  '<b>Adult:</b> Check dispatch, label and home. Allow correction and resubmission.',
  '<b>Registrar:</b> After acceptance, mark Delivery checked: YES in row 5. Receive receipt page 18.' ]
]

def remap_text(t):
 t=re.sub(r'(?i)\bpage (\d+)\b',lambda m:m[0].replace(m[1],str(PAGE_MAP.get(int(m[1]),int(m[1])))),t)
 t=re.sub(r'\((\d+)\)',lambda m:'('+str(PAGE_MAP.get(int(m[1]),int(m[1])))+')',t)
 return t

def remap_flow(flow):
 for el in flow:
  if isinstance(el,Paragraph):
   el.__init__(remap_text(el.text),el.style)
  elif isinstance(el,Table):
   for row in el._cellvalues:
    for cell in row:
     if isinstance(cell,(list,tuple)):remap_flow(cell)
 return flow

def story_page(i,w,head):
 title,paras,prompt=SCENES[i]
 return head(title,f'CHECKPOINT {i+1} / STORY / KEEP WHOLE')+[Spacer(1,12),panel('THE STORY SO FAR',paras,w),Spacer(1,20),p('PAUSE AND TALK',True),p(prompt),Spacer(1,12),p(f'Next: follow the actions on page {TASK_PAGES[i]}. Ask your adult before opening later missions.')]

def install(f):
 legacy_player=f.player;legacy_guide=f.guide
 f.p=p;f.gp=gp
 legacy_grid=f.grid
 def grid(heads,rows,widths):
  t=legacy_grid(heads,rows,widths)
  for row in t._cellvalues:
   for el in row:
    if isinstance(el,Paragraph):
     style=ParagraphStyle('forest-host-table',parent=el.style,fontSize=11.5,leading=16)
     el.__init__(el.text.replace('<b>','<font name="ArialBold">').replace('</b>','</font>'),style)
  t.spaceAfter=16
  return t
 f.grid=grid
 f.FEEDBACK=[
  'Nori clips postmark B to the work record. "Leaf border, two stars and Tuesday - every feature agrees. Batch M2 is ours!" The tray is no longer a jumble of identical marks. But the route strips are still scattered: your batch is the key to choosing which ones belong together.',
  'Nori follows the A-B-C joins and stops at BLUE TREE. "You kept M2 together and left the other batch aside. We reached the right district!" A sorting desk waits beneath the branches. Several parcel records lie there, and three workers each remember a different part of the answer.',
  'The Carrier, Sorter and Keeper compare their messages with parcel C. Its district, two leaves and round outline all agree. Nori points to W4 inside the outline. "An address fragment! Now we can search the directory - but remember, codes may repeat in different districts."',
  'The Inspector points to BLUE TREE / W4: OWL HOUSE. Nori reads the replacement label aloud. "Every discovery has a place on this label. We know where to go!" Before delivery, the dispatch desk needs one final check: can your team spot a record with a single wrong field?',
  'Nori slides Dispatch A beside the checked label and reaches OWL HOUSE. The doorway opens, and the parcel is accepted. "You followed the evidence all the way," Nori says. "Our receipt shows the delivery is complete. Let us hear how each teammate helped."'
 ]
 def cards(items,w,h=170):
  rows=[]
  for i in range(0,len(items),2):
   cells=[[p(a,True),p(b)] for a,b in items[i:i+2]]
   if len(cells)<2:cells.append([p('KEEP THIS SPACE UNCUT',True)])
   rows.append(cells)
  t=Table(rows,colWidths=[w/2]*2,rowHeights=[max(h,175)]*len(rows))
  t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),g.PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),18),('RIGHTPADDING',(0,0),(-1,-1),18),('TOPPADDING',(0,0),(-1,-1),18),('BOTTOMPADDING',(0,0),(-1,-1),18)]))
  for i in range(len(items)):t.setStyle(TableStyle([('BOX',(i%2,i//2),(i%2,i//2),1,g.NAVY,1,(4,3))]))
  t.spaceAfter=16
  return t
 f.cardgrid=cards
 def task(i,w,board=None):
  titles=['Inspect the postmark','Connect the route','Combine the parcel clues','Repair the label','Check and deliver']
  flow=f.head(titles[i],f'CHECKPOINT {i+1} / ACTIONS / KEEP WHOLE')+[p('PUT ON THE TABLE',True),p(f.MATERIALS[i]),Spacer(1,6)]
  if i in [0,2,3]:flow += [f.ActionStrip(w,[['LOOK','COMPARE','RECORD'],[],['SHARE','LISTEN','MATCH'],['FIND','REPAIR','CHECK']][i]),Spacer(1,8)]
  flow += [p(f'<b>{j+1}.</b> '+a) for j,a in enumerate(SHORT_ACTIONS[i])]
  if board:flow += [Spacer(1,8),board]
  if i==4:flow += [p('Reading support: point and say match or mismatch; ticks are optional. Adult may write for you.'),p('Delivery checked: YES means the adult accepted your delivery. Hear Nori\'s note and share one contribution.')]
  else:flow += [p('STOP AND CHECK',True),p('Show your result and evidence. The adult reads the next part of the story after accepting your work.')]
  return flow
 f.task=task
 def player(s,w):
  old=legacy_player(s,w)
  old[0]=f.head(s['title'],'PLAYER / FOREST HOME')+[p('A rainy morning. A blurred address. A parcel waiting for its home.'),Spacer(1,10),Image(str(g.ROOT/s['cover']),width=360,height=270,kind='proportional'),Spacer(1,18),panel('NORI NEEDS YOUR POST OFFICE TEAM',[
   'Nori, the young deer, has found a parcel outside the forest post office. The rain has washed away its address. Somewhere in the forest, a neighbour is waiting.',
   '<b>Nori:</b> "Will you help me? We can follow the postal clues, repair the label and deliver it together."'],w),Spacer(1,14),p('YOUR MISSION',True),p('Work together to restore the address and complete the paper delivery. Ask an adult to give out your jobs and work record before mission 1.')]
  old[1]=f.head('Your forest post office team','PAGE 2 / CUT FOUR JOBS')+[p('<b>2-4 players:</b> Pass job cards or bundles clockwise after missions 1-4.<br/><b>5-6 players:</b> Keep jobs; partners swap reader/mover and checker each mission.<br/><b>7-12 players:</b> Use two complete packs. The adult hosts separately.'),cards(list(zip(['ALL / '+j for j in f.JOBS],[
   'Read one instruction.<br/>Invite everyone to share.<br/>Partner points to the clue.',
   'Sort, join and move pieces.<br/>Show the route or map.<br/>Partner checks a join.',
   'Record agreed facts.<br/>Fill the address label.<br/>Ask an adult to write if needed.',
   'Check the required fields.<br/>Ask for supporting evidence.<br/>Show corrections to the adult.'])),w),p('Dashed border: cut the card. Solid board: keep whole. Everyone may discuss; acting voices are optional.')]
  compact=ParagraphStyle('forest-board-note',parent=READ_STYLE,spaceAfter=4,spaceBefore=0)
  old[15]=f.head('Parcel delivery board','CHECKPOINT 5 / PAGE 16 / KEEP WHOLE')+[Paragraph('Keep whole. Place the label in the box; deliver beside the matching home.',compact),f.ForestBoard(w,'delivery',h=340),f.ForestBoard(w,'check',h=190),Paragraph('Show two earlier clues. Glue is optional.',compact)]
  result=[]
  for n,flow in enumerate(old,1):
   if n in [4,6,8,11,14]:result.append(story_page([4,6,8,11,14].index(n),w,f.head))
   result.append(remap_flow(flow))
  return result
 f.player=player
 def guide(s,w,counts,base):
  old=legacy_guide(s,w,counts,base)
  # Keep quick-start, preparation, team assignments and opening; replace five crowded checkpoint pages.
  result=old[:4]
  for i in range(5):
   title,paras,prompt=SCENES[i]
   handover=('Keep solved evidence. 2-4 players pass jobs; 5-6 swap partner tasks. Give player pages '+['7-9','10-13','14-17','18-22'][i]+'.' if i<4 else 'Give the checked receipt on player page 23 only after final delivery is accepted. Follow guide page 17.')
   result.append(f.head(title,f'HOST / CHECKPOINT {i+1} / STORY')+[gp(f'Give player story page {STORY_PAGES[i]}. Read the opening before actions on player page {TASK_PAGES[i]}. Keep the answers below out of player view.'),panel('READ ALOUD - OPENING',paras,w,True),Spacer(1,15),gp('Invite one short response',True),gp(prompt),Spacer(1,12),panel('READ ONLY AFTER ACCEPTANCE',[f.FEEDBACK[i].strip()],w,True),Spacer(1,12),gp('Handover - adult instructions',True),gp(handover)])
   pp=remap_text(f.MATERIALS[i])
   result.append(f.head('Host the actions',f'HOST / CHECKPOINT {i+1} / CHECKLIST')+[gp('Prepare and distribute',True),gp(pp)]+[gp(f'<b>{j+1}.</b> '+remap_text(a)) for j,a in enumerate(SHORT_ACTIONS[i])]+[panel('ACCEPT ONLY AFTER CHECKING',[f.EVIDENCE[i]],w,True),Spacer(1,10),gp('If a check fails, point to that source and allow correction. Offer one hint at a time from guide page 15. Accept spoken evidence and adult-assisted writing.')])
  result+=old[9:]
  # Old guide references must follow the expanded guide and player page maps.
  for page in result[:4]+result[-3:]:
   for el in page:
    if isinstance(el,Paragraph):
     t=el.text
     t=t.replace('player pages 1-18 per team (18 sheets)','player pages 1-23 per team (23 sheets)').replace('pages 2-18 (17 sheets)','pages 2-23 (22 sheets)').replace('36 standard sheets or 34 minimum','46 standard sheets or 44 minimum')
     t=re.sub(r'guide page (10|12)',lambda m:'guide page '+{'10':'15','12':'17'}[m[1]],t)
     t=re.sub(r'(label|receipt) (page )?(13|18)\b',lambda m:m[1]+' '+(m[2] or '')+str(PAGE_MAP[int(m[3])]),t)
     t=t.replace('receipt 18','receipt 23').replace('jobs and page 3, then mission 1 pages 4-5','jobs and page 3, then mission 1 pages 4-6')
     t=re.sub(r'player page (\d+)',lambda m:'player page '+str(PAGE_MAP[int(m[1])]),t)
     el.__init__(t,el.style)
  # Rebuild preparation table with all page ranges, including the story pages.
  result[1]=f.head('Print, cut and sort','HOST / PREPARATION')+[gp('Per team: 23 standard sheets, or 22 without the cover. Two teams: 46 or 44. Read this guide on screen.'),f.grid(['Player pages','Prepare / distribute'],[
   ['2-3','4 job cards and whole record.'],['4-6','Story, actions and 4 postmarks.'],['7-9','Story, route board/actions, 5 strips and small Nori marker.'],['10-13','Story, actions, 3 private clues and 4 parcels.'],['14-17','Story, actions, whole map and whole replacement-label page.'],['18-22','Story, actions, 5 dispatches, whole delivery/check board and 4 homes. Cut the label now.'],['23','Receipt: adult holds until delivery is accepted.']],[w*.17,w*.83]),gp('31 cut pieces: 4 jobs + 4 postmarks + 5 routes + 1 marker + 3 clues + 4 parcels + 1 label + 5 dispatches + 4 homes.'),gp('Dark dashed borders mean CUT. Keep solid boards whole. Cut 30 initial pieces; the label becomes piece 31 in mission 5. Ignore empty cells. Count each pile before play.')]
  return result
 f.guide=guide
