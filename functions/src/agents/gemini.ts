/** Thin Gemini client. The API key never leaves the server. */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const MODEL = 'gemini-2.5-flash';

export interface GenerateOptions {
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** When set, the model is asked for JSON matching this schema. */
  responseSchema?: Record<string, unknown>;
}

export async function generate(options: GenerateOptions): Promise<string> {
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: [{ role: 'user', parts: [{ text: options.user }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 400,
      ...(options.responseSchema
        ? { responseMimeType: 'application/json', responseSchema: options.responseSchema }
        : {}),
    },
  };

  const response = await fetch(
    `${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}
