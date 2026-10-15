import {clockBlueprintContext} from './paper-contract-qa.mjs';

// Invented fixture shared by narrative, PDF and paid-queue tests. No customer data.
export function linkedClockContext(){
  const raw=structuredClone(clockBlueprintContext);
  raw.celebration='Pip smiles when the noon bell sounds and the journey can continue.';
  raw.stages[0].material.items=['Bell hammer report','Clock cable report','Signal gear report'].map(label=>({label}));
  raw.stages[0].features=['Mentions power','Names missing noon mark'];
  raw.stages[1].material.items=['Gear chamber note','Bell room note','Clock face note'].map(label=>({label}));
  raw.stages[1].features=['Mentions spare gear','Names safe storage'];
  raw.stages[4].material.items=['Fit signal gear','Reset tower hands','Replace bell rope'].map(label=>({label}));
  raw.spine={
    problem:'The tower has no noon signal, and Pip cannot continue the journey until the keeper repairs it.',
    resolution:'Fit signal gear',
    links:[
      'Signal gear report names the missing noon mark while power remains, so the keeper knows which part needs attention.',
      'Gear chamber note names safe storage for the spare gear, so the keeper knows where to collect the needed part.',
      'Stop the signal > Align the wheel > Set noon hands > Test the bell gives the keeper a safe order for the repair.',
      'Upper bridge has the open paper route, so the team can bring the spare gear to the keeper for the repair.',
    ],
  };
  return raw;
}

