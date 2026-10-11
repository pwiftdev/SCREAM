import type { Snapshot } from '../../shared/types';
import { C } from '../../shared/config';
export function Results({
  snapshot: s,
  onReturn,
  onWatch,
  onQueue,
}: {
  snapshot: Snapshot;
  onReturn: () => void;
  onWatch: () => void;
  onQueue: () => void;
}) {
  const escaped = s.players.filter((p) => p.health === 'escaped').length;
  const mvp = [...s.players].sort(
    (a, b) =>
      Object.values(b.points).reduce((x, y) => x + y, 0) -
      Object.values(a.points).reduce((x, y) => x + y, 0),
  )[0];
  return (
    <section className="results panel">
      <p className="eyebrow">ROTTEN HOLLOW · MATCH COMPLETE</p>
      <h1>THE NIGHT IS OVER.</h1>
      <p>
        {escaped} made it out.{' '}
        {s.players.filter((p) => p.role === 'survivor').length - escaped}{' '}
        stories stayed behind.
      </p>
      <table>
        <thead>
          <tr>
            <th>PLAYER</th>
            <th>FATE</th>
            <th>SURVIVAL</th>
            <th>REPAIR</th>
            <th>RESCUE</th>
            <th>HUNT</th>
          </tr>
        </thead>
        <tbody>
          {s.players.map((p) => (
            <tr key={p.id}>
              <td>
                <img
                  className="result-portrait"
                  src={`/assets/portraits/${p.role === 'killer' ? 5 : p.character}.png`}
                  alt=""
                />{' '}
                {p.name}
                {mvp?.id === p.id && <span className="tag">MVP</span>}
              </td>
              <td className={p.health}>
                {p.role === 'killer' ? 'the hollow' : p.health}
              </td>
              {Object.values(p.points).map((v, i) => (
                <td key={i}>{Math.round(v).toLocaleString()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        next queue opens in{' '}
        {Math.max(0, Math.ceil((s.endedAt + C.RESULTS_MS - s.now) / 1000))}s
      </p>
      <div className="results-actions">
        <button className="primary" onClick={onReturn}>
          BACK TO THE FIRE <span>↗</span>
        </button>
        <button className="secondary" onClick={onWatch}>
          SPECTATE
        </button>
        <button className="secondary" onClick={onQueue}>
          JOIN QUEUE
        </button>
      </div>
    </section>
  );
}
