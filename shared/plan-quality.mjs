// Narrative fidelity is reviewed by meaning; exact spelling is not puzzle proof.
export const PLAN_REVIEW_POLICY = 'semantic-theme-1';
export const themeMeaningRules = 'Preserve the purchased idea, named characters, fictional world and important motifs recognizably in English. Accurate translations, character aliases and relevant places are valid. Judge the premise and five scenes together by meaning, not the number of literal keyword repetitions. A theme label pasted onto an otherwise unrelated generic story is insufficient. A simple theme needs no invented mythology or characters.';
export const planIssueCodes = ['THEME_WEAK','GOAL_UNRESOLVED','SCENE_SEQUENCE','SETUP_MISMATCH','UNSUPPORTED_ACTIVITY'];
export const planNarrativeFields = ['title','summary','premise','goal','themeAnchors','scene1','scene2','scene3','scene4','scene5'];
export const planIssueInstructions = {
  THEME_WEAK: 'Restore recognizable theme meaning using the purchased world, characters, aliases or places; do not repeat keywords to satisfy a count.',
  GOAL_UNRESOLVED: 'Keep the mission unresolved until a concrete final action can achieve the purchased goal.',
  SCENE_SEQUENCE: 'Make the scenes a coherent journey toward the goal; scene phrases need not contain finished clues or proof of the final action.',
  SETUP_MISMATCH: 'Restore the purchased characters, fictional location, mood, reading age and avoidance preferences.',
  UNSUPPORTED_ACTIVITY: 'Remove promised activities or props beyond the supplied printed actions, sheets and pencils.',
};
export const planFailureMessages = {
  PLAN_THEME_MISSING: 'The plan did not include its theme details.',
  PLAN_THEME_INVALID: 'The plan returned unusable theme details.',
  PLAN_THEME_ANCHORS: 'An earlier exact-word theme check rejected this plan; the record does not identify which wording failed.',
  PLAN_REWORK_UNCHANGED: 'The replacement did not change enough of the story.',
  PLAN_PRINT_FIT: 'The generated plan did not fit the printable format.',
  PLAN_INVALID: 'The plan did not meet the required five-checkpoint format.',
  PLAN_QA_FAILED: 'The earlier independent review found a mismatch without a specific recorded category.',
  PLAN_QA_THEME_WEAK: 'The story did not preserve the purchased theme clearly enough.',
  PLAN_QA_GOAL_UNRESOLVED: 'The proposed final action did not clearly resolve the purchased goal.',
  PLAN_QA_SCENE_SEQUENCE: 'The five story scenes did not form a coherent progression.',
  PLAN_QA_SETUP_MISMATCH: 'The story did not match the purchased setup.',
  PLAN_QA_UNSUPPORTED_ACTIVITY: 'The story promised an activity outside the printable format.',
  PLAN_UPSTREAM_FAILED: 'The model service could not prepare the plan.',
  PLAN_REPAIR_FAILED: 'The model service could not repair the plan.',
  PLAN_AUDIT_FAILED: 'The model service could not complete the story review.',
  PLAN_AUDIT_INVALID: 'The story review returned an invalid result, so the plan could not be approved.',
  PLAN_CALL_BUDGET: 'The plan reached its model-call limit.',
  PLAN_UNEXPECTED: 'The plan stopped because of a service error.',
};
export const planFailureMessage = code => planFailureMessages[code] || 'The earlier attempt did not record a specific failure reason.';
