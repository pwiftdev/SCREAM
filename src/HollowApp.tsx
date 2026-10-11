import { useEffect, useRef, useState } from 'react';
import { World } from './screens/hollow/World';
import { Visit, type RunResult } from './screens/hollow/Visit';
import { Builder } from './screens/hollow/Builder';
import { Arrival } from './screens/hollow/Arrival';
import { HollowSettingsPanel } from './screens/hollow/Settings';
import { AssetLoading } from './screens/rework/AssetLoading';
import { Stage } from './screens/rework/ui';
import { XProfileLink } from './screens/rework/XProfileLink';
import { hollowAudio } from './lib/hollow-audio';
import {
  myHouse,
  runTicket,
  laneApi,
  compressFrames,
  type OwnHouse,
  type Door,
} from './lib/hollow-api';
import type { HouseV1 } from '../shared/house/format';
import { H } from '../shared/config';
import './hollow.css';
import './scream.css';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/600.css';
import './rework.css';
export default function HollowApp() {
  return (
    <Stage>
      <AssetLoading>
        <Game />
      </AssetLoading>
    </Stage>
  );
}
type RunTicket = {
  id: string;
  purpose: 'visit' | 'clear';
  seed: number;
  code: string;
};
function loadNeighborhood() {
  return Promise.all([
    laneApi<Door[]>('/houses'),
    laneApi<{ slot: number; code: string }[]>('/plots'),
  ]);
}
function Game() {
  const [entered, setEntered] = useState(false),
    [panel, setPanel] = useState<'pause' | 'settings' | null>(null);
  const [own, setOwn] = useState<OwnHouse | null>(null),
    [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [doors, setDoors] = useState<Door[]>([]),
    [plots, setPlots] = useState<{ slot: number; code: string }[]>([]);
  const [house, setHouse] = useState<HouseV1 | null>(null),
    [failed, setFailed] = useState<{ run: RunResult; t: RunTicket } | null>(
      null,
    );
  const ticket = useRef<RunTicket | null>(null);
  const verifying = useRef(false);
  const street = 0;
  async function refresh() {
    const [d, p] = await loadNeighborhood();
    setDoors(d);
    setPlots(p);
  }
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [d, p] = await loadNeighborhood();
        if (alive) {
          setDoors(d);
          setPlots(p);
        }
      } catch {
        if (alive)
          setError(
            'The neighborhood could not update. Check the local server.',
          );
      }
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function enter() {
    await action(async () => {
      setOwn(await myHouse());
      setEntered(true);
      setPanel(null);
      hollowAudio.street();
    });
  }
  async function begin(code: string, purpose: 'visit' | 'clear') {
    if (verifying.current || failed) {
      setError('Finish verifying the previous visit first.');
      return;
    }
    await action(async () => {
      const t = await runTicket(code, purpose);
      ticket.current = { id: t.id, purpose, seed: t.seed, code };
      setHouse(t.house);
      setBuilding(false);
      setPanel(null);
      setFailed(null);
    });
  }
  async function finished(run: RunResult, t = ticket.current) {
    if (verifying.current) return;
    verifying.current = true;
    setError('');
    setHouse(null);
    setBuilding(false);
    setPanel(null);
    hollowAudio.street();
    if (!t) {
      verifying.current = false;
      return;
    }
    if (t.purpose === 'clear' && run.outcome !== 'escaped') {
      setNotice(
        'The house test failed. Return to your plot to edit and try again.',
      );
      verifying.current = false;
      return;
    }
    setNotice(
      run.outcome === 'escaped'
        ? 'Back outside. Checking the candy you brought out…'
        : 'The house claimed you. Back in the night.',
    );
    setFailed(null);
    try {
      const answer = await laneApi<{ clear?: boolean; candy?: number }>(
        '/finish',
        { id: t.id, frames: await compressFrames(run.frames), mic: run.mic },
      );
      if (t.purpose === 'clear' && answer.clear) {
        const mine = await myHouse();
        await laneApi('/publish', { hash: mine.hash });
        setOwn(await myHouse());
        await refresh();
        setNotice(
          'Your tested house is open. Keep exploring, or return to its sign to build.',
        );
      } else
        setNotice(
          answer.candy
            ? `Escaped with ${answer.candy} candy · local simulated reward.`
            : 'Run verified. The night continues.',
        );
    } catch (e) {
      setError((e as Error).message);
      setFailed({ run, t });
    } finally {
      verifying.current = false;
    }
  }
  async function plotAction(slot: number) {
    if (verifying.current || failed) {
      setError('Finish verifying the previous visit first.');
      return;
    }
    await action(async () => {
      const mine = await myHouse();
      if (mine.plot && mine.plot.slot !== slot)
        throw new Error(
          'You already own a plot. Your home is marked on the compass.',
        );
      const next = mine.plot
        ? await laneApi<OwnHouse>('/build-access', {})
        : await laneApi<OwnHouse>('/plots', { slot, style: slot % 3 });
      setOwn(next);
      setBuilding(true);
      setPanel(null);
      setNotice('');
      await refresh();
    });
  }
  return (
    <main className="hl-app">
      {entered && !house && !building && (
        <World
          entered
          active={!panel && !busy}
          doors={doors.filter(
            (d) => Math.floor(d.slot / H.PLOTS_PER_STREET) === street,
          )}
          plots={plots}
          homeSlot={own?.plot?.slot}
          ownHouse={own}
          onPlot={(slot) => void plotAction(slot)}
          onMenu={() => setPanel('pause')}
          street={street}
          onDoor={(slot) => {
            const door = doors.find((d) => d.slot === slot);
            if (door) void begin(door.code, 'visit');
          }}
        />
      )}
      {!entered && (
        <Arrival
          onPlay={() => void enter()}
          onSettings={() => setPanel('settings')}
          busy={busy}
        />
      )}
      {building && own && (
        <Builder
          initial={own}
          onExit={(saved) => {
            setOwn(saved);
            setBuilding(false);
            setPanel(null);
            hollowAudio.street();
            void refresh().catch((e: Error) => setError(e.message));
          }}
          onClear={(saved) => {
            setOwn(saved);
            void begin(saved.code, 'clear');
          }}
        />
      )}
      {house && (
        <Visit
          house={house}
          seed={ticket.current?.seed ?? 17}
          ticketId={ticket.current?.id}
          autoStart
          estimatedLoot={Math.floor(
            (doors.find((d) => d.code === ticket.current?.code)?.candy ?? 0) *
              0.1,
          )}
          onFinish={(run) => void finished(run)}
          onExit={() => {
            setHouse(null);
            hollowAudio.street();
          }}
        />
      )}
      {panel === 'pause' && (
        <div className="hl-scrim">
          <section className="hl-panel hl-pause">
            <span className="hl-eyebrow">THE NIGHT IS STILL MOVING</span>
            <h1>LET’S SCREAM TOGETHER</h1>
            <p>
              Wander. Hunt. Make them scream.
              <br />
              Claim an empty plot at its sign, or raid a public haunted house.
            </p>
            <button className="hl-primary" onClick={() => setPanel(null)}>
              RETURN TO THE WORLD
            </button>
            <button onClick={() => setPanel('settings')}>SETTINGS</button>
            <p>
              1 lantern · 2 crowbar · 3 shovel · M map
              <br />
              Left click attack · E interact · Q scream · Shift sprint
            </p>
            <small>
              Pausing does not protect you from other players. Combat logout
              counts as a death.
            </small>
            <XProfileLink />
          </section>
        </div>
      )}
      {panel === 'settings' && (
        <div className="hl-scrim">
          <HollowSettingsPanel
            onClose={() => setPanel(entered ? 'pause' : null)}
          />
        </div>
      )}
      {notice && entered && !building && !house && (
        <div className="world-toast" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="hl-error" role="alert">
          {error}
          {failed && (
            <button onClick={() => void finished(failed.run, failed.t)}>
              RETRY VERIFICATION
            </button>
          )}
          {failed && (
            <button
              onClick={() => {
                setFailed(null);
                setError('');
              }}
            >
              CONTINUE WITHOUT REWARD
            </button>
          )}
          <button onClick={() => setError('')}>dismiss</button>
        </div>
      )}
    </main>
  );
}
