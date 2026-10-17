import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sampleSpec,sampleStory} from '../content/custom-paper-format-sample.mjs';
import {compileControlledPuzzle,controlledStageText} from '../backend/controlled-puzzles.mjs';
import {validateGeneratedStory} from '../backend/domain.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';

const spec={...sampleSpec,packLogicVersion:1};
const stages=sampleStory.stages.map((original,index)=>{
  const puzzle=compileControlledPuzzle({number:index+1,title:original.title,material:original.material});
  return {...original,...controlledStageText(puzzle),options:puzzle.options,answerIndex:puzzle.answerIndex,material:puzzle.material,
    prerequisite:index?sampleStory.stages[index-1].unlock:'START'};
});
const story=validateGeneratedStory({...sampleStory,stages},spec);
const directory=resolve(process.argv[2] || 'tmp/pdfs');
await mkdir(directory,{recursive:true});
for(const role of ['player','guide']) {
  const path=resolve(directory,`controlled-paper-game-${role}-A4.pdf`);
  await writeFile(path,buildGamePdf(story,spec,role));
  process.stdout.write(`${path}\n`);
}
