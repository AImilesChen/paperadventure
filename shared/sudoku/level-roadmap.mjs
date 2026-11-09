export const techniqueStages = [
 {rank:1,from:1,to:10,title:'First deductions',summary:'One digit fits a cell',technique:'Singles',tone:'green',description:'Find the one digit that fits a cell by checking its row, column and box.'},
 {rank:2,from:11,to:35,title:'Hidden positions',summary:'One place fits a digit',technique:'Hidden singles',tone:'blue',description:'Look for the only place a digit can go, even when a cell has several candidates.'},
 {rank:3,from:36,to:70,title:'Locked candidates',summary:'Connect a box and line',technique:'Box and line connections',tone:'amber',description:'Use candidates confined to one row or column in a box to rule out other positions.'},
 {rank:4,from:71,to:100,title:'Candidate pairs',summary:'Reserve two candidates',technique:'Naked pairs',tone:'purple',description:'Spot two cells sharing the same two candidates, then eliminate those digits elsewhere in their group.'},
];
export const chapterRoadmap = [
 ['First deductions','Build a habit of checking the row, column and box before placing a digit.'],
 ['Find the hidden place','Switch from asking what fits a cell to asking where a digit can go.'],
 ['Read the whole group','Track missing digits across a complete row, column or box.'],
 ['Connect your deductions','Move from hidden positions into the first box-and-line eliminations.'],
 ['Follow the box and line','Notice when all positions for a digit in a box share one row or column.'],
 ['Carry the logic further','Use a candidate elimination to uncover the next placement.'],
 ['Bring the clues together','Combine singles and locked candidates across several groups.'],
 ['Discover candidate pairs','Recognise two cells whose two candidates reserve both digits.'],
 ['Make each note count','Use pairs alongside earlier techniques to narrow the remaining choices.'],
 ['Complete the trail','Bring all four technique stages together for the final chapter.'],
].map(([title,description],i)=>{
 const from=i*10+1,to=from+9,stages=techniqueStages.filter(s=>s.from<=to&&s.to>=from);
 return {number:i+1,from,to,title,description,stages,techniques:stages.map(s=>s.rank===1?s.technique:s.title).join(' → ')};
});
