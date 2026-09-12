// Gemini is used for two small, optional things:
//   1. parent dashboard  — suggest age-appropriate tasks / soften a task title
//   2. blocked page      — one short encouraging line, cached for the day
//
// The supported path is the `geminiAssist` callable Cloud Function, which keeps
// the API key on the server. The direct-call branch exists only for local dev
// and is guarded behind an env var that should be empty in any installed build.

import { httpsCallable } from 'firebase/functions';
import { DEV_GEMINI_API_KEY } from '../config';

export type AssistKind = 'suggest_tasks' | 'encourage';

export interface AssistRequest {
  kind: AssistKind;
  /** Free-form context, e.g. "9 year old, school nights" or a task title. */
  prompt?: string;
}

export interface AssistResponse {
  /** For suggest_tasks: one task title per entry. For encourage: one line. */
  lines: string[];
}

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPTS: Record<AssistKind, string> = {
  suggest_tasks:
    'You help a parent write short homework and chore tasks for their child. ' +
    'Reply with 5 task titles, one per line, no numbering, no punctuation at the end. ' +
    'Each under 8 words, concrete and checkable.',
  encourage:
    'You write one short encouraging line for a child who still has tasks left ' +
    'before their sites unlock. Warm, never shaming, never sarcastic. ' +
    'One sentence, under 12 words. Reply with the sentence only.',
};

function parseLines(text: string, kind: AssistKind): string[] {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(Boolean);
  return kind === 'encourage' ? lines.slice(0, 1) : lines.slice(0, 5);
}

async function callDirect(request: AssistRequest): Promise<AssistResponse> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${encodeURIComponent(DEV_GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[request.kind] }] },
      contents: [{ role: 'user', parts: [{ text: request.prompt ?? '' }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini error ${response.status}`);
  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return { lines: parseLines(text, request.kind) };
}

export async function assist(
  functionsInstance: Parameters<typeof httpsCallable>[0],
  request: AssistRequest,
): Promise<AssistResponse> {
  if (DEV_GEMINI_API_KEY) return callDirect(request);
  const callable = httpsCallable<AssistRequest, AssistResponse>(functionsInstance, 'geminiAssist');
  const result = await callable(request);
  return result.data;
}

/** Fallbacks so the UI never looks broken when Gemini is unavailable. */
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
