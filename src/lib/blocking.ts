// declarativeNetRequest rule management.
//
// Dynamic rules survive service-worker restarts and browser restarts, but we
// still recompute them on onStartup/onInstalled rather than trusting them,
// because the cached task state may be stale.

import { originPatternsFor } from '@shared/domains';

/** Dynamic rule ids we own. Anything in this range is ours to replace. */
const RULE_ID_BASE = 9000;
const MAX_DOMAINS = 500;

export function ruleIdsInUse(count: number): number[] {
  return Array.from({ length: count }, (_, i) => RULE_ID_BASE + i);
}

function buildRules(domains: string[]): chrome.declarativeNetRequest.Rule[] {
  return domains.slice(0, MAX_DOMAINS).map((domain, index) => ({
    id: RULE_ID_BASE + index,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { extensionPath: '/blocked/index.html' },
    },
    condition: {
      // requestDomains matches the domain and all of its subdomains.
      requestDomains: [domain],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  }));
}

async function ourExistingRuleIds(): Promise<number[]> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules.filter((r) => r.id >= RULE_ID_BASE && r.id < RULE_ID_BASE + MAX_DOMAINS).map((r) => r.id);
}

/**
 * Apply the gate. `shouldBlock` is the computed "any_pending" value; when it is
 * false every rule we own is removed, so the child gets their sites back the
 * moment the last task is approved.
 */
export async function applyBlockingRules(shouldBlock: boolean, domains: string[]): Promise<void> {
  const removeRuleIds = await ourExistingRuleIds();
  const addRules = shouldBlock ? buildRules(domains) : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

/** Which of these domains we can actually redirect right now. */
export async function missingDomainPermissions(domains: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const domain of domains) {
    const granted = await chrome.permissions.contains({ origins: originPatternsFor(domain) });
    if (!granted) missing.push(domain);
  }
  return missing;
}

/** Must be called from a user gesture (i.e. a click in the options page). */
export async function requestDomainPermissions(domains: string[]): Promise<boolean> {
  const origins = domains.flatMap(originPatternsFor);
  if (origins.length === 0) return true;
  return chrome.permissions.request({ origins });
}
