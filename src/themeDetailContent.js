import { independentClassroomDetails } from './independentClassroomDetails.js';

// Editorial detail data follows the checked theme blueprints in content/theme-design/.
// These are descriptions of draft materials, not a publication or play-test claim.
export const themeDetailContent = {
  ...independentClassroomDetails,
  celebration: {
    home: {
      hook: 'A cooperative delivery mystery with four explorer jobs throughout the five checkpoints.',
      reasons: ['Four rotating jobs make each checkpoint a shared task.', 'One team for 2–6 players or two balanced teams for 7–12, plus an adult host.', 'Separate clue cards, a split code key and a scripted host guide support the full adventure.'],
      materials: ['Four full-game job cards, a team trail and letter choices with separate clues', 'Cut-out route strips and an intact six-place map', 'Label board and separate conditions; coded message and split keys', 'Parcel cards, evidence check, finale letter and optional keepsake'],
      stages: [
        ['Find the letter', 'Compare character and stamp clues to identify Fenn’s message.', 'A starting place for the map'],
        ['Draw the route', 'Join the shuffled route strips on the unconnected map.', 'A flag clue for the next decision'],
        ['Compare labels', 'Combine three players’ clues to select a parcel label.', 'A code to use in the dictionary'],
        ['Read the message', 'Look up the chosen code rather than guessing from the illustration.', 'The delivery place'],
        ['Choose the parcel', 'Check the route, label and place together, then open the paper reply.', 'A complete story ending'],
      ],
    },
    classroom: {
      hook: 'A shared club mission that ends with a group-made paper badge.',
      reasons: ['Each group follows its own Adventure Club invitation.', 'Role clues give students a reason to share information.', 'The finale is a badge template rather than a birthday activity.'],
      materials: ['Invitation choices and a six-place route map', 'Shuffled route strips and equipment cards', 'Separate role clues and badge-symbol code', 'Group result card and fillable badge template'],
      stages: [
        ['Find the invitation', 'Compare the paper invitation cards as a group.', 'The starting gate'],
        ['Trace the route', 'Connect route strips on the unconnected club map.', 'The workshop destination'],
        ['Share equipment clues', 'Combine role cards to select one equipment card.', 'A four-part badge code'],
        ['Arrange the badge', 'Use the selected code to place the badge symbols.', 'A badge layout'],
        ['Complete the club task', 'Record the group result and finish the paper badge.', 'A shared club ending'],
      ],
    },
  },
  dinosaur: {
    home: {
      hook: 'Help a little dinosaur find the correct camp by following paper clues.',
      reasons: ['Footprint shapes and labels make the first clue something children can inspect.', 'A six-place, unconnected map lets players draw the route themselves.', 'Supply cards and signposts feed into one final camp choice.'],
      materials: ['Observation and footprint cards', 'Shuffled route strips and a six-place paper map', 'Shared supply clues, supply choices and signpost table', 'Camp choices and final answer space'],
      stages: [
        ['Match footprints', 'Compare printed toe, heel and notch features.', 'The route’s starting place'],
        ['Repair the map', 'Use connected route strips to draw a path between labelled places.', 'A signpost checkpoint'],
        ['Share supply clues', 'Combine the players’ separate conditions to choose a supply card.', 'A checkpoint code'],
        ['Read the signposts', 'Use the printed table and the earlier code to narrow the entrance.', 'The final entrance clue'],
        ['Find the camp', 'Check the footprint, route and entrance against the candidate camp cards.', 'A paper welcome reply'],
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
      hook: 'Restore contact with a lost robot probe using a paper star map.',
      reasons: ['Signal cards distinguish a real message from noise without electronics.', 'Players draw a path across a labelled 3×3 coordinate map.', 'The decoded message changes which probe card completes the mission.'],
      materials: ['Signal and noise choices', 'Route strips and a 3×3 coordinate star map', 'Role parameters, device cards and symbol dictionary', 'Probe choices and a final contact check'],
      stages: [
        ['Find the signal', 'Compare the shapes and labels on the signal cards.', 'A starting sector'],
        ['Draw the star route', 'Join valid route strips on the paper coordinate map.', 'The station destination'],
        ['Calibrate the device', 'Combine three players’ conditions to pick a paper device.', 'A decoding key'],
        ['Read the message', 'Use the printed dictionary to translate a short transmission.', 'A probe confirmation clue'],
        ['Send a paper reply', 'Choose the matching probe and reveal the reply card.', 'Restored story-world contact'],
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
      hook: 'Repair a rain-blurred parcel label and complete Nori’s forest delivery.',
      reasons: ['Five story openings lead into different hands-on postal tasks.', 'Share private clues, sort batches and connect route strips before repairing the address.', 'Complete a checked label and paper delivery to receive Nori’s receipt.'],
      materials: ['Illustrated postmarks, route strips and Nori marker', 'Named private clues and illustrated parcel records', 'Whole forest address map and replacement label', 'Dispatch records, delivery board, four home cards and receipt'],
      stages: [
        ['Identify the batch', 'Inspect a drawn border, count stars and match the weekday.', 'The mail batch'],
        ['Rebuild the route', 'Filter strips by batch, connect place names and move Nori.', 'The delivery district'],
        ['Find the parcel', 'Share three private clues and inspect parcel drawings.', 'The surviving address fragment'],
        ['Repair the address', 'Look up district and fragment on the map, then fill the label.', 'A complete repaired address'],
        ['Check and deliver', 'Verify four fields and slide the labelled parcel to the matching home.', 'An accepted delivery and receipt'],
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
      hook: 'Recover four paper seals for a friendly pumpkin-festival story.',
      reasons: ['A gentle mystery begins every mission with Pip’s story and a team discussion.', 'Players join route pieces, share separate parcel clues and translate a picture message.', 'Four earned seals restore a printed pumpkin picture, with no candle or real lock.'],
      materials: ['Four job cards, team record and illustrated letter choices', 'Five route strips, six-place festival board and Pip marker', 'Three helper clues, four illustrated parcels, picture message and decoder cards', 'Four fillable seals, pumpkin board, number check cards and a folding bright-face reveal'],
      stages: [
        ['Find Pip’s letter', 'Match the animal, stars and postmark on one illustrated letter.', 'A starting place and SUN seal'],
        ['Repair the festival route', 'Join shuffled strips, test both branches and move Pip to the parcel table.', 'A parcel batch and MOON seal'],
        ['Find the parcel', 'Share three helper clues and match all of them to one parcel.', 'A decoder letter and HAT seal'],
        ['Translate the picture message', 'Use the matching decoder for all four pictures, from left to right.', 'A STAR seal and the installation order'],
        ['Restore the paper pumpkin', 'Arrange all four seals, check their numbers and show two earlier clues.', 'An adult-held bright pumpkin reveal and team keepsake'],
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
      hook: 'Finish one fictional holiday delivery by sorting paper gift cards.',
      reasons: ['The puzzle uses illustrated gift and destination cards, not real presents.', 'Players combine delivery order and route clues.', 'A paper reply gives the story a warm ending without requiring purchases.'],
      materials: ['Delivery batch and label cards', 'Paper gift and destination choices', 'Separate role clues, route rules and message dictionary', 'Final delivery record and recipient choices'],
      stages: [
        ['Check the label', 'Compare batch symbols on paper delivery cards.', 'The list to repair'],
        ['Match paper gifts', 'Pair illustrated cards with the printed destinations.', 'A provisional delivery list'],
        ['Share route clues', 'Combine separate timing and route conditions.', 'The delivery order'],
        ['Read the note', 'Use the supplied dictionary to decode the short message.', 'The final stop'],
        ['Finish delivery', 'Check the list, order and stop together.', 'A paper thank-you reply'],
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

