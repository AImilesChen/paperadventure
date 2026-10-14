import { offers, themes } from '../shared/catalog.mjs';
import { creatorFields } from './creator-preview.mjs';
import { validatePlan } from '../shared/creator-plan.mjs';

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function requireText(value, name, max = 180) {
  const text = String(value || '').trim();
  if (!text || text.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new ApiError(400, 'INVALID_SPEC', `${name} is required and must be under ${max} characters.`);
  return text;
}

export function validatePurchase(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'INVALID_SPEC', 'A purchase specification is required.');
  const offer = offers.find(item => item.sku === input.sku);
  if (!offer) throw new ApiError(400, 'UNKNOWN_SKU', 'Choose a valid product.');
  const themeId = input.themeId && themes.some(theme => theme.id === input.themeId) ? input.themeId : null;
  if (offer.kind === 'custom' && themeId && !themes.find(theme => theme.id === themeId)?.availableSettings?.includes(offer.setting)) {
    throw new ApiError(400, 'INVALID_SPEC', 'Choose a story world available for this setting.');
  }
  if (offer.kind === 'ready') {
    if (!themeId || input.customIdea) throw new ApiError(400, 'INVALID_SPEC', 'A ready-made pack requires a listed theme.');
    const variantId = input.variantId == null || input.variantId === '' ? null : String(input.variantId);
    if (variantId && !(offer.setting === 'classroom' && ((themeId === 'halloween' && variantId === 'halloween') || (themeId === 'christmas' && variantId === 'christmas')))) {
      throw new ApiError(400, 'INVALID_SPEC', 'Choose a supported classroom story wording.');
    }
    return { offer, spec: { sku: offer.sku, kind: 'ready', setting: offer.setting, themeId, variantId,
      packVersion: requireText(input.packVersion, 'Pack version', 40) } };
  }
  const players = Number(input.players);
  const groups = offer.setting === 'classroom' ? Number(input.groups) : null;
  if (!Number.isInteger(players) || players < 2 || players > 40) throw new ApiError(400, 'INVALID_SPEC', 'Players must be between 2 and 40.');
  if (offer.setting === 'classroom' && (!Number.isInteger(groups) || groups < 1 || groups > 10 || groups > players)) throw new ApiError(400, 'INVALID_SPEC', 'Classroom groups must be between 1 and 10, and no more than the student count.');
  const age = requireText(input.age, 'Age range', 40);
  const idea = themeId ? null : requireText(input.customIdea, 'Story idea', 400);
  const paper = input.paper === 'Letter' || input.paper === 'US Letter' ? 'Letter' : input.paper === 'A4' ? 'A4' : null;
  if (!paper) throw new ApiError(400, 'INVALID_SPEC', 'Choose A4 or US Letter.');
  const direction = input.creatorVersion === 3 ? 'mystery' : ['mystery', 'mission'].includes(input.direction) ? input.direction : null;
  if (!direction) throw new ApiError(400, 'INVALID_SPEC', 'Choose a story direction.');
  const proposalTitle = input.proposalTitle ? requireText(input.proposalTitle, 'Proposal title', 80) : null;
  const proposalSummary = input.proposalSummary ? requireText(input.proposalSummary, 'Proposal summary', 400) : null;
  if (Boolean(proposalTitle) !== Boolean(proposalSummary)) throw new ApiError(400, 'INVALID_SPEC', 'The selected proposal is incomplete.');
  if (input.creatorVersion === 3 && (input.plan || input.previewToken || input.planConfirmed || proposalTitle || proposalSummary)) throw new ApiError(400,'INVALID_SPEC','The personal plan is created after payment.');
  return { offer, spec: { sku: offer.sku, kind: 'custom', setting: offer.setting, themeId, customIdea: idea, players, groups, age, paper, direction, proposalTitle, proposalSummary,
    preferences: Object.fromEntries(['characters','goal','include','avoid'].map(key => [key, input.preferences?.[key] ? requireText(input.preferences[key], `Preference ${key}`, 180) : ''])),
    place: String(input.place || '').trim().slice(0, 180), reading: String(input.reading || '').trim().slice(0, 40), materials: String(input.materials || '').trim().slice(0, 180), ...creatorFields(input) } };
}

export function validateSupportedRange(spec, env) {
  if (spec.kind !== 'custom') return;
  const minimum = Number(env.SUPPORTED_AGE_MIN);
  const maximum = Number(env.SUPPORTED_AGE_MAX);
  const homeMax = Number(env.HOME_PLAYER_MAX);
  const classroomMax = Number(env.CLASSROOM_STUDENT_MAX);
  if (![minimum, maximum, homeMax, classroomMax].every(Number.isInteger) || minimum < 1 || maximum < minimum || homeMax < 2 || classroomMax < 2) throw new ApiError(503, 'SUPPORTED_RANGE_NOT_SET', 'Supported play ranges are not configured.');
  const match = spec.age.match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?(?:\s*(?:years?|yrs?|yo))?$/i);
  if (!match) throw new ApiError(400, 'INVALID_AGE_RANGE', 'Enter one age or a simple range, such as 8-10.');
  const low = Number(match[1]); const high = match[2] ? Number(match[2]) : low;
  if (high < low || low < minimum || high > maximum) throw new ApiError(400, 'UNSUPPORTED_AGE_RANGE', `The current supported age range is ${minimum}-${maximum}.`);
  const playerMax = spec.setting === 'classroom' ? classroomMax : homeMax;
  if (spec.players > playerMax) throw new ApiError(400, 'UNSUPPORTED_GROUP_SIZE', `The current ${spec.setting} limit is ${playerMax} players.`);
}

function validateStoryStage(stage, index, plan, previousUnlock) {
  if (!stage || typeof stage !== 'object') throw new ApiError(422, 'GENERATION_INVALID', 'A stage is missing.');
  const number = index + 1;
  if (plan && (stage.title !== plan.stages[index].title || stage.mechanic !== plan.stages[index].mechanic)) throw new ApiError(422,'GENERATION_INVALID',`Checkpoint ${number} changed the approved title or play style.`);
  const options = stage.options;
  if (!Array.isArray(options) || options.length !== 3 || new Set(options.map(x => String(x).trim().toLowerCase())).size !== 3) throw new ApiError(422, 'GENERATION_INVALID', `Stage ${number} needs three distinct options.`);
  const answerIndex = Number(stage.answerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 2) throw new ApiError(422, 'GENERATION_INVALID', `Stage ${number} has no valid answer.`);
  const unlock = requireText(stage.unlock, `Stage ${number} unlock`, 100);
  const prerequisite = number === 1 ? 'START' : requireText(stage.prerequisite, `Stage ${number} prerequisite`, 100);
  if (number > 1 && prerequisite !== previousUnlock) throw new ApiError(422, 'GENERATION_INVALID', `Stage ${number} does not follow the previous clue.`);
  return { number, title: requireText(stage.title, 'Stage title', 100), clue: requireText(stage.clue, 'Clue', 1200), options: options.map((value, i) => requireText(value, `Option ${i+1}`, 240)), answerIndex,
    explanation: requireText(stage.explanation, 'Answer explanation', 600), hint: requireText(stage.hint, 'Hint', 400), prerequisite, unlock,
    ...(plan ? {mechanic:stage.mechanic,task:plan.stages[index].task,teamwork:plan.stages[index].teamwork} : {}) };
}

export function validateGeneratedStage(stage, spec, stageNumber, previousUnlock) {
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 5) throw new ApiError(422,'GENERATION_INVALID','Choose a checkpoint from 1 to 5.');
  let plan;
  try { plan=validatePlan(spec.plan,spec); } catch { throw new ApiError(422,'GENERATION_INVALID','The approved plan is unavailable.'); }
  if (/[^\x20-\x7e\n\r]/.test(JSON.stringify(stage))) throw new ApiError(422,'GENERATION_INVALID','Use English printable language.');
  return validateStoryStage(stage,stageNumber-1,plan,previousUnlock);
}

export function validateGeneratedStory(story, spec) {
  if (!story || typeof story !== 'object') throw new ApiError(422, 'GENERATION_INVALID', 'The generated story was empty.');
  const title = requireText(story.title, 'Story title', 100);
  const introduction = requireText(story.introduction, 'Introduction', 1200);
  const ending = requireText(story.ending, 'Ending', 1200);
  let plan = null;
  if (spec.creatorVersion >= 2) {
    try { plan = validatePlan(spec.plan,spec); } catch { throw new ApiError(422,'GENERATION_INVALID','The approved plan is unavailable.'); }
    if (title !== plan.title || introduction !== plan.opening || /[^\x20-\x7e\n\r]/.test(JSON.stringify(story))) throw new ApiError(422,'GENERATION_INVALID','Keep the approved title, opening and English printable language.');
  }
  if (!Array.isArray(story.stages) || story.stages.length !== 5) throw new ApiError(422, 'GENERATION_INVALID', 'Exactly five connected stages are required.');
  const stages = story.stages.map((stage,index)=>validateStoryStage(stage,index,plan,index ? story.stages[index-1].unlock : 'START'));
  if (spec.setting === 'classroom' && !story.groupInstructions) throw new ApiError(422, 'GENERATION_INVALID', 'Classroom group instructions are required.');
  return { title, introduction, ending, stages, groupInstructions: story.groupInstructions ? requireText(story.groupInstructions, 'Group instructions', 700) : null };
}

