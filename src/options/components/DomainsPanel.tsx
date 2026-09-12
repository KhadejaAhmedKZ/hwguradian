import { useEffect, useState } from 'react';
import { normalizeDomain } from '@shared/domains';
import { setBlockedDomains } from '../../lib/parentActions';
import { missingDomainPermissions, requestDomainPermissions } from '../../lib/blocking';
import { sendToBackground } from '../../lib/messages';

const PRESETS = ['youtube.com', 'tiktok.com', 'instagram.com', 'roblox.com', 'reddit.com', 'twitch.tv'];

export function DomainsPanel({ hid, domains }: { hid: string; domains: string[] }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const refreshPermissions = async (list: string[]) => setMissing(await missingDomainPermissions(list));

  useEffect(() => {
    void refreshPermissions(domains);
  }, [domains.join(',')]);

  const save = async (next: string[]) => {
    await setBlockedDomains(hid, next);
    await sendToBackground({ type: 'RESYNC' });
    await refreshPermissions(next);
  };

  const add = async (raw: string) => {
    const domain = normalizeDomain(raw);
    if (!domain) return setError('That does not look like a domain. Try "youtube.com".');
    if (domains.includes(domain)) return setError('Already on the list.');
    setError(null);
    setInput('');
    // Ask for the host permission in the same click, while the gesture is live.
    await requestDomainPermissions([domain]);
    await save([...domains, domain]);
  };

  const remove = async (domain: string) => save(domains.filter((d) => d !== domain));

  const grantMissing = async () => {
    const granted = await requestDomainPermissions(missing);
    if (granted) await refreshPermissions(domains);
  };

  return (
    <div className="stack">
      <section className="card panel">
        <h2>Blocked while tasks are open</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Subdomains are included automatically — adding <code>youtube.com</code> also covers{' '}
          <code>m.youtube.com</code>. These sites reopen the moment the last task is approved.
        </p>

        <div className="form-row">
          <div className="grow">
            <label htmlFor="domain">Domain</label>
            <input
              id="domain"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void add(input)}
              placeholder="youtube.com"
            />
          </div>
          <button onClick={() => void add(input)}>Add</button>
        </div>
        {error && <div className="notice warm tiny">{error}</div>}

        <div className="row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {PRESETS.filter((p) => !domains.includes(p)).map((p) => (
            <button key={p} className="ghost small" onClick={() => void add(p)}>
              + {p}
            </button>
          ))}
        </div>

        <ul className="plain-list stack" style={{ marginTop: 14 }}>
          {domains.map((domain) => (
            <li key={domain} className="list-row">
              <span className="grow">{domain}</span>
              {missing.includes(domain) && <span className="pill warm">needs permission</span>}
              <button className="ghost small" onClick={() => void remove(domain)}>
                Remove
              </button>
            </li>
          ))}
          {domains.length === 0 && <li className="muted tiny">No sites blocked yet.</li>}
        </ul>
      </section>

      {missing.length > 0 && (
        <section className="card panel">
          <div className="spread">
            <div>
              <h2>Permission needed</h2>
              <p className="muted tiny" style={{ margin: 0 }}>
                Chrome needs your OK to redirect {missing.join(', ')}. The extension asks per-site
                rather than for every site you visit.
              </p>
            </div>
            <button onClick={() => void grantMissing()}>Grant access</button>
          </div>
        </section>
      )}
    </div>
  );
}
