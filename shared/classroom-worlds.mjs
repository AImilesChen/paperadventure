// Separate classroom-only story worlds. Their ready-made files are versioned
// independently from the former C02-C06 classroom test drafts.
export const independentClassroomWorlds = Object.freeze([
  {
    id: 'ocean', title: 'Ocean Research Ship', kicker: 'Rebuild a paper coral chart',
    image: '/assets/ocean-classroom-v0.1.webp', tag: 'Chart-making crew',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C07', title: 'The Coral Chart Expedition',
      goal: 'Assemble a paper sea chart, share three crew sightings, correct its log and write the captain\'s report.',
      image: '/assets/ocean-classroom-v0.1.webp',
      beats: ['Repair four chart quarters', 'Find the survey square', 'Plot three private sightings', 'Correct the copied log', 'Write the captain\'s report'] } },
  },
  {
    id: 'museum', title: 'Museum of Curious Objects', kicker: 'Restore a mixed-up exhibition',
    image: '/assets/museum-classroom-v0.1.webp', tag: 'Curator mystery',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C08', title: 'The Mixed-Up Exhibition',
      goal: 'Verify a fictional object, rebuild its display case, assemble its paper parts and write a label visitors can trust.',
      image: '/assets/museum-classroom-v0.1.webp',
      beats: ['Verify the accession tag', 'Arrange the case signs', 'Assemble the Wind Listener', 'Write a visitor label', 'Mount and audit the exhibit'] } },
  },
  {
    id: 'library', title: 'Storybook Library', kicker: 'Recover the final chapter',
    image: '/assets/library-classroom-v0.1.webp', tag: 'Reading adventure',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C09', title: 'The Missing Final Chapter',
      goal: 'Combine three readers\' clues, recover a lost page and choose a fitting story ending.',
      image: '/assets/library-classroom-v0.1.webp',
      beats: ['Follow the index symbol', 'Find the page bundle', 'Order the middle events', 'Read the final-page index', 'Choose a fitting ending'] } },
  },
  {
    id: 'weather', title: 'Weather Observatory', kicker: 'Rebuild a paper forecast bulletin',
    image: '/assets/weather-classroom-v0.1.webp', tag: 'Symbol detectives',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C10', title: 'The Lost Forecast Bulletin',
      goal: 'Three symbol teams compare fictional observations and post a checked paper notice.',
      image: '/assets/weather-classroom-v0.1.webp',
      beats: ['Choose the observation day', 'Find the map grid', 'Combine symbol teams', 'Order the bulletin strips', 'Post the checked bulletin'] } },
  },
  {
    id: 'workshop', title: "Inventors' Paper Workshop", kicker: 'Reassemble a pretend blueprint',
    image: '/assets/workshop-classroom-v0.1.webp', tag: 'Paper inventors',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C11', title: 'The Great Blueprint Relay',
      goal: 'Share design constraints, choose paper parts and explain a safe imaginary blueprint.',
      image: '/assets/workshop-classroom-v0.1.webp',
      beats: ['Find the design code', 'Pick the blueprint sheet', 'Share constraint cards', 'Order the display cards', 'Complete the blueprint'] } },
  },
].map(world => Object.freeze({
  ...world,
  availableSettings: Object.freeze(['classroom']),
  story: Object.freeze({ classroom: Object.freeze(world.story.classroom) }),
  home: Object.freeze({ readyStatus: 'not_offered', freeSample: false }),
  classroom: Object.freeze({ readyStatus: 'not_published', freeSample: false }),
})));

export const independentClassroomIds = Object.freeze(independentClassroomWorlds.map(world => world.id));
export const retiredClassroomIds = Object.freeze(['dinosaur', 'space', 'forest', 'halloween', 'christmas']);
