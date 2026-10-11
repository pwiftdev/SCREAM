import { hollowAudio } from '../../lib/hollow-audio';
import { useEffect, useState, type ReactNode } from 'react';
import { laneApi } from '../../lib/hollow-api';
import { Backdrop } from './Backdrop';
import { PanelTitle, Segments, useDawn } from './ui';
import { Logo } from '../hollow/Arrival';
interface Report {
  raids: { id: string; code: string; outcome: string; amount: number }[];
  totals: { visits: number; escaped: number; stolen: number };
  defense: { visits: number; stopped: number; found: number; lost: number };
  loudest: number;
}
export function NightResults({
  onBuild,
  onNext,
  children,
  escaped = true,
  refreshKey = '',
}: {
  onBuild: () => void;
  onNext: () => void;
  children?: ReactNode;
  escaped?: boolean;
  refreshKey?: string;
}) {
  const hasRun = !!refreshKey;
  useEffect(() => {
    hollowAudio.results(hasRun ? escaped : undefined);
  }, [escaped, hasRun]);
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(''),
    dawn = useDawn();
  useEffect(() => {
    let alive = true;
    laneApi<Report>('/night-report')
      .then((r) => {
        if (alive) setReport(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  const stolen = report?.totals.stolen ?? 0,
    net = stolen - (report?.defense.lost ?? 0),
    escapedRaids = report?.totals.escaped ?? 0;
  return (
    <section className="night-results">
      <Backdrop mode="results" />
      <div className="night-results-shade" />
      <header>
        <small>YOUR NIGHT {dawn.index} · RAID REPORT</small>
        <h1>{escaped ? 'YOU MADE IT OUT' : 'THE HOUSE GOT YOU'}</h1>
        <div>
          <button className="night-outline" onClick={onBuild}>
            FORTIFY HOUSE
          </button>
          <button className="night-primary" onClick={onNext}>
            NEXT NIGHT
          </button>
        </div>
      </header>
      <div className="night-result-cards">
        <section className="night-panel">
          <PanelTitle>YOUR RAIDS</PanelTitle>
          {report?.raids.length ? (
            report.raids.slice(0, 3).map((r) => (
              <div className="night-result-row" key={r.id}>
                <div>
                  <b>{r.code}</b>
                  <small>HAUNTED HOUSE</small>
                </div>
                <small className={r.outcome === 'escaped' ? '' : 'blood-text'}>
                  {r.outcome.toUpperCase()}
                </small>
                <strong className="candy-text">+{r.amount}</strong>
              </div>
            ))
          ) : (
            <p>No verified raids this night. Your first door is waiting.</p>
          )}
          <div className="night-result-row">
            <span>Stolen · SIMULATED</span>
            <strong className="candy-text">+{stolen}</strong>
          </div>
        </section>
        <section className="night-panel">
          <PanelTitle>YOUR HOUSE · SIMULATED</PanelTitle>
          {[
            ['Break-ins', report?.defense.visits ?? 0],
            ['Stopped by the house', report?.defense.stopped ?? 0],
            ['Stashes found', report?.defense.found ?? 0],
            ['Candy lost', `−${report?.defense.lost ?? 0}`],
          ].map(([label, n]) => (
            <div className="night-result-row" key={label}>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          ))}
          <p className="night-report-note">
            Defend your hiding places. Replays are available in My House.
          </p>
        </section>
        <section className="night-panel">
          <PanelTitle>SCARES</PanelTitle>
          <div className="night-scream-score">
            <strong>{report?.loudest ?? 0}</strong>
            <small>
              LOUDEST RECENT SCREAM
              <br />
              SCREAM POWER
            </small>
          </div>
          <p>
            Your microphone records level markers only. Hold V during a raid to
            log a scream.
          </p>
          <div className="night-result-row">
            <span>Verified raids</span>
            <strong>{report?.totals.visits ?? 0}</strong>
          </div>
        </section>
      </div>
      <div className="night-result-feedback">
        {error && <p role="alert">{error}</p>}
        {children}
      </div>
      <footer className="night-result-totals">
        <div>
          <small>NET CANDY · SIMULATED</small>
          <strong className="candy-text">
            {net >= 0 ? '+' : ''}
            {net}
          </strong>
        </div>
        <div>
          <Logo />
          <section>
            <small>$SCREAM · SIMULATED</small>
            <strong>
              {net >= 0 ? '+' : ''}
              {net}
            </strong>
            <p>Rewards run as a local simulation for now.</p>
          </section>
        </div>
        <div>
          <small>
            ESCAPED RAIDS · {escapedRaids} / {report?.totals.visits ?? 0}
          </small>
          <Segments
            value={escapedRaids}
            max={Math.max(1, report?.totals.visits ?? 0)}
            count={20}
            label="Night raid progress"
          />
        </div>
      </footer>
    </section>
  );
}
