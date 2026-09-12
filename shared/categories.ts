// Domain → category, for the screen time dashboard.
//
// Deliberately coarse. The dashboard shows how a day was spent, not a dossier:
// anything unrecognised lands in "Other" rather than being looked up anywhere.

export type CategoryId = 'video' | 'social' | 'learning' | 'games' | 'other';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** Chart series slot. Fixed order, never cycled. 'other' is neutral grey. */
  color: string;
  icon: string;
}

/** Render/stack order is the validated adjacent order for these hues. */
export const CATEGORIES: CategoryDef[] = [
  { id: 'video', label: 'Video', color: 'var(--series-1)', icon: '▶️' },
  { id: 'social', label: 'Social', color: 'var(--series-2)', icon: '💬' },
  { id: 'learning', label: 'Learning', color: 'var(--series-3)', icon: '📚' },
  { id: 'games', label: 'Games', color: 'var(--series-4)', icon: '🎮' },
  { id: 'other', label: 'Other', color: '#9b95bd', icon: '•' },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>;

const RULES: { category: CategoryId; domains: string[] }[] = [
  {
    category: 'video',
    domains: ['youtube.com', 'youtu.be', 'netflix.com', 'twitch.tv', 'vimeo.com',
      'disneyplus.com', 'primevideo.com', 'hulu.com', 'dailymotion.com'],
  },
  {
    category: 'social',
    domains: ['tiktok.com', 'instagram.com', 'snapchat.com', 'facebook.com', 'x.com',
      'twitter.com', 'reddit.com', 'discord.com', 'whatsapp.com', 'pinterest.com',
      'tumblr.com', 'threads.net'],
  },
  {
    category: 'learning',
    domains: ['wikipedia.org', 'khanacademy.org', 'google.com', 'docs.google.com',
      'classroom.google.com', 'duolingo.com', 'quizlet.com', 'bbc.co.uk',
      'britannica.com', 'desmos.com', 'wolframalpha.com', 'scratch.mit.edu',
      'code.org', 'seesaw.me', 'microsoft.com', 'office.com'],
  },
  {
    category: 'games',
    domains: ['roblox.com', 'minecraft.net', 'epicgames.com', 'steampowered.com',
      'poki.com', 'coolmathgames.com', 'miniclip.com', 'itch.io', 'chess.com',
      'friv.com', 'crazygames.com'],
  },
];

const LOOKUP = new Map<string, CategoryId>();
for (const rule of RULES) {
  for (const domain of rule.domains) LOOKUP.set(domain, rule.category);
}

export function categoryOf(domain: string): CategoryId {
  const host = domain.toLowerCase().replace(/^www\./, '');
  const direct = LOOKUP.get(host);
  if (direct) return direct;
  // Match a parent domain, so docs.google.com and mail.google.com both resolve.
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    const hit = LOOKUP.get(parent);
    if (hit) return hit;
  }
  return 'other';
}

/** "1h 24m", "8m", "42s" — compact, never a bare seconds count over a minute. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
