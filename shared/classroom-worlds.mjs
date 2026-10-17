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
      goal: 'Find the right book, order its story leaves, combine three witness notes, make Kit a paper route copy and write a fitting final page.',
      image: '/assets/library-classroom-v0.1.webp',
      beats: ['Match the return slip', 'Order the loose leaves', 'Share three witness notes', 'Copy the route and write the final page', 'Read and correct a visitor’s summary'] } },
  },
  {
    id: 'weather', title: 'Weather Observatory', kicker: 'Run a paper weather station',
    image: '/assets/weather-classroom-v0.1.webp', tag: 'Instrument crew',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C10', title: "The Observatory's Missing Morning Bulletin",
      goal: 'Restore three morning records, operate printed wind, cloud and rain tools, then publish a peer-checked observation bulletin.',
      image: '/assets/weather-classroom-v0.1.webp',
      beats: ['Sort the morning records', 'Calibrate the paper wind dial', 'Count covered sky panes', 'Read and repair the rain log', 'Write and peer-check the bulletin'] } },
  },
  {
    id: 'workshop', title: "Inventors' Paper Workshop", kicker: 'Build and test a paper message relay',
    image: '/assets/workshop-classroom-v0.1.webp', tag: 'Paper inventors',
    discoveryGroup: 'everyday',
    story: { classroom: { code: 'C11', title: 'The Great Blueprint Relay',
      goal: 'Rebuild a blueprint, fold a paper channel, make a message card from shared clues and test which designs travel to the display.',
      image: '/assets/workshop-classroom-v0.1.webp',
      beats: ['Rebuild the blueprint', 'Fold the paper channel', 'Share three design notes', 'Test and repair the message cards', 'Demonstrate and peer-check the relay'] } },
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

