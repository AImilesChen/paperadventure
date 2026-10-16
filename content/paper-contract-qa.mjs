// Hand-authored QA fixture for the new unified contract, not a generated order.
import {alignPaperPlan} from '../shared/paper-contract.mjs';
export const clockSpec={setting:'home',players:4,groups:null,age:'8-10',paper:'A4',creatorVersion:3,gamePackVersion:2,packLogicVersion:1,packContractVersion:1,planConfirmed:true,
  customIdea:'Help a traveler by restoring a clock tower that stopped at noon.',gameplay:{primary:'reasoning',secondary:['discussion']},
  plan:alignPaperPlan({id:'mystery',title:'The Clock Tower Signal Repair',summary:'Find a missing clock part and use four printed discoveries to restore the noon signal.',themeAnchors:['clock tower'],
    opening:'The clock tower has lost its noon signal, and Pip cannot begin the last leg home. The keeper needs four checked discoveries before choosing a repair action.',
    goal:'Find the missing Signal gear and restore the noon bell so Pip can finish the journey.',roles:'Four explorers.',preparation:'Print the player sheets.',
    stages:[
      {mechanic:'reasoning',storyContext:'At the clock tower, compare the component reports to identify the part that needs attention.'},
      {mechanic:'discussion',storyContext:'Two attendants left reliable statements about where the spare part is stored.'},
      {mechanic:'reasoning',storyContext:'The keeper left four repair steps. Their printed rules determine the order.'},
      {mechanic:'reasoning',storyContext:'The team needs a safe paper route to carry the wheel back to the keeper.'},
      {mechanic:'discussion',storyContext:'The keeper accepts a final action only when its code matches the four checked discoveries.'},
    ].map((stage,index)=>({...stage,number:index+1,title:'Clock discovery',task:'Read the clues.',teamwork:'Compare together.',connection:'Continue the story.'}))})};

export const clockBlueprintContext={groupInstructions:'',
  ending:'The four discoveries identify the wheel, its storage room, the repair order and a safe route. The keeper restores the noon bell. The signal gear is the missing timing wheel; with it aligned again, the tower sounds noon and Pip begins the last leg home.',
  stages:[
    {material:{title:'Clock tower component reports',items:['Bell hammer','Clock cable','Signal gear'].map(label=>({label}))},features:['Power present','Noon mark missing'],word:'NOON'},
    {material:{title:'Spare part witnesses',items:['Gear chamber','Bell room','Clock face'].map(label=>({label}))},features:['Stored inside','Safe to collect'],word:'GEAR'},
    {material:{title:'Clock tower repair steps',items:['Stop the signal','Align the wheel','Set noon hands','Test the bell'].map(label=>({label}))},features:['Signal stopped','Wheel aligned'],word:'TURN'},
    {material:{title:'Return route reports',items:['Narrow stairs','Side walkway','Upper bridge'].map(label=>({label}))},features:['Handrail present','Steps clear'],word:'PATH'},
    {material:{title:'Keeper final actions',items:['Restore noon bell','Paint clock face','Close tower door'].map(label=>({label}))},features:['Results checked','Repair ready'],word:'HOME'},
  ]};
