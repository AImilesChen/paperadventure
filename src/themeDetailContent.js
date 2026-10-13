import { independentClassroomDetails } from './independentClassroomDetails.js';

// Editorial detail data follows the checked theme blueprints in content/theme-design/.
// These are descriptions of draft materials, not a publication or play-test claim.
export const themeDetailContent = {
  ...independentClassroomDetails,
  celebration: {
    home: {
      hook: 'One adult hosts; your family shares four jobs and keeps the paper evidence for a common finish.',
      reasons: ['Four rotating jobs make each checkpoint a shared task.', 'One team for 2–6 players or two balanced teams for 7–12, plus an adult host.', 'Separate clue cards, a split code key and a scripted host guide support the full adventure.'],
      materials: ['Four full-game job cards, a team trail and letter choices with separate clues', 'Cut-out route strips and an intact six-place map', 'Label board and separate conditions; coded message and split keys', 'Parcel cards, evidence check, final report and optional teamwork keepsake'],
      stages: [
        ['Find the letter', 'Compare character and stamp clues to identify Fenn’s message.', 'A starting place for the map'],
        ['Draw the route', 'Join the shuffled route strips on the unconnected map.', 'A flag clue for the next decision'],
        ['Compare labels', 'Combine three clue conditions to select a delivery label.', 'A code-mark row for the two keys'],
        ['Read the message', 'Use the chosen code-mark row on two separate keys; share and record the letters in order.', 'The delivery place'],
        ['Choose the parcel', 'Check the route, label and place together, then open the paper reply.', 'A complete story ending'],
      ],
    },
    classroom: {
      hook: 'Rebuild the Club welcome, combine four separate clues and make a desk badge another crew can check.',
      reasons: ['Children rebuild an invitation and use its clues to place paper supplies on a welcome-table mat.', 'Four separate role cards make every badge feature depend on shared information.', 'The crew makes a foldable paper display badge, then the next crew checks it against the clues.'],
      materials: ['Four invitation fragments with matching edge marks and a welcome-table mat', 'Three paper supply tiles, four separate badge clues and a blank blueprint', 'Nine symbol squares, a foldable badge template and a peer-check card', 'Rotating job cards, team record and a step-by-step Teacher Guide'],
      stages: [
        ['Rebuild the invitation', 'Match four cut-edge marks and read the joined welcome message.', 'Two clues for setting the table'],
        ['Set the welcome table', 'Move three paper supplies into positions justified by the invitation.', 'The blank badge in the middle'],
        ['Share the badge clues', 'Exchange four separate role cards and draw a team blueprint.', 'A complete badge plan'],
        ['Make the badge', 'Try labelled symbol squares, check each against a clue, then draw the finished badge.', 'A paper display badge'],
        ['Check and welcome', 'Use a printed peer-check card, make friendly repairs and welcome another crew.', 'A shared club ending'],
      ],
    },
  },
  dinosaur: {
    home: {
      hook: 'One adult hosts the story; players share four rotating jobs and keep the journey at the table.',
      reasons: ['Children fit six shuffled landscape tiles by matching printed paths, then move Milo to a separate camp finish area.', 'A two-slot backpack makes the printed supplies matter when the weather changes.', 'A storm changes the plan: players block a crossing, test a safe detour and complete an arrival proof.'],
      materials: ['Six cut landscape tiles with matching paths and a whole-page map board with CAMP finish area', 'Six illustrated trail marks and four rotating explorer jobs', 'Two-slot backpack mat and four cut supply tokens', 'Storm notice, BLOCK and MILO markers, journey record, arrival proof and held-back welcome'],
      stages: [
        ['Read the trail marks', 'Circle the three tracks that fit Milo’s print and read their start letters.', 'An evidence-backed starting place'],
        ['Rebuild the expedition map', 'Fit shuffled landscape tiles into the board by matching printed path ends.', 'Two possible paths toward camp'],
        ['Pack for the possible detour', 'Select two of four printed supplies for a route that still works if the weather changes.', 'A packed expedition kit'],
        ['Follow the changed route', 'Block a crossing after the storm, move Milo through another route and use the supplies.', 'A safe paper detour'],
        ['Bring Milo home', 'Move Milo into CAMP and complete an arrival proof from the route and used supplies.', 'A read-aloud welcome'],
      ],
    },
    classroom: {
      hook: 'Turn mixed-up dinosaur station records into a conclusion backed by clues.',
      reasons: ['Students investigate a different mission from the Home rescue story.', 'The first archive choice determines which footprint note can be used next.', 'Time strips and a written conclusion create an evidence-based group finale.'],
      materials: ['Illustrated batch archive cards and observation notes', 'Footprint cards and separate location-role clues', 'Candidate area cards and ordering time strips', 'Research conclusion sheet and evidence spaces'],
      stages: [
        ['Sort the archive', 'Compare seal, dot and title details on four batch cards.', 'The observation note to consult'],
        ['Match a footprint', 'Use that note to compare the printed footprint features.', 'A research area'],
        ['Combine location clues', 'Share separate role-card conditions to select an area card.', 'The observation location'],
        ['Order the records', 'Put the independent time strips in the stated order.', 'A route record'],
        ['Submit a conclusion', 'Explain the chosen route with clues from the records.', 'A checked research-station ending'],
      ],
    },
  },
  space: {
    home: {
      hook: 'Restore contact with Pip by rebuilding a wave and operating a printable paper control centre.',
      reasons: ['Three cut wave strips form one continuous received band.', 'Six reusable paper power cells move between receiving and sending configurations.', 'Separate crew clues, a picture-symbol key and a paper transmission make each discovery part of the finale.'],
      materials: ['Three wave strips and an intact receiver board', 'Five-device power board and six larger reusable cells', 'Crew clues, receive-settings board and three decoder strips', 'Transmission form, five pulse markers, record and held-back response'],
      stages: [
        ['Rebuild the wave', 'Connect three printed signal strips from HIGH back to HIGH.', 'The MID receiver band'],
        ['Power the receiver', 'Choose the three devices needed to catch, read and protect a signal; place six paper cells.', 'A working receiving console'],
        ['Tune the receive channel', 'Share three private clues to set band, phase and pictured badge.', 'The code for Pip’s message'],
        ['Decode the instruction', 'Match received picture icons to a differently ordered fixed key and one phase strip.', 'A decoded sending instruction'],
        ['Send a paper reply', 'Move the same six cells to sending equipment, then use the decoded pulse count.', 'Pip’s held-back paper response'],
      ],
    },
    classroom: {
      hook: 'Groups repair a fictional communication station using shared paper evidence.',
      reasons: ['Each group can complete its own station record.', 'The star-map route and equipment decision depend on separate clues.', 'No real circuits, internet or student accounts are needed.'],
      materials: ['Signal and noise cards', 'Coordinate star map and route strips', 'Group role clues, equipment choices and dictionary', 'Communication-restart record'],
      stages: [
        ['Separate signal from noise', 'Compare printed signal rules with the candidate cards.', 'A station code'],
        ['Trace the route', 'Draw valid connections on the 3×3 paper star map.', 'A port location'],
        ['Choose equipment', 'Combine the group’s separate conditions.', 'A translation key'],
        ['Translate the signal', 'Look up the symbols using the supplied dictionary.', 'A return message'],
        ['Record the restart', 'Check the code and message, then complete the group record.', 'A paper station finale'],
      ],
    },
  },
  forest: {
    home: {
      hook: 'Run Nori’s paper post office: sort rain-soaked mail, repair a parcel and deliver it with a signed receipt.',
      reasons: ['Five connected postal jobs let children handle the same paper mail from intake to delivery.', 'Use mail evidence and a picture seal to rebuild P17’s label, then load a two-slot morning bag.', 'Ask three neighbours about their privately held answers before a checked, signed handover.'],
      materials: ['Six illustrated cut mail pieces, an intake sorting desk and four rotating job cards', 'Four evidence clues, a faint carbon copy and a fillable replacement label', 'Two-slot mailbag board, handover slip, interview notes and three foldable private neighbour cards', 'Delivery and signature board, paper stamp and adult-held ending'],
      stages: [
        ['Sort the incoming mail', 'Apply seal and address rules to every piece at the intake desk.', 'P17 is held for label repair'],
        ['Repair P17’s label', 'Use letter A, P17’s picture seal and three parcel clues; check deductions against a faint carbon copy.', 'A readable label with recipient still unknown'],
        ['Load the morning mailbag', 'Reuse the sorted pieces and load only Blue Tree morning mail, priority first.', 'A two-item handover slip'],
        ['Interview the neighbours', 'Keep each actor’s answers private while the courier asks about mail type, ID and seal.', 'A confirmed household'],
        ['Deliver and sign', 'Check parcel, label and bag slip, then complete a fictional signature and paper stamp.', 'A witnessed delivery and Nori’s ending'],
      ],
    },
    classroom: {
      hook: 'Investigate a sorting mistake and explain where a paper parcel belongs.',
      reasons: ['Group members hold different parcel attributes.', 'The route and address evidence must agree before the finale.', 'The conclusion sheet asks students to name which cards support their answer.'],
      materials: ['Mail-batch cards and a five-place route map', 'Delivery records and distributed role clues', 'Illustrated parcel choices and fictional address map', 'Two-line evidence record and conclusion card'],
      stages: [
        ['Set the investigation scope', 'Compare batch symbols to choose the relevant mail record.', 'The case to examine'],
        ['Rebuild the route', 'Arrange delivery strips and draw the valid path.', 'A possible address area'],
        ['Combine parcel clues', 'Share stripe and parcel-shape conditions across roles.', 'The matching parcel'],
        ['Check the address', 'Use printed map fragments to verify its destination.', 'A complete delivery claim'],
        ['Write the evidence', 'Record two clues from different pages before choosing the conclusion.', 'A checked postal case'],
      ],
    },
  },
  halloween: {
    home: {
      hook: 'A cooperative paper theatre: children discover the cast, make shadows, solve their stage places and reveal Pip’s glowing paper lantern.',
      reasons: ['Each mission starts with a short scene and produces something used later in the show.', 'The main actions are observing, folding, speaking clues, staging and performing rather than collecting a number code.', 'The four-window lantern reveal uses printed paper only; no real flame, lamp or special toy is needed.'],
      materials: ['Four rotating job cards, team record, eight-poster scene and cut-out viewer', 'Four fold-and-cut paper shadows, four private stage memories and rehearsal mat', 'A hinged four-window theatre and four clue-only cue cards', 'Adult-held lantern finale and a step-by-step Host Guide with read-aloud scripts'],
      stages: [
        ['Spot the torn posters', 'Use the paper viewer to find which four of eight posters share three zigzag tears.', 'Four actors to make'],
        ['Make paper shadows', 'Fold and cut the bat, owl, pumpkin and star templates with adult help.', 'Four reusable stage figures'],
        ['Arrange the stage together', 'Share four private spoken clues and place the figures on a two-by-two mat.', 'One complete stage arrangement'],
        ['Rehearse the windows', 'Match four spoken character clues to the stage places and lift the hinged windows.', 'A coordinated paper-theatre rehearsal'],
        ['Perform the festival ending', 'Follow a new story order and open all four windows over Pip’s held-back lantern scene.', 'One glowing pumpkin picture'],
      ],
    },
    classroom: {
      hook: 'Prepare a paper autumn celebration together, with optional adult-chosen Halloween wording.',
      reasons: ['The default Classroom story uses neutral autumn language.', 'Each group combines four preparation results for its opening plan.', 'An adult may choose the Halloween wording; the puzzle answers stay the same.'],
      materials: ['Invitation and group-task cards', 'Route strips and a five-place festival map', 'Role clues, decoration choices and flow record', 'Opening-plan sheet and group result card'],
      stages: [
        ['Find the invitation', 'Compare the paper invitation symbols.', 'The group’s task'],
        ['Draw the festival route', 'Connect the route strips on the unconnected map.', 'A setup position'],
        ['Share decoration clues', 'Combine role cards to choose the matching decoration.', 'A preparation result'],
        ['Read the plan', 'Check the flow record and order of the paper tasks.', 'The opening sequence'],
        ['Complete the opening', 'Check all four results against the group plan.', 'A paper celebration finale'],
      ],
    },
  },
  christmas: {
    home: {
      hook: 'Become the last gift crew in a winter delivery office: fold, draw, check and display three pretend paper gifts.',
      reasons: ['Five linked messenger scenes each put the story beside numbered actions.', 'Children fold a star press and three standing paper gifts, then combine three separate wrapping clues to draw each pattern.', 'A cut-out quality frame helps them check and repair their work before the adult reveals the story friends’ paper reply.'],
      materials: ['One foldable star press and three standing paper gift blanks', 'Three separate wrapping clues and a whole-page icon drawing guide', 'One cut-out quality frame and a whole winter village display board', 'Four rotating job cards and an adult-held reply'],
      stages: [
        ['Open the star press', 'Cut and fold one paper station piece until it stands on the table.', 'A working star press'],
        ['Make three gifts', 'Cut and crease three different paper gift blanks, ready for their drawn patterns.', 'Three gift stands'],
        ['Share wrapping clues', 'Combine three spoken cards to draw an icon, ribbon and seal on each gift.', 'Three decorated paper gifts'],
        ['Check and repair', 'Slide the frame’s small window over each icon, ribbon and seal; erase and redraw an incorrect mark.', 'Three checked gifts'],
        ['Build the village display', 'Use the shared clue to match each gift to a friend, then stand or lay it in the village for the held-back reply.', 'A paper keepsake scene'],
      ],
    },
    classroom: {
      hook: 'Run a paper winter sorting station, with optional adult-chosen Christmas wording.',
      reasons: ['The default Classroom edition uses neutral winter language.', 'Groups compare printed order, destination and loading rules.', 'The finale is a written paper departure check; no gifts are exchanged.'],
      materials: ['Order batch and label cards', 'Illustrated paper item and destination cards', 'Role conditions, sorting-order choices and route table', 'Group manifest and departure card'],
      stages: [
        ['Check the batch', 'Identify the correct printed order set.', 'The group’s sorting task'],
        ['Match destinations', 'Pair the paper items and destination cards.', 'A delivery map'],
        ['Combine sorting rules', 'Share role conditions to choose a loading order.', 'The group’s sequence'],
        ['Check the route', 'Use the printed route table to verify the departure.', 'A final message'],
        ['Finish the manifest', 'Record the evidence and confirm the pretend dispatch.', 'A winter-station ending'],
      ],
    },
  },
};
