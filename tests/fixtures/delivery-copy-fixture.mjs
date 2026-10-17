// Hand-authored invented clock story used only for regression tests.
export function clockDeliveryCopy(story){
  const facts=[
    [{yes:'The clock has power.',no:'The clock has no power.'},{yes:'The signal gear has a broken tooth.',no:'The signal gear has all its teeth.'}],
    [{yes:'A spare signal gear is in the gear chamber.',no:'A spare signal gear is in the bell room.'},{yes:'The keeper permits collection of the spare gear.',no:'The keeper forbids collection of the spare gear.'}],
  ];
  const actions=[{label:'Collect and fit the spare gear',description:'Collect the spare signal gear from the gear chamber, return by the upper bridge and follow the repair plan.'},
    {label:'Reset the clock hands',description:'Leave the spare gear in storage and reset the clock hands.'},
    {label:'Replace the bell rope',description:'Leave the spare gear in storage and replace the bell rope.'}];
  const stages=story.stages.map((stage,index)=>({title:stage.title,scene:index===2?'The keeper asks you to arrange the repair instructions before any repairs begin.':index===4?'The keeper asks the team to combine all four findings and choose a repair.':stage.storyContext,
    labels:index===4?actions.map(action=>action.label):stage.material.items.slice(0,index===2?4:3).map(item=>item.label),facts:index<2?facts[index]:[]}));
  const route=story.stages[3].material.items.find(item=>item.label===story.stages[3].options[story.stages[3].answerIndex]).detail;
  return {version:1,actions,stages,celebration:'The keeper fits the spare gear and the noon bell sounds across town. Pip smiles and begins the journey home.',links:[
    {fact:facts[0][1].yes,reason:'The damaged signal gear needs replacing so the clock can sound noon.'},
    {fact:facts[1][0].yes,reason:'The spare gear can be collected from the gear chamber for the repair.'},
    {fact:`${stages[2].labels[0]}.`,reason:'The repair plan starts by stopping the signal before the gear is fitted.'},
    {fact:route,reason:'Both links are open, so this route can carry the spare gear back to the keeper.'},
  ]};
}
