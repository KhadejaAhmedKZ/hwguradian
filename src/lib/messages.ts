// Typed message contract between the extension pages and the service worker.

export type ExtMessage =
  | { type: 'CHECK_RECENT_BLOCKED_ACTIVITY' }
  | { type: 'RESYNC' }
  | { type: 'REQUEST_DOMAIN_PERMISSIONS'; domains: string[] };

export type ExtResponse =
  | { type: 'RECENT_BLOCKED_ACTIVITY'; flagged: boolean }
  | { type: 'OK' }
  | { type: 'ERROR'; message: string };

export function sendToBackground(message: ExtMessage): Promise<ExtResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ExtResponse | undefined) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ type: 'ERROR', message: chrome.runtime.lastError?.message ?? 'No response' });
        return;
      }
      resolve(response);
    });
  });
}
