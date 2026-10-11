import { useEffect, useState } from 'react';
import type { Standing } from '../../server/store';
import { Panel, Icon } from '../components/ui';
export function Leaderboard({ wallet }: { wallet?: string }) {
  const [rows, setRows] = useState<Standing[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/leaderboard', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('scores are temporarily unavailable');
        return r.json();
      })
      .then(setRows)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => abort.abort();
  }, []);
  const own = rows.find((r) => r.wallet === wallet);
  return (
    <Panel
      className="wide-panel leaderboard"
      eyebrow="SEASON 01 · THE LONG NIGHT"
      title="WHO LIVED TO TELL IT."
    >
      {rows.length ? (
        <>
          <table>
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>POINTS</th>
                <th>ESCAPES</th>
                <th>TAKES</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((r, i) => (
                <tr key={r.wallet}>
                  <td>{String(i + 1).padStart(2, '0')}</td>
                  <td>
                    {r.name}
                    {r.wallet === wallet ? ' · you' : ''}
                  </td>
                  <td>{r.points.toLocaleString()}</td>
                  <td>{r.escapes}</td>
                  <td>{r.takes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {own && (
            <p className="pinned-rank">
              your rank: #{rows.indexOf(own) + 1} ·{' '}
              {own.points.toLocaleString()} points
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Icon kind="cage" size={70} />
          <h3>THE BOARD IS QUIET.</h3>
          <p>
            {error || 'complete a verified match to leave your name here.'}
            <br />
            practice scores stay on your results screen.
          </p>
        </div>
      )}
    </Panel>
  );
}
