"""Celebration Home v0.2: cooperative roles, separate props and executable hosting."""
from pathlib import Path
import hashlib, json
from pypdf import PdfReader
from reportlab.platypus import SimpleDocTemplate, PageBreak
import generate_celebration_samples as g

ROOT = g.ROOT
OUT = ROOT / 'output/pdf'
ROLES = ['Courier', 'Spotter', 'Mapper', 'Keeper']
TASKS = {
 'Courier': ['Read the animal clue; propose a letter.', 'Read the start place from the record; ask for the first strip.', 'Share the flag-colour condition.', 'Read the coded symbols in order.', 'Present the chosen parcel and its evidence.'],
 'Spotter': ['Read the ear clue; compare the seals.', 'Check each strip joins at the same place.', 'Share the star-count condition.', 'Find the letters on key card I.', 'Check the flag condition on each parcel.'],
 'Mapper': ['Write the chosen letter and start place.', 'Arrange strips; draw the agreed route.', 'Record the label number and code mark.', 'Write the letters from each speaker.', 'Check the decoded place and record the parcel.'],
 'Keeper': ['Read the dot clue; check all three conditions.', 'Keep the solved letter visible; record the flag.', 'Share the number condition; keep the selected card.', 'Use the chosen code mark and key card II; check the word.', 'Check the label number; invite every player to explain a contribution.'],
}

def page(title, intro=''):
 return [g.p(title, 'h1')] + ([g.p(intro)] if intro else [])

def card(title, text, w):
 return [g.box(f'<b>{title}</b><br/>{text}', w), g.gap(13)]

def table(headers, rows, w, ratios):
 t=g.grid(headers, rows, [w*r for r in ratios])
 t.setStyle(g.TableStyle([('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
 return t

def record(w):
 return table(['Checkpoint', 'Our evidence'], [['1 - Letter', 'Letter: ______  Start: ______'],['2 - Route','Strip order: ______  Flag: ______'],['3 - Label','Label: ______  Number: ______  Code mark: ______'],['4 - Message','Decoded place: ____________________'],['5 - Parcel','Parcel: ______  Our reasons: ____________________']],w,[.28,.72])

def player(w):
 pages=[]
 pages.append(page('The Missing Birthday Chest', 'HOME / H01 / PLAYER PACK / FREE EDITION v0.2') + [g.box('<b>A message from Fenn</b><br/>Our celebration chest is ready, but its delivery label has gone missing! Help my delivery team follow the paper trail and find the right parcel. Share your clues: no explorer has to solve everything alone.',w,g.CREAM), *g.cover_art(g.CELEBRATION_HOME_ART),g.p('Your team rules','h2'),g.p('Listen to each clue holder before choosing. Take turns touching the props and writing. Keep solved evidence nearby. Ask the grown-up for hints. There is no timer, race or need to search around the house.'),g.p('The chest is a paper story prop. You do not need a real chest, purchased gift or phone. Your grown-up gives you each new checkpoint.')])
 pages.append(page('Your explorer team','Read this page together before starting.')+[table(['Players','How to share the jobs'],[['2','One person: Courier + Mapper. Other person: Spotter + Keeper. Swap bundles after every checkpoint.'],['3','Courier, Spotter, Mapper + Keeper. Rotate the combined job after each checkpoint.'],['4','One job each. Pass role cards clockwise after each checkpoint.'],['5-6','Two people may share a job: one reads, one operates or checks. Swap within pairs each checkpoint.'],['7-12','Your grown-up makes two balanced teams, 3-6 each. Every team gets a complete set; follow the 3-6 rules.']],w,[.15,.85]),g.gap(),g.p('Everyone contributes','h2'),g.p('Before deciding, go around the team: each person shares one observation or question. Nobody moves another player\'s card without asking. Your grown-up can read aloud; that player still chooses and explains.'),g.p('Role names are jobs, not characters you must pretend to be. Partners share the role card; you do not need twelve different characters.')])
 for pair in [ROLES[:2],ROLES[2:]]:
  f=page('Explorer job cards','Grown-up: cut around the two bordered cards. Keep these available for the whole game.')
  for role in pair:
   f+=card(role,'<br/>'.join(f'{i+1}. {t}' for i,t in enumerate(TASKS[role]))+'<br/><b>Ask:</b> What does our team know, and what do we still need?',w)
  pages.append(f)
 pages.append(page('Team trail and evidence','Mapper records agreed results. Keeper keeps this sheet available. No names are needed.')+[record(w),g.gap(18),g.p('Evidence parking','h2'),g.p('Place your selected letter, route, label and decoded message beside this record. Each is needed later.'),g.p('Our teamwork moment: ____________________________________'),g.p('Something we asked or noticed: ______________________________')])
 pages.append(page('Checkpoint 1 - Find Fenn\'s letter','Courier reads the task. Wait until each clue holder has spoken before choosing.')+[g.SealComparisonCards(w,g.HOME_LETTER_CARDS,"home"),g.gap(18),g.p('Compare all three conditions. Mapper records the letter and route start on page 5. Keeper explains why the other two letters do not fit.'),g.p('Do not cut this board. The adult gives out the separate clues from page 7.')])
 f=page('Checkpoint 1 - Separate clue cards','Grown-up only: cut the three cards. Give Courier the animal, Spotter the ears and Keeper the dots. Mapper records. With combined jobs, one person holds more than one clue.')
 for title,text in [('Courier / ANIMAL','Fenn uses a FOX seal.'),('Spotter / EARS','Fenn\'s seal has TWO pointed ears.'),('Keeper / DOTS','Fenn\'s seal has exactly THREE dots.')]: f+=card(title,text,w)
 pages.append(f)
 pages.append(page('Checkpoint 2 - Route strips','Grown-up: cut each bordered strip. Share them around the team; each player may hold one or more.')+g.strip_cards(['Strip','From','To'],g.HOME_ROUTE_CARDS,w)+[g.p('Courier reads the start from the selected letter. Each holder says where their strip begins and ends. Mapper arranges the proposed path; Spotter checks matching ends. A valid path must reach a flag, not merely stop anywhere. Keeper records the flag on page 5.')])
 pages.append(page('Checkpoint 2 - Paper route map','Do not cut. Start at your selected letter\'s place. Draw only agreed connections from the route strips.')+[g.CelebrationRouteMap(w, 'home'),g.gap(14),g.p('Each player points to one connection and explains why it belongs. Keep the route strips and this map visible for the next checkpoint.')])
 pages.append(page('Checkpoint 3 - Delivery label board','Do not cut. Listen to the three separate clues before comparing the four labels.')+[g.CelebrationChoiceCards(w,g.HOME_LABEL_CARDS,'home'),g.gap(18),g.p('Mapper records the label ID, number and code mark. Every label must satisfy all three conditions. Keep your selected label information for Checkpoints 4 and 5.')])
 f=page('Checkpoint 3 - Separate clue cards','Grown-up: cut the three cards and distribute to their jobs. Mapper operates the board and records; all players must explain a check.')
 for title,text in [('Courier / FLAG','Use the flag colour your team reached at Checkpoint 2.'),('Spotter / STARS','The correct label has exactly TWO stars.'),('Keeper / NUMBER','The correct label number is FOUR.')]: f+=card(title,text,w)
 pages.append(f)
 pages.append(page('Checkpoint 4 - Coded message','Courier reads the symbols in this order. Ask the two key holders for letters using ONLY the code mark recorded from your chosen label.')+[g.box('SUN &nbsp; CLOUD &nbsp; FLAG &nbsp; MOON &nbsp; PATH',w),g.p('Mapper writes each spoken letter below. Keeper checks the selected code mark before accepting the word.'),g.p('SUN: ____ CLOUD: ____ FLAG: ____ MOON: ____ PATH: ____'),g.p('Our place word: ____________________________________'),g.p('Each player reads or checks at least one letter. Copy the final word to page 5. This is a fictional delivery place, not permission to search the house.')])
 f=page('Checkpoint 4 - Split key cards','Grown-up: cut the two key panels. Spotter keeps I; Keeper keeps II. Other jobs hold the message and record. Key holders share the requested letters aloud.')
 for title,cols,rows in [('KEY I',['Code mark','SUN','CLOUD'],[[r[0],r[1],r[2]] for r in g.HOME_CODE_ROWS]),('KEY II',['Code mark','FLAG','MOON','PATH'],[[r[0],r[3],r[4],r[5]] for r in g.HOME_CODE_ROWS])]:
  f += [g.p(title,'h2'),table(cols,rows,w,[1/len(cols)]*len(cols)),g.gap(22)]
 f += [g.p('Cut outside each entire table. Do not cut individual cells. Use the same code-mark row on BOTH keys. The host does not need to tell you which row.')]
 pages.append(f)
 f=page('Checkpoint 5 - Parcel candidates','Grown-up: cut the four cards. Spread them in the evidence parking area; the whole team compares them.')
 for pid,flag,num,place in [('A','RED',4,'TABLE'),('B','RED',4,'SHELF'),('C','BLUE',4,'TABLE'),('D','RED',5,'TABLE')]:f+=card('PARCEL '+pid,f'Flag: {flag} / Label number: {num} / Place: {place}',w)
 f += [g.p('Spotter checks the flag, Keeper checks the number and Mapper checks the place. Courier explains the decision. If you share a job, take separate checks. Every player gives evidence or explains why another parcel fails.')]
 pages.append(f)
 pages.append(page('Finish the delivery together','Keep this page until your grown-up asks for the final explanation.')+[g.p('Our chosen parcel: ____________________'),g.p('Flag evidence: __________________________________________'),g.p('Number evidence: ________________________________________'),g.p('Place evidence: __________________________________________'),g.p('Ask the grown-up to check your evidence, then receive Fenn\'s celebration letter. In two-team play, each team explains its own route before the shared celebration.'),g.box('<b>Explorer team celebration</b><br/>We listened, checked and helped each other finish the delivery.<br/>One contribution I made: ___________________________<br/>One contribution I noticed: _________________________',w,g.CREAM),g.p('This keepsake is optional. You do not need to write names or score anybody.')])
 return pages

def guide(w):
 pages=[]
 pages.append(page('Host Guide - Celebration Home','PRIVATE ADULT MATERIAL / v0.2 / Keep answers away from players.')+[g.p('Quick start','h2'),g.p('Choose a team arrangement, print the checklist on page 2, prepare five numbered piles or optional envelopes, assign the four job cards and read the opening below. Do not give out the complete Player Pack at once.'),table(['Players','Teams / Player copies'],[['2-3','One team / one complete Player Pack'],['4-6','One team / one complete Player Pack'],['7-12','Two balanced teams of 3-6 / two complete Player Packs']],w,[.25,.75]),g.gap(),g.p('One adult host is additional to the advertised player count. Use one Host Guide for either mode. Adult preparation requires scissors; players need paper and pencils. Five envelopes per team are optional, not required. No real gift, chest, lock or phone is required.'),g.p('Opening script','h2'),g.box('Fenn\'s celebration chest has lost its delivery label. Your team will follow five paper clues to find the right parcel. Everybody has a job. We will listen to all clue holders, take turns and ask for hints when needed. This is cooperative: there is no race.',w,g.CREAM),g.p('Scope: redesigned free edition, not yet play-tested with families. Review the instructions before use. Do not promise a duration or claim validated learning outcomes.')])
 rows=[['1','Story introduction','1 per team','No / read together'],['2','Team rules','1 per team','No / keep available'],['3-4','Four job cards','1 set per team','Cut borders / assign jobs'],['5','Team trail','1 per team','No / Mapper + Keeper'],['6','Letter board','1 per team','No / checkpoint 1'],['7','Three letter clues','1 set per team','Cut / Courier, Spotter, Keeper'],['8','Five route strips','1 set per team','Cut / share around team'],['9','Map','1 per team','No / checkpoint 2'],['10','Label board','1 per team','No / checkpoint 3'],['11','Three label clues','1 set per team','Cut / Courier, Spotter, Keeper'],['12','Coded message','1 per team','No / Courier + Mapper'],['13','Two key panels','1 set per team','Cut outside tables / Spotter + Keeper'],['14','Four parcels','1 set per team','Cut / checkpoint 5'],['15','Finish / keepsake','1 per team','No / finish; keepsake optional']]
 pages.append(page('Print and prepare checklist','Select A4 OR US Letter. Print at actual size, single-sided. Black-and-white works: every colour clue is also written.')+[table(['Player page','Material','Quantity','Cut / distribution'],rows,w,[.12,.26,.2,.42]),g.gap(),g.p('Player Pack: 15 sheets per team. Host Guide: 8 sheets once. Total: 23 sheets for one team; 38 for two teams. No blank pages or second paper-size set are needed. Print this guide privately; its page 8 contains the finale letters.')])
 pages.append(page('Set the table and share the jobs','Prepare these piles separately for each team. Optional envelopes may be labelled 1-5.')+[table(['Keep on table','Hold back until needed'],[['Job cards (3-4), team rules (2), team trail (5)','1: letter board (6) + clues (7)'],['One pencil per player if available','2: cut route strips (8) + intact map (9)'],['A clear space for solved evidence','3: label board (10) + clues (11)'],['Adult guide stays with host','4: message (12) + split keys (13)'],['Read story page 1 at opening','5: parcels (14) + finish sheet (15)']],w,[.5,.5]),g.gap(),g.p('Use page 2 of the Player Pack to combine jobs for 2-3, rotate four jobs for 4, or pair jobs for 5-6. Partners alternate reading and handling props. Rotate after each checkpoint: pass job cards clockwise, keeping solved evidence with the team.'),g.p('For two teams, label piles TEAM A and TEAM B before cutting. Keep both teams\' materials complete. Each team may ask for help independently; do not require either to wait for the other\'s answer. Finish together after both explain their evidence.'),g.p('Participation check','h2'),g.p('Before accepting each result, invite every player to share an observation, perform a check or ask a question. Give quiet players a concrete turn. Older players may help read but should not choose for younger players.')])
 pages.append(page('Host checkpoints 1 and 2','Read only the task text aloud; do not reveal the answers printed below.')+[g.p('1 - Letter / give pages 6 and 7','h2'),g.p('Say: "Each clue holder knows one part of Fenn\'s seal. Share the parts, then choose together." Give animal to Courier, ears to Spotter and dots to Keeper. Mapper records. Accept Letter A / SUN only after all three conditions are explained. Keep page 6 visible.'),g.p('Hint 1: Compare one condition at a time. Hint 2: Look for the fox with two ears and three dots.'),g.p('2 - Route / give pages 8 and 9','h2'),g.p('Say: "Start at the place from your letter. Tell the team what your strip connects." Share strips among all players. Mapper arranges and draws only agreed links; Spotter checks joins; Keeper records the flag. Accept A-B-C / RED FLAG; D-E ends at CLOUD and fails the flag requirement.'),g.p('Hint 1: Match one strip\'s end to another\'s start. Hint 2: There are two SUN starts, but only one reaches a flag.'),g.p('Pass job cards clockwise. The next operator must be a different player where possible. Keep the selected letter, route and record in the evidence area.')])
 pages.append(page('Host checkpoints 3 and 4','Information belongs on separate cards, not on a single shared answer sheet.')+[g.p('3 - Label / give pages 10 and 11','h2'),g.p('Say: "Listen to every condition before choosing." Courier gives the flag requirement, Spotter the stars and Keeper the number. Mapper checks the board and records. Accept Label A / 4 / FOX: RED, two stars, number 4. B fails stars, C fails flag, D fails number.'),g.p('Hint 1: Use the flag you already found. Hint 2: Compare each label against RED, two stars and 4.'),g.p('4 - Message / give pages 12 and 13','h2'),g.p('Say: "Use your selected label\'s code mark on both keys." Courier reads SUN, CLOUD, FLAG, MOON, PATH; Spotter holds key I, Keeper key II; Mapper records letters. Ask partners to alternate requested letters. Accept TABLE from FOX. Other rows spell SHELF, CHAIR, FLOOR and are not interchangeable.'),g.p('Hint 1: Which code mark did your label carry? Hint 2: Use the FOX row on both panels; it begins T, A.'),g.p('Pass job cards again. Keep the solved message. The word TABLE is fictional: players do not need to search your furniture.')])
 pages.append(page('Host checkpoint 5 and the celebration','Give pages 14 and 15. Keep the finale letters from guide page 8 hidden.')+[g.p('5 - Delivery','h2'),g.p('Say: "Your final parcel must match all the evidence you kept. Explain each check." Spotter checks RED, Keeper checks 4, Mapper checks TABLE and Courier reports. Accept Parcel A after all three are explained. B fails place, C fails flag, D fails number. Each additional player must reject another candidate or confirm a check.'),g.p('Hint 1: Read the team trail again. Hint 2: Find RED, 4 and TABLE on the same parcel.'),g.p('Finale script','h2'),g.box('You have restored the delivery label! Your route, number and message all point to the same parcel. Fenn\'s celebration chest can now be delivered. Let\'s read the letter and notice how everybody helped.',w,g.CREAM),g.p('Give one finale letter per team from guide page 8. For two teams, hear both explanations before the shared reading. Invite each player to name a contribution of their own or somebody else\'s. The keepsake on player page 15 is optional; no ranking or names are required.'),g.p('Do not require sweets, a paid present or a physical chest. An adult may add a personal handwritten celebration message if desired.')])
 pages.append(page('Support, interruptions and checks','Use this page when the group needs an adjustment.')+[g.p('<b>Reading:</b> Read a card privately with its holder, then let that player convey the clue or point to evidence. Repeat words without choosing for them. For older players, ask why the rejected candidates fail; do not invent extra required rules.'),g.p('<b>Guessing:</b> A correct guess is not yet a completed checkpoint. Ask for its evidence, using the first hint if necessary. Do not penalise an incorrect answer; invite another comparison.'),g.p('<b>Early reveal:</b> Keep any accidentally seen card face down until its checkpoint. If an answer is seen, ask a different player to explain its evidence. The game is not a secret test.'),g.p('<b>Missing prop:</b> Reprint that numbered page or copy its complete card text from the master. Do not invent new clue values. Adult answers alone are not replacement player props.'),g.p('<b>Player leaves:</b> Combine the departing job with a remaining job and continue. For two teams, retain both complete evidence sets or bring players together using one set; do not mix conflicting partial records.'),g.p('<b>Pause:</b> Leave each team\'s evidence together and resume at its next checkpoint. There is no clock or elimination.'),g.p('<b>Before play:</b> Check all five piles, cut only indicated borders, keep guides separate and make sure both paper sizes are not mixed. No running, climbing, unsafe hiding places or private belongings are part of the rules.'),g.p('<b>After play:</b> Check participation and confusing instructions. Time, difficulty and enjoyment still need real-family feedback; automated checks cannot establish them.')])
 f=page('Fenn\'s finale letters','PRIVATE until Parcel A is confirmed. Cut one bordered letter per team. Two copies are provided on this page.')
 for team in ['TEAM A / ONE-TEAM MODE','TEAM B / TWO-TEAM MODE']:
  f+=card(team,'<b>Dear explorers,</b><br/>You found the right route, restored the label and delivered our celebration chest. Your RED flag, label number 4 and TABLE message all matched Parcel A. Thank you for listening, sharing your clues and checking together!<br/><br/>From Fenn the fox<br/>Optional grown-up message: _________________________',w)
 pages.append(f)
 return pages

def footer(canvas,doc):
 w,h=doc.pagesize
 canvas.setFillColor(g.BLUE);canvas.rect(0,h-37,w,37,fill=1,stroke=0)
 canvas.setFillColor(g.NAVY);canvas.setFont('ArialBold',8)
 canvas.drawString(44,h-23,'PAPER ADVENTURE WORKSHOP / CELEBRATION HOME')
 canvas.setFillColor(g.CORAL);canvas.setFont('ArialBold',7)
 canvas.drawRightString(w-44,h-23,'NOT PLAY-TESTED')
 canvas.setStrokeColor(g.LINE);canvas.line(44,42,w-44,42)
 canvas.setFillColor(g.INK);canvas.setFont('Arial',8)
 canvas.drawString(44,28,f'{doc.product_code} | free edition v0.2 | {doc.paper_label}')
 canvas.drawRightString(doc.pagesize[0]-44,28,f'Page {doc.page}')

def main():
 g.validate_logic(); items=[]
 for label,size in [('A4',g.A4),('Letter',g.letter)]:
  w=size[0]-88
  for role,pages in [('player',player(w)),('guide',guide(w))]:
   assert len(pages)==(15 if role=='player' else 8)
   path=OUT/f'celebration-home-{role}-v0.2-{label}.pdf'
   doc=SimpleDocTemplate(str(path),pagesize=size,leftMargin=44,rightMargin=44,topMargin=63,bottomMargin=57,title=f'Celebration Home {role} v0.2',author='Paper Adventure Workshop')
   doc.product_code=f'H01 {role}';doc.paper_label=label
   flow=[]
   for i,f in enumerate(pages):
    if i:flow.append(PageBreak())
    flow.extend(f)
   doc.build(flow,onFirstPage=footer,onLaterPages=footer)
   count=len(PdfReader(path).pages)
   assert count==len(pages),(path,count,len(pages))
   items.append({'path':path.relative_to(ROOT).as_posix(),'paper':label,'role':role,'pages':count,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'r2Key':f'free/celebration/home/v0.2/{label}/{role}.pdf'})
 (OUT/'celebration-home-v0.2-manifest.json').write_text(json.dumps({'version':'v0.2','items':items},indent=2)+'\n')
 print(json.dumps(items,indent=2))

if __name__=='__main__':main()


