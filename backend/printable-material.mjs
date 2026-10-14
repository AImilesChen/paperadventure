// A small, versioned set of paper activities that the Worker can render itself.
// Model text supplies the labels and facts; it never supplies drawing commands.
export const materialTypes = ['evidence_cards','order_tiles','symbol_key','route_board','decision_record'];

const limit = (value, name, max) => {
  const text = String(value || '').trim();
  if (!text || text.length > max || /[^\x20-\x7e]/.test(text)) throw new Error(`${name} must be printable English under ${max} characters.`);
  return text;
};

export function validatePrintableMaterial(value) {
  if (!value || !materialTypes.includes(value.type) || !Array.isArray(value.items) || value.items.length < 3 || value.items.length > (value.type==='route_board'?4:6))
    throw new Error('A supported paper activity needs three to six pieces; route boards fit up to four.');
  const items = value.items.map((item, index) => ({
    label:limit(item?.label,`Paper piece ${index+1} label`,30),
    detail:limit(item?.detail,`Paper piece ${index+1} detail`,120),
  }));
  if (new Set(items.map(item=>item.label.toLowerCase())).size !== items.length) throw new Error('Paper pieces need different labels.');
  return {type:value.type,title:limit(value.title,'Paper activity title',60),
    instruction:limit(value.instruction,'Paper activity instruction',200),
    recordPrompt:limit(value.recordPrompt,'Paper activity record prompt',100),items};
}

export function validateMaterialSet(stages) {
  const kinds = new Set(stages.map(stage=>stage.material?.type));
  if (kinds.size < 3 || !kinds.has('evidence_cards') || ![...kinds].some(kind=>kind==='order_tiles' || kind==='route_board'))
    throw new Error('The five checkpoints need at least three different paper activities, including evidence and an ordering or route task.');
}
