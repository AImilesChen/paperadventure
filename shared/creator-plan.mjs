export const CREATOR_VERSION = 2;
export const mechanics = [
  {id:'reasoning', title:'Clue detective', description:'Compare printed facts and find the one answer that fits.', action:'Compare the clues', sample:{clue:'The parcel has a round seal and two stripes. Which label fits?',options:['Round seal, two stripes','Square seal, two stripes','Round seal, three stripes'],answer:0,explanation:'Both printed features must match.'}},
  {id:'sequence', title:'Put things in order', description:'Arrange events or instructions using a printed rule.', action:'Find the right order', sample:{clue:'The note says: Moon goes first. Star goes immediately before Sun. Which order fits?',options:['Moon, Sun, Star','Moon, Star, Sun','Star, Moon, Sun'],answer:1,explanation:'Moon is first, and Star is immediately before Sun.'}},
  {id:'code', title:'Crack a simple code', description:'Use the key on the page to decode a short message.', action:'Decode the message', sample:{clue:'Use this key: 1 = M, 2 = A, 3 = P. What does 1-2-3 say?',options:['PAM','AMP','MAP'],answer:2,explanation:'Read each number using the printed key: M, A, P.'}},
  {id:'discussion', title:'Solve together', description:'Take reading and checking roles, then agree on an answer.', action:'Share and check', sample:{clue:'Reader: the badge has one stripe. Checker: it has a star. Share both facts. Which badge fits?',options:['Star with two stripes','Moon with one stripe','Star with one stripe'],answer:2,explanation:'The team combines both facts: one stripe and a star.'}},
];
export const mechanicById = id => mechanics.find(item => item.id === id);
export const venues = {
  home:['At a table at home','In the living room','In an activity room'],
  classroom:['At classroom desks','In a small-group work area','In a library','In an activity room'],
};
const profiles = [
  {match:/西游|悟空|中国神话|journey to the west|monkey king/i, name:'Journey to the West', characters:['The journey companions','Monkey King and a team of helpers','An original team of young immortals'], goal:['Recover a missing travel document','Reunite the journey companions','Restore a mixed-up travel route'], location:['A stop on the journey','Flower-Fruit Mountain','A cloud-top palace']},
  {match:/海洋|海底|海盗|ocean|underwater|sea\b|pirate/i, name:'your sea adventure', characters:['A team of sea explorers','A sea librarian and helpful creatures','A friendly pirate crew'],goal:['Recover missing story pages','Restore a sea-route message','Help a lost sea creature'],location:['An underwater library','A coral harbour','A paper island station']},
  {match:/恐龙|dinosaur|prehistor/i,name:'your dinosaur adventure',characters:['Dinosaur explorers','A fossil keeper and a field team','Friendly dinosaurs and their helpers'],goal:['Find a missing field journal','Match a trail to its explorer','Repair the expedition route'],location:['A dinosaur camp','A fossil valley','An expedition station']},
  {match:/太空|宇宙|space|planet|astronaut/i,name:'your space adventure',characters:['A crew of space explorers','A station keeper and helpful robots','A team of planet researchers'],goal:['Recover a missing star map','Restore a station message','Repair a delivery route'],location:['A space station','A moon library','A planet outpost']},
  {match:/森林|动物|forest|woodland|animal/i,name:'your forest adventure',characters:['A woodland delivery team','Animal helpers and a forest keeper','A team of nature explorers'],goal:['Deliver a missing forest parcel','Restore a trail guide','Find a borrowed storybook'],location:['A forest post office','A woodland library','A treehouse station']},
  {match:/圣诞|冬日|christmas|winter/i,name:'your winter adventure',characters:['A winter delivery team','Gift helpers and a village keeper','A team of winter explorers'],goal:['Restore a gift delivery list','Find a missing winter message','Help a village prepare its display'],location:['A winter village','A gift workshop','A snowy post office']},
  {match:/万圣|秋日|halloween|autumn/i,name:'your autumn adventure',characters:['A friendly theatre crew','Autumn festival helpers','A team of gentle mystery solvers'],goal:['Recover a missing performance plan','Restore a festival message','Help the paper theatre open'],location:['A paper theatre','An autumn village','A festival workshop']},
  {match:/庆祝|生日|celebrat|birthday|party/i,name:'your celebration adventure',characters:['Party helpers','A celebration delivery team','An adventure club'],goal:['Find a missing celebration parcel','Restore a party invitation','Complete a shared celebration display'],location:['A party workshop','A celebration village','An adventure clubhouse']},
];
export function storySuggestions(idea) {
  const profile = profiles.find(item => item.match.test(idea || ''));
  return profile || {name:'your story world',characters:['A team of explorers in your world','A helpful keeper and their companions','An original team of puzzle solvers'],goal:['Recover something important to this world','Help a character finish a journey','Restore a mixed-up message'],location:['A meeting place in your story world','A library in your story world','A workshop in your story world']};
}
export const moods = ['Light and playful','Gentle mystery','Curious exploration'];
export const avoidChoices = ['Scary scenes','Timed pressure','Long reading passages'];

// Fixed-shape context shared by draft caching and server verification. Preview
// titles, confirmation flags and client-supplied plans never affect this key.
export function planningContext(spec) {
  return {
    version:CREATOR_VERSION, themeId:spec.themeId || null, customIdea:String(spec.customIdea || '').trim(),
    setting:spec.setting, players:Number(spec.players), groups:spec.setting === 'classroom' ? Number(spec.groups) : null,
    age:String(spec.age || '').trim().replace(/–/g,'-'),paper:spec.paper || 'A4',
    place:String(spec.place || '').trim(),reading:String(spec.reading || '').trim(),materials:String(spec.materials || '').trim(),
    preferences:Object.fromEntries(['characters','goal','include','avoid'].map(key => [key,String(spec.preferences?.[key] || '').trim()])),
    storyLocation:String(spec.storyLocation || '').trim(),mood:String(spec.mood || '').trim(),language:'en',
    gameplay:{primary:spec.gameplay?.primary || 'reasoning',secondary:[...(spec.gameplay?.secondary || [])].sort(),request:String(spec.gameplay?.request || '').trim()},
  };
}
export const contextKey = spec => JSON.stringify(planningContext(spec));

function text(value, label, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[^\x20-\x7e\n\r]/.test(value)) throw new Error(`${label} must be concise English printable text.`);
  return value.trim();
}
export function validatePlan(value, spec) {
  if (!value || typeof value !== 'object') throw new Error('An adventure plan is required.');
  const selected = [spec.gameplay?.primary || 'reasoning',...(spec.gameplay?.secondary || [])];
  if (!Array.isArray(value.stages) || value.stages.length !== 5) throw new Error('The preview must have five checkpoints.');
  const plan = {
    id:value.id,title:text(value.title,'Title',80),summary:text(value.summary,'Summary',400),
    opening:text(value.opening,'Opening',700),roles:text(value.roles,'Roles',180),goal:text(value.goal,'Goal',180),
    preparation:text(value.preparation,'Preparation',350),
    stages:value.stages.map((item,index) => {
      if (item.number !== index+1 || !selected.includes(item.mechanic)) throw new Error('A checkpoint has an unsupported number or play style.');
      return {number:index+1,title:text(item.title,'Checkpoint title',80),mechanic:item.mechanic,
        task:text(item.task,'Player task',240),teamwork:text(item.teamwork,'Team action',180),connection:text(item.connection,'Connection',180)};
    }),
  };
  if (!['mystery','mission'].includes(plan.id)) throw new Error('Choose one of the two adventure plans.');
  if (plan.stages.filter(item=>item.mechanic===selected[0]).length < 3 || selected.some(id=>!plan.stages.some(item=>item.mechanic===id))) throw new Error('The plan must use the main style at least three times and every selected supporting style.');
  return plan;
}
