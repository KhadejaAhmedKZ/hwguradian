// Fallback copy for when an agent is unavailable. All model calls go through
// the agent layer (src/lib/agents.ts → the runAgent / verifyChore functions),
// so no prompt and no API key ever ships inside the extension.

export const FALLBACK_ENCOURAGEMENT = [
  'Almost there — one task and you are back.',
  'You have got this. Knock one out.',
  'Small push now, free time after.',
  'Nearly done. Finish strong!',
];

export const FALLBACK_TASK_SUGGESTIONS = [
  'Read for 20 minutes',
  'Finish maths worksheet',
  'Tidy bedroom floor',
  'Practise spelling words',
  'Pack school bag for tomorrow',
];
