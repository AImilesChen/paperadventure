'English repair 1.1. Original retail props stay immutable in halloween_paper_theatre.\n\nPrivate full-size finale is Host page 18. Player page 17 is a blank optional keepsake.\n'
from pathlib import Path
from reportlab.platypus import Flowable, Image, Spacer, Table, TableStyle
from reportlab.lib import colors
import halloween_paper_theatre as old
NAVY,LINE,CORAL=old.NAVY,old.LINE,old.CORAL
icon,polygon=old.icon,old.polygon

p=old.p
header=old.header
note=old.note
steps=old.steps
GEOMETRY=[]
CONTEXT={}
PLAYER_COUNT=17
HOST_COUNT=19
PILE_PAGES=[(6,7),(8,9),(10,11,12),(13,14,15),(16,)]
REHEARSAL=['BAT','OWL','PUMPKIN','STAR']
FINALE=['OWL','PUMPKIN','BAT','STAR']

def page(title,tag,*parts):
    return header(title,tag)+list(parts)

def box(title,body,width,host=False):
    return note('<b>'+title+'</b><br/>'+body,width,host)

class Sheet(old.Sheet):
    def draw(self):
        super().draw()
        x,y=self.canv.absolutePosition(0,0)
        row={**CONTEXT,'page':self.canv.getPageNumber(),'kind':self.kind,'x':x,'y':y,'width':self.width,'height':self.height}
        if self.kind in ('stage','facade','finale'):
            cw=(self.width-32-11)/2;ch=(390-11)/2
            row['centres']=[[x+16+col*(cw+11)+cw/2,y+54+(1-r)*(ch+11)+ch/2-9] for r in range(2) for col in range(2)]
            row['openingSize']=[cw-20,ch-30]
        GEOMETRY.append(row)

    def draw_record(self):
        c=self.canv
        rows=[('1 / FIND','Show the four marked posters on Player page 7.'),('2 / MAKE','Show the four unfolded actors from Player page 9.'),('3 / PLACE','Show the actual arrangement on Player page 12.'),('4 / REHEARSE','Use the original stage and spoken cue cards.'),('5 / PERFORM','Show the unobstructed picture after the curtain call.')]
        for i,(title,source) in enumerate(rows):
            y=350-i*76;c.setStrokeColor(old.LINE);c.roundRect(1,y,self.width-2,69,6)
            self.label(14,y+49,title,12,True);self.label(14,y+30,source,11)
            self.label(14,y+11,'Adult checked: ______     READY / TRY AGAIN',11)
        self.label(14,1,'Keep the original work. Do not copy the answers here.',11)

    def draw_search(self):
        c = self.canv
        c.setStrokeColor(LINE)
        c.roundRect(1, 102, self.width - 2, 350, 9)
        positions = [(.18, .73, 'BAT', True), (.52, .79, 'CLOUD', False),
                     (.8, .7, 'OWL', True), (.26, .47, 'LEAF', False),
                     (.63, .48, 'PUMPKIN', True), (.86, .3, 'CAT', False),
                     (.2, .22, 'STAR', True), (.51, .2, 'HOUSE', False)]
        for fx, fy, name, damaged in positions:
            x = self.width * fx
            y = 102 + 350 * fy
            c.setStrokeColor(NAVY)
            if name in ('BAT', 'OWL', 'PUMPKIN', 'STAR'):
                icon(c, name, x, y, 34)
            elif name == 'CLOUD':
                for dx in (-15, 0, 16): c.circle(x + dx, y, 14)
            elif name == 'LEAF':
                c.ellipse(x - 25, y - 10, x + 25, y + 10)
                c.line(x - 25, y - 10, x + 25, y + 10)
            elif name == 'CAT':
                polygon(c, [(x - 20, y - 20), (x - 20, y + 15), (x - 10, y + 30),
                            (x, y + 17), (x + 10, y + 30), (x + 20, y + 15),
                            (x + 20, y - 20)])
                c.circle(x - 8, y + 3, 2, fill=1)
                c.circle(x + 8, y + 3, 2, fill=1)
                polygon(c, [(x - 3, y - 5), (x + 3, y - 5), (x, y - 9)], 1)
                for side in (-1, 1):
                    c.line(x + side * 4, y - 9, x + side * 22, y - 8)
                    c.line(x + side * 4, y - 12, x + side * 22, y - 15)
            else:
                polygon(c, [(x - 27, y - 5), (x, y + 22), (x + 27, y - 5),
                            (x + 20, y - 5), (x + 20, y - 27),
                            (x - 20, y - 27), (x - 20, y - 5)])
            c.setStrokeColor(LINE)
            c.roundRect(x - 41, y - 43, 82, 86, 7)
            if damaged:
                # Every poster has a border. The three matching tear marks,
                # rather than a special border, identify the four actors.
                c.setStrokeColor(CORAL)
                c.setLineWidth(1.5)
                for j in range(3):
                    dx = x + 12 + j * 10
                    c.line(dx, y + 42, dx + 4, y + 34)
                    c.line(dx + 4, y + 34, dx + 8, y + 42)
                c.setLineWidth(1)
        self.label(8, 75, 'CUT VIEWER (ADULT)', 11, True)
        c.setDash(5, 3)
        c.rect(8, 3, 190, 64)
        c.rect(65, 12, 76, 44)
        c.setDash()
        self.label(217, 75, 'THREE-TEAR EXAMPLE', 11, True)
        c.setStrokeColor(CORAL)
        c.setStrokeColor(old.NAVY);c.setLineWidth(1.5)
        for j in range(3):
            dx = 225 + j * 10
            c.line(dx, 64, dx + 4, 56)
            c.line(dx + 4, 56, dx + 8, 64)
        c.setLineWidth(1)
        self.label(217, 38, 'Same scale as the poster marks.', 11)
        self.label(217, 19, 'Compare count and shape, not colour.', 11)


    def draw_registration(self):
        super().draw_registration()
        c=self.canv;self.label(17,447,'TOP',10,True)
        c.setStrokeColor(old.NAVY);c.line(46,446,46,458);c.line(46,458,42,453);c.line(46,458,50,453)

    def draw_stage(self):
        self.theatre_cells('stage')
        self.label(16,18,'Keep this arrangement. Use the original actors; do not copy it.',11)

    def draw_finale(self):
        self.theatre_cells('finale')
        self.label(16,18,'THE LIGHT RETURNS / Lift the window sheet after the curtain call.',11,True)

class ObservationMethod(Flowable):
    def __init__(self,width):
        super().__init__();self.width=width;self.height=175
    def draw(self):
        c=self.canv;c.setStrokeColor(old.LINE);c.roundRect(1,1,self.width-2,173,7)
        c.setFillColor(old.NAVY);c.setFont('ArialBold',12);c.drawString(14,151,'A PRACTICE EDGE / NOT A GAME POSTER')
        c.setStrokeColor(old.NAVY);c.setLineWidth(1.5)
        for j in range(3):
            x=33+j*10;c.line(x,115,x+4,107);c.line(x+4,107,x+8,115)
        c.setFont('Arial',11);c.drawString(100,108,'Look for three zigzag tears, not a coloured border.')
        c.setDash(5,3);c.rect(25,56,180,35);c.rect(81,61,70,25);c.setDash()
        c.drawString(225,70,'The paper opening isolates an edge.')
        c.drawString(14,24,'The viewer does not magnify. Count the marks and compare their shape.')

class OrientationMethod(Flowable):
    def __init__(self,width):super().__init__();self.width=width;self.height=170
    def draw(self):
        c=self.canv;c.setStrokeColor(old.LINE);c.setFillColor(old.NAVY);c.setFont('ArialBold',11)
        for i,label in enumerate(['TOP LEFT','TOP RIGHT','BOTTOM LEFT','BOTTOM RIGHT']):
            x=15+(i%2)*130;y=12+(1-i//2)*66;c.roundRect(x,y,122,60,4);c.drawString(x+8,y+25,label)
        c.drawString(75,151,'TOP OF THE SHEET')
        c.setFont('Arial',11)
        for i,t in enumerate(['All readers face the same top edge.','Directly above/below: same column,','one neighbouring place.','Directly left/right: same row,','one neighbouring place.']):c.drawString(290,130-i*22,t)

def heart(c,cx,cy,r,half=False,filled=False):
    q=c.beginPath();q.moveTo(cx,cy-r*.7);q.curveTo(cx+r*.2,cy-r*.45,cx+r,cy+r*.05,cx+r,cy+r*.5);q.curveTo(cx+r,cy+r,cx+r*.3,cy+r*1.1,cx,cy+r*.65)
    if not half:
        q.curveTo(cx-r*.3,cy+r*1.1,cx-r,cy+r,cx-r,cy+r*.5);q.curveTo(cx-r,cy+r*.05,cx-r*.2,cy-r*.45,cx,cy-r*.7);q.close()
    c.drawPath(q,stroke=1,fill=int(filled))

class FoldingMethod(Flowable):
    def __init__(self,width):super().__init__();self.width=width;self.height=205
    def draw(self):
        c=self.canv;cw=self.width/4;c.setStrokeColor(old.NAVY);c.setFillColor(old.NAVY)
        for i,title in enumerate(['1 / FLAT','2 / FOLD','3 / ADULT CUT','4 / UNFOLD']):
            x=i*cw;mid=x+cw/2;c.setFont('ArialBold',11);c.drawString(x+5,183,title)
            c.setLineWidth(2 if i==2 else 1.2);heart(c,mid,115,35,half=i in (1,2),filled=i==3)
            if i<3:
                c.setDash(2,3);c.line(mid,76,mid,162);c.setDash()
            c.setFont('Arial',11)
            lines=[['See the whole shape.','Neutral practice shape.'],['Ink stays outside.','Match the centre fold.'],['Cut the curved outline','through BOTH layers.'],['Open the joined fold.','Keep the whole shape.']][i]
            for k,t in enumerate(lines):c.drawString(x+4,43-k*17,t)
        c.setLineWidth(1)

class HingeMethod(Flowable):
    def __init__(self,width):super().__init__();self.width=width;self.height=164
    def draw(self):
        c=self.canv;c.setStrokeColor(old.NAVY);c.setFillColor(old.NAVY);c.setFont('ArialBold',11)
        c.drawString(12,145,'A PRACTICE WINDOW / ADULT PREPARATION')
        x,y,w,h=32,39,134,78
        c.setDash(6,3)
        for a,b in [((x,y),(x+w,y)),((x+w,y),(x+w,y+h)),((x+w,y+h),(x,y+h))]:c.line(*a,*b)
        c.setDash(2,3);c.line(x,y,x,y+h);c.setDash()
        c.setFont('Arial',11)
        for i,t in enumerate(['Cut the THREE long-dashed sides.','Keep the short-dashed hinge attached.','Fold gently; do not detach the flap.','Game left windows open left; right open right.']):c.drawString(195,115-i*22,t)
        c.drawString(12,12,'Fold marks remain attached in both examples. Do not cut down the centre fold.')

STORY=[
    "A gust has torn four actor posters in Pip's festival square. The other pictures are scenery. Find the four performers who should return to the paper stage.",
    'Pip finds the actor templates in the workshop. The complete drawings are already visible. Fold and cut them to make matching halves and four reusable paper actors.',
    'Four helpers remember parts of the stage. No one needs to show their private note. Listen together, move the actors and check every spoken relation.',
    'Pip hangs the paper theatre over the stage. Rehearse listening, finding the actor and opening the right window before the festival show.',
    'The audience is ready. This show calls the actors in a new order. Each actor will take a bow and leave the picture, until Pip can show the whole lantern.'
]
TITLES=['Find the actor posters','Make the paper actors','Share and arrange the stage','Rehearse the four windows','Perform and take a bow']
PROPS=['Player page 3 progress; Player page 7 posters and prepared viewer.','Four outer template cards from Player page 9; adult-handled scissors.','Four actors; private clues from Player page 11; whole stage mat Player page 12.','Arranged Player page 12 mat; hinged Player page 14 window sheet; four Player page 15 cue cards.','Player page 14 windows, four actors and cue cards. Adult privately prepares Host page 18.']
ACTIONS=[
    ["Put Player page 7 on the table. Slide the prepared viewer over each poster's top-right edge.",'Compare the printed three-tear reference. Look at count and shape; colour is not a rule.','Circle or point to the four matching posters. Spoken names are welcome; no copying or spelling test is needed.','Show all four choices to the adult. Keep the scene for reference. The adult marks progress row 1 and releases Player pages 8-9.'],
    ['Recall the marked posters. Adult gives the FOUR OUTER template cards, with the silhouettes still uncut.','Share the four cards by Player page 2. Fold one card on its centre line with ink outside; a partner checks it.','The adult cuts the visible HALF-outline through BOTH folded layers. Keep the centre fold joined; do not cut down it.','Unfold the shape. Repeat until all four actors are usable. Each child folds, checks, unfolds or places a piece.','Keep all four actors for later. Show them to the adult; mark progress row 2, then receive Player pages 10-12.'],
    ['Put Player page 12 in the middle, TOP pointing away from the readers. Adult distributes the four private Player page 11 cards by Player page 2.','Each holder reads their own clue aloud without showing the card. All holders may speak; a job title does not reserve the clues for one person.','Place one actor in each circle. Move them until all four relations are true. Use Player page 4 for the meaning of directly above, below, left and right.','Each holder checks their own clue against the actual stage. Ask for a hint if any clue fails.','Leave the arrangement on the original mat. Do not draw or copy it into another table. Adult checks and marks row 3; receive Player pages 13-15.'],
    ['Adult aligns the four corner crosses on Player page 14 over Player page 12, with both TOP arrows facing the same way. Hold two opposite corners. Actors stay beneath their windows.','Share the four Player page 15 cue cards by Player page 2. Close all windows. Card order is NOT an instruction to open in that order.','Adult reads Host page 14 ONE line at a time. The matching holder names or points to the actor, points to its agreed place, then opens that window.','Check the open window shows the named actor. If wrong, close it, reread and retry. Keep actors in place during rehearsal.','When all four cues work, adult checks row 4. Close all windows; retain the actual arrangement and cue cards. Receive Player page 16.'],
    ['Look away while the adult sets the private picture and actors beneath CLOSED windows. Return only after everything is covered.','Keep the agreed stage places. Adult may change cue holders, then reads the NEW Host page 17 script one line at a time.','For each line: name or point to the actor, point to its place, open the window and check the actual actor.','After the correct opening, adult helps lift that actor through the open window into a clear curtain-call space beside the theatre. Leave the opened window open.','After four correct cues, check that all four actors are beside the stage. Adult lifts the whole window sheet to show the unobstructed lantern picture.','Each child names or points to a contribution. Adult checks row 5, reads the private ending and may give the blank Player page 17 keepsake.']
]
RESULTS=['Four matching posters are circled or pointed out, with a reason for each.','Four usable, joined paper actors are ready for the stage.','Every private clue agrees with the one actual stage arrangement.','Four cues open the right windows. A mistake may be retried.','Four actors have taken a bow; the window sheet is lifted and the whole picture is visible.']

def mission(i,w):
    return page(TITLES[i],f'PLAYER / MISSION {i+1} / STORY AND ACTIONS',p("<b>Read Pip's scene:</b> "+STORY[i]),box('On the table',PROPS[i],w),Spacer(1,10),*steps(ACTIONS[i]),box('Show the adult',RESULTS[i],w))

GROUPS=[
    '2 children: Reader + Checker; Maker + Caller. Exchange the two bundles after missions 1-4.',
    '3 children: Reader + Checker, Maker, Caller. Pass the three bundles clockwise after missions 1-4.',
    '4 children: one job each. Pass the four jobs clockwise after missions 1-4.',
    '5 children: Reader pair, Maker, Caller, Checker. 6 children: Reader pair, Maker pair, Caller, Checker. Within a pair, swap the action and checking each mission; then pass every seat clockwise.',
    '7-12 children: two balanced teams of 3-6. Each has its own complete materials and private lantern sheet. Adult checks both teams before the next release; teams perform in turn.'
]
ALLOCATION='Four templates, four private clues and four cue cards: with 2 children, 2 each; with 3, 2/1/1; with 4, 1 each. With 5-6, four holders have one each; extra children check the fold, point to a place or help move a piece. For the next set or performance, change holders so everyone has an action. The adult handles scissors.'

def board_page(kind,w,host=False):
    titles={'stage':'The rehearsal stage','facade':'The hinged paper theatre','finale':'Private lantern scene'}
    messages={'stage':'Use the spoken clues to place four actors. Keep the actual arrangement for rehearsal. Match TOP and the four corner crosses to the window sheet.',
              'facade':'Adult cuts THREE long-dashed sides per window; keep its short-dashed hinge attached. Match TOP and four corner crosses. Hold two opposite corners.',
              'finale':'ADULT ONLY: print one per team. While children look away, place actors, cover with CLOSED windows and match TOP and the four crosses.'}
    return header(titles[kind],('HOST / PRIVATE PRINT MASTER / ONE PER TEAM' if host else 'PLAYER / KEEP WHOLE / TOP AT THE FAR EDGE'))+[old.theatre_intro(messages[kind],w),Sheet(w,kind)]

def player(source,w):
    pages=[
        page('The Missing Pumpkin Light','HALLOWEEN HOME / ENGLISH REPAIR 1.1',p('Help Pip recover a friendly paper theatre, make its actors and perform a lantern ending.'),Image(str(old.g.ROOT/source['cover']),width=w*.63,height=205,kind='proportional'),Spacer(1,12),box('Start with an adult', 'Adult reads the private Host Guide first. Give Player pages 1-5 and the first mission, Player pages 6-7. Keep later piles and the private lantern picture out of sight.',w),p('2-6 children plus an adult host per team; 7-12 children use two complete sets. The lantern is a printed picture revealed by paper windows.')),
        page('Share the theatre jobs','PLAYER / OPTIONAL CUT FOUR JOB CARDS',old.card_grid([('STORY READER','Read the scene and invite everyone to contribute.'),('PAPER MAKER','Move the viewer, fold or place pieces; a partner checks.'),('CUE CALLER','Help share private clues and listen for the next spoken cue.'),('STAGE CHECKER','Check the original work and show it to the adult. Adult marks progress.')],w,106),p('Jobs organise turns; everyone may read a held clue or operate a piece. Combine jobs for 2-3 children; pair jobs for 5-6. See Host page 4. Swap after missions 1-4.'),box('Share each four-piece set',ALLOCATION,w),p("Two teams keep separate complete materials. Never wait for another team's answer.")),
        page('Our theatre progress','PLAYER / KEEP WHOLE',p('Keep the real scene, actors and stage as evidence. After checking the original work, the adult marks one row here. No answer copying is required.'),Sheet(w,'record')),
        page('Look closely; agree a direction','PLAYER / METHOD EXAMPLES / NOT GAME ANSWERS',ObservationMethod(w),Spacer(1,15),OrientationMethod(w),p('An adult may read labels. Pointing, circling and spoken answers count. Use pencil so a changed choice can be erased.'),box('One view of the stage',"TOP faces away from the readers. Left and right mean the reader's view of the paper, not an actor's own left or right.",w)),
        page('Fold a shape; prepare a flap','PLAYER / METHOD DIAGRAMS / NOT GAME ACTORS',p('These neutral pictures explain the paper actions. They are not extra cut pieces. Actual actors are named only when the workshop is released.'),FoldingMethod(w),HingeMethod(w),box('Keep the fold joined','The full template drawing is already visible. Folding helps make matching halves; unfolding gives a reusable paper actor.',w)),
        mission(0,w),
        page('Spot the torn posters','PLAYER / MISSION 1 MATERIAL / KEEP THE SCENE',p('All eight pictures have borders. Four have THREE zigzag tears at the top-right edge. Adult prepares the viewer outer border and inner opening. Inspect one edge at a time.'),Sheet(w,'search')),
        mission(1,w),
        page('Four actor templates','PLAYER / MISSION 2 MATERIAL / ADULT CUTS',p('Adult separates FOUR OUTER cards before play. In mission 2, fold with ink outside; adult cuts the visible half-outline through BOTH layers. Keep the centre fold joined. Unfold and retain all four actors.'),Sheet(w,'puppets')),
        mission(2,w),
        page('Four private stage clues','PLAYER / MISSION 3 MATERIAL / CUT FOUR CARDS',p('Adult cuts the four borders and deals cards separately. Hold your card privately and read it aloud. Check it against the actual stage before the adult accepts the arrangement.'),Sheet(w,'clues')),
        board_page('stage',w),
        mission(3,w),
        board_page('facade',w),
        page('Four spoken cue cards','PLAYER / MISSIONS 4-5 / CUT FOUR CARDS',p('Each card describes an actor without giving its name or window number. Its position on this printed sheet is not the performance order. Listen to each new spoken line.'),Sheet(w,'cues'),box('Wait, identify, point, open','Hold the card privately. Say or point to the actor, point to its stage place, then open. During the finale, the actor takes a bow after its correct opening.',w)),
        mission(4,w),
        page('Our theatre keepsake','PLAYER / OPTIONAL / AFTER THE PRIVATE ENDING',p("Complete only after the adult has checked the whole show and read Pip's ending. This page has no answer key."),box('Draw or tell','Draw your favourite paper action, or ask an adult to write your words.',w),Spacer(1,180),p('A contribution I made: ______________________________________________'),p('A clue we checked together: _________________________________________'),p('For a replay, change jobs and try with fewer hints. The printed solution stays the same.'))
    ]
    assert len(pages)==PLAYER_COUNT
    return pages

PRIVATE_ANSWERS=[
    "Only BAT, OWL, PUMPKIN and STAR have THREE zigzag tears at their poster's top-right edge. CLOUD, LEAF, CAT and HOUSE are scenery. Check actual selections, not spelling.",
    'Four usable silhouettes: BAT, OWL, PUMPKIN, STAR. Each remains joined across its centre fold. A folded template becomes an actor; it is not counted as an extra fifth piece.',
    'Only arrangement: OWL top left; BAT top right; PUMPKIN bottom left; STAR bottom right. Check all four original relations, one per holder. Keep that arrangement on Player page 12.',
    'Rehearsal order: BAT/window 2, OWL/window 1, PUMPKIN/window 3, STAR/window 4. Each holder identifies the actor, points to its stage place and opens the matching window. Actors remain on the mat during rehearsal.',
    'Finale order: OWL/window 1, PUMPKIN/window 3, BAT/window 2, STAR/window 4. An actor moves beside the theatre only after its correct opening. After all four, lift the facade so the complete lantern picture is unobstructed.'
]
HINTS=[
    ['Compare the printed reference with one poster edge.','Count the zigzag tears; colour alone is not a rule.','Point to one matching edge, then let the team find and justify the other three.'],
    ['Find the centre FOLD line.','Fold ink outside; line up the two paper halves.','Adult demonstrates the cut on a spare neutral shape, retaining its joined fold.'],
    ['Use the neutral direction example on Player page 4.','Check which actor is directly above another.','Privately point to one failed relation. If support is still needed, establish OWL above PUMPKIN, then use the other clues.'],
    ['Repeat the description on the held cue card.','Ask which actor fits it, then where that actor stood.','Point to its place without opening it for the child; close and retry a wrong window.'],
    ['Repeat only the current new sentence.','Ask for the actor first, then its agreed stage place.','If the wrong window opened, close it before moving any actor. If an actor was moved early, put it back in its correct place and retry.']
]

def host_action(i,w):
    return page(TITLES[i],f'HOST / MISSION{i+1} / LEAD ACTIONS / PRIVATE',box('Prepare and release',PROPS[i],w,True),p('<b>Read the player scene:</b> '+STORY[i],True),p('Use Player'+str([6,8,10,13,16][i])+'. Read its numbered actions with the team. Keep all later pages private. Children show the actual work rather than copy answers.',True),*steps(ACTIONS[i],True),p('Stop for the separate private acceptance page. Do not read its answers aloud.',True))

def host_check(i,w):
    handoff=['Release Player pages 8-9: the workshop.','Release Player pages 10-12: private clues and stage.','Release Player pages 13-15: rehearsal, windows and cues.','Close the windows. Release Player page 16; privately set Host page 18.','Mark progress row 5, read Host page 17 ending, then optionally release Player page 17.'][i]
    return page('Check mission '+str(i+1),'HOST / PRIVATE ANSWERS / DO NOT READ TO PLAYERS',box('Accept only after checking',PRIVATE_ANSWERS[i],w,True),p('Compare the original scene, actor, stage or window action. A spoken answer or pointing is sufficient; writing and spelling are not additional conditions.',True),box('One hint at a time','<br/>'.join(str(j+1)+'. '+t for j,t in enumerate(HINTS[i])),w,True),p('Allow a retry after every hint. A failed attempt does not remove anyone from the game.',True),box('After acceptance',handoff,w,True))

def guide(source,w):
    pages=[
        page('Run the paper theatre','HOST / PRIVATE / ENGLISH REPAIR 1.1',p('Read this separately before printing or giving out materials. An adult hosts a team of 2-6 children. For 7-12, one adult may alternate between two complete teams, who perform in turn.',True),*steps(['Player Pack: 17 pages per team, single-sided. Choose A4 OR US Letter at Actual size / 100%.','Host page 18 is a PRIVATE FULL-SIZE LANTERN MASTER. Print one for EACH team even if reading this Guide on screen. Keep it out of the Player pile.','The full Host Guide has 19 pages including one lantern master. Guide on screen: 18 printed sheets for one team, 36 for two. Guide printed once: 36 for one team; 54 for two, including one extra Host page 18.','Prepare paper, pencils, eraser and adult-handled scissors. The lantern is a printed picture; no real light, glue or device is needed.','Give Player pages 1-5 and Player pages 6-7 first. Keep each later pile until the previous result is checked.'],True),box('What changes at the ending','During rehearsal, actors stay on the stage. During the finale, each correctly revealed actor takes a bow beside the theatre. Then lift the entire window sheet to show the whole picture.',w,True)),
        page('Print and release in stages','HOST / PREPARATION / PAGE MAP',p("Keep each team's complete set in its own envelope. Use one paper size and 100% throughout; never mix A4 and Letter layers.",True),*[box(a,b,w,True) for a,b in [('Start','Player pages 1-5 plus 6-7. Viewer prepared; later materials hidden.'),('After mission 1','Player pages 8-9: workshop and four outer template cards.'),('After mission 2','Player pages 10-12: arrangement task, separately held private clues and stage mat.'),('After mission 3','Player pages 13-15: rehearsal task, hinged window sheet and separately held cue cards.'),('After mission 4','Player page 16. Children look away while adult replaces the mat with Host page 18 beneath closed windows.'),('After the checked finale','Read Host page 17 ending. Player page 17 is a blank, optional keepsake.')]]),
        page('Prepare seventeen loose pieces','HOST / PRE-CUT CHECKLIST',*steps(['Player page 2: 4 job cards. Low-cut option: leave the four jobs as one whole reference sheet.','Player page 7: 1 viewer. Cut its outer border and inner opening. Keep the poster scene; discard only offcuts.','Player page 9:separate 4 OUTER template cards. Leave the silhouette contours INTACT until mission 2.','Player page 11: 4 private stage clues. Do not give the uncut clue page to a player.','Player page 15: 4 cue cards. Give separately; no actor name or window number is printed on them.','Player page 14:cut THREE long-dashed edges of each window; keep its labelled short-dashed FOLD hinge attached. Left windows open left; right open right.','Keep Player page 3, Player page 12, the hinged Player page 14 sheet and private Host page 18 WHOLE. Do not cut the stage circles.'],True),box('Count without double-counting','4 jobs + 1 viewer + 4 actors + 4 private clues + 4 cues=17 loose pieces. Before play, the 4 actors are still 4 outer template cards. Low-cut has 13 loose pieces when jobs stay whole. Window flaps remain attached and are not extra loose pieces.',w,True)),
        page('Give every child a turn','HOST / TEAM AND CARD ALLOCATION',*[p(t,True) for t in GROUPS],box('Share each four-piece set',ALLOCATION,w,True),p('For the extra holders in 5-6-player teams: alternate folding/checking, identifying/pointing, or opening/helping move an actor. Change holders for the finale. No child is assigned to watch for the entire game.',True)),
        page('Prepare the folds and view','HOST / METHOD / READ BEFORE CUTTING',p('Player pages 4-5 show neutral method diagrams without game actors or solved stage places. An adult may explain these before mission 1.',True),box('Fold-and-cut','The flat template already shows the complete drawing. Ink stays outside. Adult cuts the visible half-outline through BOTH layers, retaining the joined centre fold. Unfolding produces a symmetric reusable actor; it is not a hidden-picture puzzle.',w,True),box('Window and alignment','Use the long dash as CUT; short dash labelled FOLD stays attached. Match the four crosses on Player page 12, Player page 14 and Host page 18. All TOP arrows face away from readers. Hold opposite corners; do not change scale to fix a slip.',w,True),box('One meaning of direction',"Above/below means the same column and adjacent place. Left/right means the same row and adjacent place. Use the readers' view, never an actor's own left/right.",w,True),box('One evidence record',"Original marked posters, actors and arranged stage are the work. Only the adult's acceptance mark goes on Player page 3. Do not ask children to write every answer again.",w,True)),
    ]
    for i in range(5):
        pages.extend([host_action(i,w),host_check(i,w)])
        if i==3:
            pages.append(page('Read the rehearsal','HOST / PAGE 14 / EXACT SCRIPT / PRIVATE',p('Arranged Player page 12 sits beneath CLOSED Player page 14 windows. Deal Player page 15 cards by Host page 4. Read ONE line; wait for identification, a point to the stage place and the matching opening. Close an incorrect window and retry. Keep actors in place.',True),*[box(str(j+1)+' / SAY',sentence+'<br/><b>WAIT FOR:</b> '+answer,w,True) for j,(sentence,answer) in enumerate([
                ('"Pip sees the NIGHT SKY. Who sleeps upside down and flies after dusk?"','BAT / top right / window 2.'),
                ('"Pip looks toward the OLD TREE. Who watches from a branch with a round face?"','OWL / top left / window 1.'),
                ('"A light appears on the WARM PORCH. Who welcomes neighbours with a carved smile?"','PUMPKIN / bottom left / window 3.'),
                ('"Pip looks up for the FINAL SPARK. Who shines high above the festival?"','STAR / bottom right / window 4.')])],p('After all four: "Our actors know when to appear. Close the windows and keep the places for our real show." Accept row 4, release Player page 16 and privately set Host page 18.',True)))
    pages.extend([
        page('Perform the new script','HOST / PAGE 17 / FINALE SCRIPT AND ENDING / PRIVATE',p('Children look away. Replace Player page 12 with private Host page 18, put actors on its matching circles, cover with CLOSED Player page 14 and align TOP and the four crosses. Invite children back only after the art is hidden. Clear a curtain-call space beside the theatre.',True),p('Read ONE sentence. Holder identifies actor, points to place, opens, then adult helps move the correctly revealed actor beside the theatre. Keep the window open. Do not move a wrong actor; close and retry.',True),*[p('<b>SAY '+str(j+1)+':</b> '+sentence+' <b>WAIT:</b> '+answer,True) for j,(sentence,answer) in enumerate([
            ('"From the old tree, who watched over Pip\'s festival?"','OWL / window 1.'),('"At the doorway, who welcomed every neighbour?"','PUMPKIN / window 3.'),('"As music began, who flew across the evening sky?"','BAT / window 2.'),('"Above the whole show, who shone as Pip\'s paper lantern returned?"','STAR / window 4.')])],box('After four correct openings','Confirm all 4 actors are beside the theatre. Lift the WHOLE window sheet. The lantern picture is now unobstructed. Invite each child to name or point to a contribution, then accept row 5.',w,True),p('<b>READ ONLY AFTER ACCEPTANCE:</b> "Pip sees the whole bright lantern. The owl watched, the bat flew, the pumpkin welcomed everyone, and the star shone above the festival. You made the actors, shared the clues and brought our paper show back together."',True),p('Now give optional Player page 17. Keep the solved stage and complete closing passage private until this moment.',True)),
        board_page('finale',w,True),
        page('Pause, repair and reset','HOST / PAGE 19 / PRIVATE / AFTERCARE',box('If a fold or window tears','Reprint Player page 9 for a damaged actor, or Player page 14 for a damaged flap. Adult re-cuts only the required part. Keep paper size and 100% scale unchanged. If sheets shift, realign the crosses and hold the corners.',w,True),box('If a cut piece is missing','Reprint its labelled page. The jobs can stay whole for low-cut play. Do not promise a no-cut version has the same folding and hinged-window effect; those actions need prepared pieces.',w,True),box('Pause','Pause after an accepted mission. Keep original actors and stage in their agreed places; close windows and store flat. Hide the private lantern and later piles. On return, briefly reread only the current scene.',w,True),box('Reset for another show','Return actors to the template envelope; count 17 loose pieces, or 13 for low-cut. Close the attached windows, erase marks on the scene/progress, hide Host page 18, and sort Player pages 6-7, 8-9, 10-12, 13-15, 16. Player page 17 is optional. Swap jobs; the printed solution stays the same.',w,True),p("An adult may read or record a child's exact words. Accept pointing and a correct paper action. Give one hint at a time, allow a retry and keep every child involved.",True))
    ])
    assert len(pages)==HOST_COUNT,len(pages)
    return pages
