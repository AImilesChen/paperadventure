// Original independent beginner positions. Invalid trial entries are deliberately separate from the valid givens.
export const rulesFixtures={
  "guided": {
    "givens": "008519364509004008360728019200093640103647200000200090000930072936070051000800036",
    "target": 0,
    "digit": 7,
    "partner": 1,
    "blockedDigit": 2,
    "blocking": 27
  },
  "examples": {
    "row": {
      "givens": "000509304000364700364728500280103040193007280647280103050936070006070000402001006",
      "target": 0,
      "proposed": 5,
      "blocker": 3,
      "kind": "row"
    },
    "column": {
      "givens": "030080075004200006270936180361042059002709061009361002000007093400500008003618427",
      "target": 40,
      "proposed": 8,
      "blocker": 4,
      "kind": "column"
    },
    "box": {
      "givens": "002600073009100840173800000400591038001038000000426091005917304917304260380200017",
      "target": 22,
      "proposed": 6,
      "blocker": 3,
      "kind": "box"
    }
  },
  "practice": {
    "conflict": {
      "givens": "001920547026547301500081006800000003065470809003019260092054030004030102000192604",
      "target": 30,
      "proposed": 7,
      "blocker": 40,
      "kind": "box"
    },
    "judgment": {
      "givens": "205041036800000090736005800900007362010060058362950400004170629003629504020004170",
      "target": 50,
      "proposed": 1,
      "blocker": 5,
      "kind": "column"
    },
    "placement": {
      "givens": "002000136090106400136002795020951000050364820064007000209500640503648209040270010",
      "target": 22,
      "digit": 8,
      "partner": 21,
      "blockedDigit": 4,
      "blocking": 67
    }
  }
};
