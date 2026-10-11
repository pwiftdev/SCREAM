import { useEffect, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
export function Feedback({ code }: { code: string }) {
  const [message, setMessage] = useState(''),
    [reason, setReason] = useState(''),
    [reporting, setReporting] = useState(false);
  async function submit(path: string, body: unknown) {
    try {
      await laneApi(path, body);
      setMessage(
        path === '/report' ? 'report received. thank you.' : 'rating saved.',
      );
      setReporting(false);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <div className="hl-feedback">
      <span className="hl-eyebrow">RATE THE HOUSE</span>
      <div>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`Rate ${n} skulls`}
            onClick={() => submit('/rate', { code, rating: n })}
          >
            {n} SKULLS
          </button>
        ))}
        <button onClick={() => setReporting(!reporting)}>REPORT</button>
      </div>
      {reporting && (
        <div>
          <input
            aria-label="Report reason"
            placeholder="what should we review?"
            maxLength={160}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button onClick={() => submit('/report', { code, reason })}>
            SEND REPORT
          </button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
interface Review {
  code: string;
  owner: string;
  title: string;
  hidden: number;
  approved: number;
  reports: number;
}
export function Admin({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Review[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    setRows(await laneApi<Review[]>('/admin'));
  }
  useEffect(() => {
    let active = true;
    laneApi<Review[]>('/admin')
      .then((r) => {
        if (active) setRows(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function act(code: string, action: string) {
    setBusy(true);
    try {
      await laneApi('/admin', { code, action });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hl-panel hl-admin">
      <button className="hl-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <span className="hl-eyebrow">MODERATOR ALLOWLIST REQUIRED</span>
      <h1>KEEP THE LANE CLEAN.</h1>
      <p>
        review titles, signs, and block art before approving a top-ten
        placement.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((h) => (
        <article key={h.code}>
          <h2>{h.title}</h2>
          <p>
            {h.code} · {h.reports} reports ·{' '}
            {h.hidden ? 'hidden' : h.approved ? 'approved' : 'needs review'}
          </p>
          <a href={`/h/${h.code}`} target="_blank" rel="noreferrer">
            inspect house
          </a>
          {['hide', 'restore', 'approve', 'ban'].map((action) => (
            <button
              key={action}
              disabled={busy}
              onClick={() => act(h.code, action)}
            >
              {action.toUpperCase()}
            </button>
          ))}
        </article>
      ))}
    </section>
  );
}
