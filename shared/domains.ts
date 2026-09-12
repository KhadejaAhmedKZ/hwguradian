/** Normalise whatever the parent typed into a bare, matchable hostname. */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^[a-z]+:\/\//, '');
  value = value.split('/')[0]!.split('?')[0]!.split('#')[0]!;
  value = value.replace(/^www\./, '');
  value = value.replace(/:\d+$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value)) return null;
  return value;
}

/** Hostname of a URL, or null for non-web URLs (chrome://, about:, file://…). */
export function hostnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** True when `host` is a blocked domain or a subdomain of one. */
export function matchesBlockedDomain(host: string | null, blocked: string[]): boolean {
  if (!host) return false;
  return blocked.some((d) => host === d || host.endsWith(`.${d}`));
}

/** chrome.permissions origin patterns needed to redirect a domain. */
export function originPatternsFor(domain: string): string[] {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}
