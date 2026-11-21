"""English H03 repair: private host references stay out of the Player Pack."""
from pathlib import Path
import json
from free_game_zh_content import P, text, box, grid, lines, special
E=json.loads((Path(__file__).resolve().parents[1]/'shared/space-home-edition.json').read_text(encoding='utf-8'))

def jobs(n, mission):
    bundles={2:['C/M','E/V'],3:['C/M','E','V'],4:['C','E','M','V'],5:['C','E-place','E-check','M','V'],6:['C','E-place','E-check','M-record','M-readback','V']}[n]
    return [bundles[(i-(mission-1))%n] for i in range(n)]

def content(locale='en'):
    if locale=='zh':
        from space_home_zh_content import content as chinese
        return chinese()
    if locale!='en':raise ValueError('Unsupported document locale.')
    def steps(*xs):return text('<br/>'.join(f'{i}. {v}' for i,v in enumerate(xs,1)))
    keep=box('Before the next mission','Keep the original pieces and checked record. Show the adult what you did and correct any mismatch. Change jobs using the seat table after missions 1-4. Later pages stay with the adult.')
    player=[
      P(E['titles']['en'],'Space Home / H03 / ages 6-12 with adult reading support',special('cover'),
        box('Pip needs a control crew','Pip the robot probe has lost contact. Rebuild the paper signal, power the console, share three clues and decode the request. Then use the same six cells to send a reply. All actions happen at the table.'),
        box('Begin with Player pages 1-3 only','One adult hosts each team of 2-6 players. For 7-12 players use two independent complete sets. Choose jobs on page 2; keep the shared record on page 3. The adult keeps all later mission piles and the final response.'),
        text('Ordinary paper, two pencils, an eraser and adult-handled scissors are enough. You may point, move pieces or dictate while an adult reads or writes.')),
      P('Four control-room jobs','Full-cut: adult cuts four outer role-card borders. Low-cut: keep this whole page and point to jobs.',special('jobs'),
        box('Share the work','Use the Host Guide seat tables. Role partners share one card and exchange placing/checking or recording/read-back during each mission. Every player may suggest a move; the adult independently checks every accepted result.')),
      P('Our shared mission record','Keep whole. Record each discovery once. Retain boards and the decoded message instead of copying them again.',
        lines(['1 / Wave order: ______  Band: ______  Marks on ONE strip: ______',
               '2 / Adult checked the RECEIVE board: ______ (keep the actual board)',
               '3 / Phase: ______  Antenna badge: ______ (band comes from row 1)',
               '4 / Adult checked the selected strip and message on page 14: ______',
               '5 / Adult accepted the SEND board and transmission on page 17: ______']),
        box('Use original evidence','A tick is recorded only after the action is shown and checked. Correct only a result that actually changed. An adult may write your words; no long account or invented failure is required.')),
      P('Mission 1 / rebuild the signal','Receive Player pages 4-6 together.',
        box('Read the scene','A faint voice asks, "Can anyone hear me?" Solar interference has split Pip\'s wave into three pieces. The signal starts HIGH and must return HIGH. Reconnect all three pieces to find its band.'),
        steps('Keep receiver board 5 whole. The adult cuts the three wave strips on page 6.',
              'Keep all words upright. Choose a strip whose IN matches START HIGH; match its OUT to the next IN. Use all three and finish at END HIGH.',
              'Read the BAND LETTERS in the arranged order. Count the wave marks on ONE strip, not all three strips together. Record order, band and count once in row 1.',
              'Point to both matching joins and the two end conditions for the adult.'),special('wave-example'),keep),
      P('Receiver board / keep whole','Three empty slots. Place one upright wave strip in each. Follow the printed OUT and IN levels, not the strip IDs.',special('receiver')),
      P('Three shuffled wave strips','Adult cuts THREE outer dashed rectangles. Keep each strip ID, IN, OUT, band letter and all wave marks.',special('waves')),
      P('Mission 2 / power the receiving console','Receive Player pages 7-9. Keep the wave evidence and shared record.',
        box('Read the scene','The link is still faint. Only six paper power cells are available. To hear Pip, the console must catch an incoming signal, read its code and block solar interference. Sending must wait.'),
        steps('Keep device board 8 whole. The adult cuts all six cells on page 9; start with all six beside the empty board.',
              'Read all five device purposes and costs. Choose the devices needed for the three receiving jobs in the scene; fill every slot on those devices.',
              'Use all six cells, with none left loose. Keep sending devices empty: receiving and sending cannot run together.',
              'Show the adult each required job, its device and its occupied slots. After acceptance, mark row 2. Keep the board and all six cells for mission 5.'),keep),
      P('Control-room power board','Keep whole. All devices start empty. A cost is the number of one-unit cells a device needs; a device works only when ALL its slots are filled.',special('power')),
      P('Six reusable power cells','Adult cuts SIX outer dashed rectangles. Every cell is worth one unit. Keep all six for both receiving and sending.',special('cells')),
      P('Mission 3 / share three setting clues','Receive Player pages 10-12. Keep the arranged wave strips and record.',
        box('Read the scene','Three controls need setting before Pip\'s instruction can be read. Each specialist has one clue. Share all three facts, find their original sources and agree on the settings.'),
        steps('Adult cuts the three clue cards on page 12. Give BAND to Commander, PHASE to Engineer and BADGE to Verifier. Role partners share the same card.',
              'With two players, the Commander/Communicator player holds BAND; the Engineer/Verifier player holds PHASE and BADGE. Share all three cards in turn. Three different people are not required.',
              'Communicator repeats all three facts. Circle one BAND, one PHASE and one BADGE on board 11. PHASE is a setting number chosen from the clue; no science knowledge is needed.',
              'Each card holder points to its source. Show all three controls to the adult; record phase and badge once in row 3. The band is already in row 1.'),keep),
      P('Receive settings / keep whole','Read and share all three clues before circling one control in each column.',special('calibration')),
      P('Three separate crew clues','Adult cuts THREE outer dashed cards and hands them to the assigned roles. Each card names the source to inspect.',special('clues')),
      P('Mission 4 / decode Pip\'s request','Receive Player pages 13-15. Keep the calibration board and shared record.',
        box('Read the scene','Five received icons arrive in a row. "Use the phase you found," says Pip. The fixed key has the same icons in a different order. Find one character at a time to understand the request.'),
        steps('Keep symbol board 14 whole. Adult cuts ALL THREE code strips on page 15. Choose only the strip whose CODE number matches your checked PHASE; keep the other two beside the board.',
              'Align the chosen strip under the FIXED KEY using its left edge and five column marks. Never place it under the received-message row.',
              'For each received icon, find the identical icon in the fixed key. Take the character directly below THAT key column. Characters can be letters or digits. Write it in the blank below the received icon.',
              'Follow the received order for all five characters; explain the whole instruction. Verifier traces every lookup with the selected strip before the adult marks record row 4.'),special('lookup-example'),keep),
      P('Received message and fixed key','Keep whole. Write each character below its received icon. Use the selected strip below the fixed key, with all five columns aligned.',special('decoder')),
      P('Three code strips','Adult cuts ALL THREE dashed outer borders. Select ONE by phase; the unselected strips remain available. Keep TOP and the left-edge alignment mark.',special('codes')),
      P('Mission 5 / send the paper reply','Receive Player pages 16-18. Retain the power board, all six cells, settings, shared record and decoded message.',
        box('Read the scene','Pip is ready to listen. Receiving can stop. Sending needs an outgoing signal, protection from interference and timed pulses. Use the request you actually decoded to decide how many pulses to send.'),
        steps('Keep transmission 17 whole; adult cuts five pulse markers on page 18. Read the actual decoded instruction before choosing any markers. One pulse card represents one short signal.',
              'Read the five device purposes again. Decide which receiving devices can rest and which device must keep protecting the signal. Reassign the SAME six cells to the sending jobs. No cell is created or discarded.',
              'Fully power the needed devices; leave the unused ones empty. Show the actual settings, decoded message and power board beside form 17. Follow its four evidence checks without copying them again.',
              'Place the requested number of pulse cards from slot 1 onwards. Keep the other pulse cards outside the slots. Every player points, explains or performs one action.',
              'Adult independently checks the originals, board and transmission. Correct any mismatch and recheck. Only after acceptance mark row 5 and hear the private Pip response; page 19 is optional afterwards.'),
        box('If your crew needs assisted no-cut play','For pencil-cell play, erase marks from every device you switch off BEFORE drawing them in the new slots. Marks on a device that remains on stay in place. Recount exactly six occupied slots, then draw the requested pulse count in the final slots.')),
      P('Outgoing paper transmission','Keep whole. TO: PIP. Keep the settings board, shared record, decoded message, selected code strip and actual power board beside this form. Tick only after checking each item.',special('transmission')),
      P('Five pulse markers','Adult cuts FIVE outer dashed rectangles. Each card means ONE short signal. Decide the count from the decoded request, not the number of cards provided.',special('pulses')),
      P('My control-room keepsake','Optional, after the adult reads Pip\'s response. Draw, point or dictate a memory; this page is not another pass condition.',special('keepsake'),
        lines(['One paper action I helped with:','One choice our crew checked:']))
    ]
    stages=[
      ('Rebuild the signal','4-6','Reconnect the three pieces from HIGH back to HIGH. Show both joins before trusting the band.',
       'Give the empty receiver board and all three shuffled strips. Keep words upright. Players use all pieces and compare OUT to IN, then record the band and the wave count on ONE strip. Do not prearrange the cards.',
       'The sole upright chain is R-T-K: HIGH to LOW to MID to HIGH. The letters M-I-D give MID. One strip shows three wave marks. Record these only after players show both joins.',
       ['Which strip IN matches START HIGH?','Compare each OUT with the next IN; also check END HIGH.','Demonstrate R, then T, then K; players point to both joins and read M-I-D.'],
       'Keep all strips and record row 1. After acceptance say: "The band is clear. Now keep the console alive to hear Pip." Give 7-9.'),
      ('Power the receiving console','7-9','Catch the incoming signal, read its code and protect it from interference. Sending must wait.',
       'Deal six unplaced cells and the empty five-device board. Require a purpose for each selected device and every slot filled on it. Count six cells in total. Keep original board and cells through mission 5.',
       'Receive: RECEIVER 2 + DECODER 2 + SHIELD 2 = 6. TRANSMITTER and TIMER are empty. The count alone is insufficient: each selected device must serve one of the three receiving jobs.',
       ['Name the three receiving jobs in the scene.','Match each job to a device purpose; inspect its cost.','Receiver, decoder and shield each need two cells. Players fill and recount the actual slots.'],
       'Mark row 2 after the actual state is checked. Say: "The link is protected. Now tune its controls." Give 10-12; keep the powered board.'),
      ('Share three setting clues','10-12','Share every source clue so the crew can agree on all three controls.',
       'Give BAND to Commander, PHASE to Engineer, BADGE to Verifier. Two players at this mission: C/M holds BAND; E/V holds PHASE plus BADGE. Each card must be shared; do not require three different speakers. Assist reading without choosing controls.',
       'BAND MID comes from the ordered wave letters. PHASE 3 comes from the marks on one strip. BADGE TRIANGLE matches the drawn three-sided antenna mark. Accept all three source explanations, including one person reading two cards in a two-player team.',
       ['Read the three cards in turn; which source does each name?','Compare the ordered letters, one strip\'s marks and the badge drawing.','Point to MID, 3 and TRIANGLE only after giving players a chance; have them explain each original source.'],
       'Keep the circled board; record only phase and badge in row 3, retaining the band in row 1. Say: "Settings locked. Pip has sent an icon message." Give 13-15.'),
      ('Decode Pip\'s request','13-15','Select the phase strip. Follow each received icon through the fixed key, not straight across the strip.',
       'Cut all three strips, use only the phase-matched one, TOP up and left edge/columns aligned under the fixed key. Players trace received icon to identical key icon to character to received blank. Use the unrelated three-shape example if needed; do not write the real instruction for them.',
       'PHASE 3 selects CODE 3. Fixed key: SUN=N, MOON=3, STAR=S, PATH=D, RING=E. Received STAR, RING, SUN, PATH, MOON gives S-E-N-D-3. Accept SEND 3, meaning three short signals. The numeral is a character, not an English letter.',
       ['Which checked setting selects the CODE strip?','Trace just one received icon to its fixed-key column.','Use CODE 3 and trace all five lookups to get SEND 3; players still fill the actual message blanks.'],
       'Mark row 4 and retain the completed message and selected strip. Say: "Your request is understood. Prepare the outgoing signal." Give 16-18; no response page is in the Player Pack.'),
      ('Send the paper reply','16-18','Use the same six cells for an outgoing signal, protection and timed pulses. Follow Pip\'s decoded request.',
       'Players explain which devices change and demonstrate the real sending state. SHIELD can stay powered while the other cells are moved. For pencil assistance, erase marks on deactivated devices before re-marking. Require exactly six total cells/marks; no receiving equipment remains powered. Independently verify all original sources and the final pulse slots.',
       'SEND: TRANSMITTER 3 + SHIELD 2 + TIMER 1 = 6; RECEIVER and DECODER empty. Settings are MID / 3 / TRIANGLE; original decoded request is SEND 3. Three pulse cards fill slots 1-3; slots 4-5 empty and two unused cards outside. After all four evidence checks and each player\'s contribution, mark row 5 and read Host page 17. Do not demand a second full written record.',
       ['Which jobs are needed now, and which devices can rest?','Inspect purposes and costs, then point to the decoded pulse count.','Demonstrate transmitter 3, shield 2, timer 1 and three of the five pulses. Players correct and show their own originals.'],
       'After acceptance say: "Your paper transmission is checked." Read the private response on Host 17; then offer Player 19. Corrections never require inventing failure or repeating already accepted earlier missions.')
    ]
    def seat(n):
        return grid(['Seat']+[f'M{i}' for i in range(1,6)],[[str(i+1)]+[jobs(n,m)[i] for m in range(1,6)] for i in range(n)],row_height=29)
    host=[
      P('Host Guide / start here','Private adult pages. English repair 1.1 / Player 19 pages + Host 18 pages in each paper size.',
        box('What your family does','Guide five paper missions: assemble a signal, allocate six reusable cells, share three source clues, decode a request and switch the console to sending. Verify the actual paper actions before releasing each next pile.'),
        box('Prepare before players arrive','Read pages 2-6. Print a complete Player Pack for each team, single-sided at Actual size / 100%, all in one paper size. Adult handles scissors. Start with Player 1-3 only. This guide contains answers and the complete response: keep it private.'),
        text('Teams have 2-6 players plus an adult host. For 7-12 use two balanced independent complete sets. Accept pointing, read-aloud help and dictated answers. Pause after any accepted mission with all original evidence kept.')),
      P('Print and cutting inventory','Choose A4 or US Letter for the whole set. Never resize individual parts or mix paper sizes.',
        grid(['Teams','Player sheets','Total with ONE printed Host Guide'],[['One','19','19 + 18 = 37'],['Two / 7-12 players','2 x 19 = 38','38 + 18 = 56']],ratios=[.27,.24,.49],row_height=42),
        box('Full-cut / 24 pieces per team','Player 2: four jobs; 6: three wave strips; 9: six cells; 12: three clue cards; 15: three CODE strips; 18: five pulse markers. Cut only the outer dashed borders. Keep every label and the wave marks.'),
        box('Low-cut / 20 pieces per team','Keep job page 2 whole and point to assigned roles; cut the other twenty moving pieces as listed. All instructions, boards, record, message key and transmission stay whole. The Host Guide can be read on screen.'),
        text('Two teams require 48 full-cut or 40 low-cut pieces. These are piece counts, separate from the sheet totals.')),
      P('Stage the five mission piles','Give each next pile only after that team\'s current original evidence is checked.',
        grid(['Stage','Give Player pages','Retain for later'],[['Start','1-3','Jobs and shared record'],['1','4-6','Arranged strips and row 1'],['2','7-9','Power board and ALL six cells'],['3','10-12','Clues and circled settings'],['4','13-15','Completed message and selected strip'],['5','16-18','Checked SEND state and transmission'],['After response','19','Optional keepsake']],ratios=[.2,.25,.55],row_height=36),
        box('Keep the ending private','The complete Pip response is on Host 17, never in the Player Pack. Read only the marked current scene aloud. Adult reference pages are for checking after an attempt; do not read their answers as story instructions.')),
      P('Seats and rotation / 2-4 players','C Commander / E Engineer / M Communicator / V Verifier. Adult checks independently. Swap assigned bundles after missions 1-4 using the tables.',text('2 players'),seat(2),text('3 players'),seat(3),text('4 players'),seat(4)),
      P('Seats and rotation / 5-6 players','Partners share one role card. Swap the placing/checking or writing/read-back action during the SAME mission, so each player acts.',text('5: pair Engineer only'),seat(5),text('6: pair Engineer and Communicator'),seat(6),
        box('Two teams for 7-12','Use 3+4, 4+4, 4+5, 5+5, 5+6 or 6+6 players. Each team keeps its own complete pieces, record and boards. One adult guide can be shared; check teams independently. Early finishers may explain or recheck, without opening later piles.')),
      P('Opening, assistance and retry','Read only the opening aloud. Keep answers private.',
        box('Opening / read aloud','"Pip has gone quiet. You are the control crew. We will rebuild a paper signal, power the console and send a reply. I will give one mission at a time. Show what you moved and how you checked it. You may ask, point and try again."'),
        box('Assisted no-cut play','This is a pointing/pencil alternative, not the same physical assembly. Point to the wave order; read clue boxes in turn. Mark exactly six device slots with erasable pencil. When switching to SEND, erase deactivated slots BEFORE re-marking; keep any still-needed slots. Recount six total. Point to one code row without cutting, then draw the decoded number of pulses. Never prefill the solution.'),
        box('Keep checking practical','Give one hint and an attempt at a time. A role holder may ask an adult to read. Use neutral diagrams to teach matching; no extra science or English vocabulary test is required. Correct only the affected action or record entry; keep accepted original evidence.'))
    ]
    for i,(title,pages,scene,action,answer,hints,handover) in enumerate(stages,1):
        host.append(P(f'Mission {i} / host actions',title,
            box('Prepare and give',f'Give Player {pages}. Keep later piles and this guide private.'),box('Scene / read aloud',scene),box('Guide the action',action),
            box('Before acceptance','Invite each player to act, point, explain or dictate. Check originals with the private reference on the NEXT page after an attempt. Only then confirm the result; change jobs after missions 1-4.')))
        host.append(P(f'Mission {i} / adult reference','Private answers. Use after an attempt; never show this page as a clue.',
            box('Acceptance',answer),box('Hints / give ONE at a time','<br/>'.join(f'{n}. {h}' for n,h in enumerate(hints,1))),box('Keep and hand over',handover)))
    host += [
      P('Private Pip response','Read only after the final SEND board, original evidence and transmission have been accepted.',special('cover-small'),
        box('Response / read aloud now','"Control crew, I hear you! Your three pulses reached me on the MID band. You rebuilt my signal, shared every clue and checked the request before sending. The shield protected our link while you replied. Contact is restored. Thank you! Pip / Robot Probe."'),
        text('Offer Player 19 afterwards. Each child may point to an action they helped with. The keepsake is optional, with no ranking by handwriting, drawing or speed.')),
      P('Support, reset and resume','The puzzle solution stays fixed. Change jobs on a replay; do not promise a new puzzle each time.',
        box('Lost pieces and pauses','Use the same paper size to reprint only the labelled source page. Full-cut has 24 pieces; low-cut has 20 plus the whole role page. Retain all selected and unselected code strips and pulses. Pause after acceptance and resume at the next unchecked action.'),
        box('Reset for another crew','Return all six cells beside the EMPTY power board, all three code strips and all five pulse markers to their piles. Shuffle wave strips. Erase circled controls and record/transmission ticks, or reprint blank boards. Keep the full response in this private guide.'),
        box('Optional reflection after the ending','Ask why receiving and sending cannot run together with only six cells. Have players show which device remained useful in both states. Accept a spoken explanation or pointing; this is a discussion after the complete ending, not an extra pass condition.'))
    ]
    assert len(player)==19 and len(host)==18
    return player,host
