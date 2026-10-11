import { useEffect, useRef, useState } from 'react';
import { C, CHARACTERS } from '../shared/config';
import type { Role, Snapshot } from '../shared/types';
import { GameRenderer, type PerformanceStats } from './game/renderer';
import { Controls } from './game/controls';
import { Session, endpoint } from './game/session';
import { Client, type Room } from '@colyseus/sdk';
import { signIn } from './lib/wallet';
import type { WalletLogin } from '../shared/auth';
import type { QueueStatus } from '../server/queue';
import { Leaderboard } from './screens/Leaderboard';
import { Menu } from './screens/Menu';
import { Characters } from './screens/Characters';
import { WalletModal } from './components/WalletModal';
import { Token } from './screens/Token';
import { Spectator } from './screens/Spectator';
import { GameAudio } from './lib/audio';
import { readSettings, useSettings, useAutoQuality } from './lib/settings';
import { Key, Panel, Icon } from './components/ui';
import { Hud } from './screens/Hud';
import { Results } from './screens/Results';
import { Loading } from './screens/Loading';
import { Settings } from './screens/Settings';
type Screen =
  | 'boot'
  | 'menu'
  | 'characters'
  | 'queue'
  | 'loading'
  | 'match'
  | 'results'
  | 'leaderboard'
  | 'token'
  | 'spectator';
export default function App() {
  const mount = useRef<HTMLDivElement>(null),
    renderer = useRef<GameRenderer | null>(null),
    session = useRef<Session | null>(null),
    controls = useRef<Controls | null>(null),
    audio = useRef(new GameAudio());
  const [screen, setScreen] = useState<Screen>('boot'),
    [settings, setSettings] = useSettings(),
    [settingsOpen, setSettingsOpen] = useState(false),
    [pause, setPause] = useState(false),
    [leaveConfirm, setLeaveConfirm] = useState(false),
    [walletOpen, setWalletOpen] = useState(false),
    [profile, setProfile] = useState(''),
    [name, setName] = useState('Wanderer'),
    [selected, setSelected] = useState(0),
    [role, setRole] = useState<Role>('survivor'),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [graphicsReady, setGraphicsReady] = useState(false),
    [roomCode, setRoomCode] = useState(''),
    [perf, setPerf] = useState<PerformanceStats | null>(null);
  const [login, setLogin] = useState<WalletLogin | null>(null),
    [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null),
    [live, setLive] = useState({
      live: false,
      watchers: 0,
      waiting: 0,
      generators: 0,
      players: [] as { name: string; role: string }[],
    }),
    [follow, setFollow] = useState('overview'),
    [crowd, setCrowd] = useState(0);
  useAutoQuality(perf, setSettings);
  const queueRoom = useRef<Room | null>(null),
    watchPending = useRef(false),
    watchVersion = useRef(0);
  useEffect(() => {
    const update = () => {
      if (!document.hidden)
        void fetch('/api/live')
          .then((r) => r.json())
          .then(setLive)
          .catch(() => {});
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, []);
  const showPerf = new URLSearchParams(location.search).has('perf');
  const receiveRef = useRef<(s: Snapshot) => void>(() => {});
  useEffect(() => {
    if (!mount.current) return;
    try {
      const r = new GameRenderer(mount.current, readSettings());
      renderer.current = r;
      void r.ready
        .then(() => setGraphicsReady(true))
        .catch((e) =>
          setError(
            `3D assets could not load: ${String(e)}. Reload to try again.`,
          ),
        );
      const engine = audio.current;
      r.onPerf = setPerf;
      r.onView = (position, forward) => engine.view(position, forward);
      let disposed = false;
      void Session.restore((s) => receiveRef.current(s), setError).then(
        (joined) => {
          if (!joined) return;
          if (disposed) {
            joined.leave();
            return;
          }
          session.current = joined;
          controls.current = new Controls(r, joined, readSettings(), () =>
            setPause((v) => !v),
          );
        },
      );
      return () => {
        disposed = true;
        controls.current?.dispose();
        session.current?.leave();
        r.dispose();
        engine.dispose();
      };
    } catch (e) {
      setError(`graphics could not start: ${String(e)}`);
    }
  }, []);
  useEffect(() => {
    renderer.current?.configure(settings);
    audio.current.configure(settings);
    if (controls.current) controls.current.settings = settings;
  }, [settings]);
  useEffect(() => {
    if (controls.current) controls.current.paused = pause || settingsOpen;
    if ((pause || settingsOpen) && document.pointerLockElement)
      document.exitPointerLock();
  }, [pause, settingsOpen]);
  useEffect(() => {
    renderer.current?.preview(
      screen === 'characters',
      selected,
      role === 'killer',
    );
  }, [screen, selected, role]);
  const receive = (s: Snapshot) => {
    setSnapshot(s);
    renderer.current?.update(s);
    audio.current.update(s);
    if (s.phase === 'playing') setScreen('match');
    if (s.phase === 'finished') {
      setScreen('results');
      controls.current?.dispose();
      controls.current = null;
    }
  };
  receiveRef.current = receive;
  async function join() {
    setBusy(true);
    setError('');
    setScreen('loading');
    try {
      const bots = Number(
        new URLSearchParams(location.search).get('bots') ?? C.SURVIVORS,
      );
      const joined = await Session.practice(
        {
          name: name || CHARACTERS[selected],
          role,
          character: selected,
          bots,
          roomId: roomCode.trim() || undefined,
        },
        receive,
        setError,
      );
      session.current = joined;
      setRoomCode(joined.room.roomId);
      setScreen('queue');
      if (renderer.current)
        controls.current = new Controls(
          renderer.current,
          joined,
          settings,
          () => setPause((v) => !v),
        );
    } catch (e) {
      setError(String((e as Error).message));
      setScreen('characters');
    } finally {
      setBusy(false);
    }
  }
  async function connectWallet(wallet: string) {
    setBusy(true);
    setError('');
    try {
      const l = await signIn(wallet);
      setLogin(l);
      setProfile(
        wallet === 'Local test profile'
          ? 'TEST PROFILE'
          : `${l.wallet.slice(0, 4)}…${l.wallet.slice(-4)}`,
      );
      setWalletOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function watch() {
    if (watchPending.current) return;
    closeSession();
    watchPending.current = true;
    const version = ++watchVersion.current;
    setError('');
    setScreen('spectator');
    try {
      const joined = await Session.watch((s) => {
        setSnapshot(s);
        renderer.current?.update(s, true);
        audio.current.update(s);
      }, setError);
      if (version !== watchVersion.current) {
        joined.leave();
        return;
      }
      session.current = joined;
      joined.room.onMessage('crowd', (n: number) => setCrowd(n));
    } catch (e) {
      setError((e as Error).message);
      setScreen('menu');
    } finally {
      watchPending.current = false;
    }
  }
  async function joinQueue(queueRole: Role | 'fill' = role) {
    if (!login) {
      setWalletOpen(true);
      return;
    }
    watchVersion.current++;
    closeSession();
    setBusy(true);
    try {
      const r = await new Client(endpoint()).joinOrCreate('queue', {
        login,
        role: queueRole,
        name,
        character: selected,
      });
      queueRoom.current = r;
      r.onMessage('queue', (v: QueueStatus) => {
        setQueueStatus(v);
        if (v.live && v.position > 0 && !session.current) void watch();
      });
      r.onMessage('notice', setError);
      r.onMessage('seat', async (v: { roomId: string; ticket: string }) => {
        try {
          watchVersion.current++;
          closeSession();
          const room = await new Client(endpoint()).joinById(v.roomId, {
            ticket: v.ticket,
          });
          const joined = new Session(room, receive, setError);
          session.current = joined;
          await r.leave();
          queueRoom.current = null;
          setQueueStatus(null);
          if (renderer.current)
            controls.current = new Controls(
              renderer.current,
              joined,
              settings,
              () => setPause((v) => !v),
            );
        } catch (e) {
          setError((e as Error).message);
        }
      });
      r.send('sync');
      setScreen('queue');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function closeSession() {
    audio.current.reset();
    controls.current?.dispose();
    controls.current = null;
    session.current?.leave();
    session.current = null;
    if (renderer.current) {
      renderer.current.playing = false;
      renderer.current.snapshot = undefined;
    }
    setSnapshot(null);
  }
  function leave() {
    watchVersion.current++;
    closeSession();
    queueRoom.current?.leave();
    queueRoom.current = null;
    setQueueStatus(null);
    setSnapshot(null);
    setPause(false);
    setLeaveConfirm(false);
    setRoomCode('');
    setScreen('menu');
  }
  function enter() {
    if (!graphicsReady) return;
    audio.current.start(settings);
    setScreen('menu');
  }
  const inGame = screen === 'match' || screen === 'spectator',
    tabs = ['PLAY', 'CHARACTERS', 'LEADERBOARD', '$SCREAM'];
  return (
    <main
      onPointerDown={() => audio.current.start(settings)}
      className={`${settings.reducedMotion ? 'reduced-motion' : ''} ${settings.flashReduction ? 'flash-reduction' : ''}`}
    >
      <div className="world" ref={mount} />
      <div className={`cinematic-shade ${inGame ? 'in-game' : ''}`} />
      {screen === 'boot' ? (
        <button className="boot" onClick={enter} disabled={!graphicsReady}>
          <img src="/assets/logo.svg" alt="Screaming pixel face" />
          <p className="eyebrow">FOUR SURVIVORS. ONE LONG NIGHT.</p>
          <h1>
            LET’S SCREAM
            <br />
            TOGETHER.
          </h1>
          <span>
            {graphicsReady ? (
              <>
                CLICK TO ENTER <Key>↵</Key>
              </>
            ) : (
              'LOADING THE FAIRGROUND…'
            )}
          </span>
          <small>headphones recommended · a local preview</small>
        </button>
      ) : (
        <>
          {!inGame &&
            screen !== 'queue' &&
            screen !== 'results' &&
            screen !== 'loading' && (
              <header>
                <button className="brand" onClick={() => setScreen('menu')}>
                  <img src="/assets/logo.svg" alt="" />
                  <span>
                    LET’S SCREAM
                    <br />
                    TOGETHER
                  </span>
                </button>
                <nav>
                  {tabs.map((tab, i) => (
                    <button
                      className={
                        (screen === 'menu' && i === 0) ||
                        screen ===
                          ['menu', 'characters', 'leaderboard', 'token'][i]
                          ? 'active'
                          : ''
                      }
                      key={tab}
                      onClick={() =>
                        setScreen(
                          ['menu', 'characters', 'leaderboard', 'token'][
                            i
                          ] as Screen,
                        )
                      }
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
                <div className="header-actions">
                  <button
                    className="wallet"
                    onClick={() => setWalletOpen(true)}
                  >
                    <i />
                    {profile || 'CONNECT WALLET'}
                  </button>
                  <button
                    aria-label="Settings"
                    className="settings-button"
                    onClick={() => setSettingsOpen(true)}
                  >
                    ☷
                  </button>
                </div>
              </header>
            )}
          {screen === 'menu' && (
            <Menu
              watchers={live.watchers}
              live={live}
              onPlay={() => setScreen('characters')}
              onFriends={() => {
                setRoomCode('');
                setScreen('characters');
              }}
              onWatch={() => void watch()}
            />
          )}
          {screen === 'characters' && (
            <Characters
              role={role}
              selected={selected}
              name={name}
              roomCode={roomCode}
              busy={busy}
              waiting={live.waiting}
              onRole={setRole}
              onCharacter={setSelected}
              onName={setName}
              onRoom={setRoomCode}
              onPractice={() => void join()}
              onQueue={() => void joinQueue()}
              onFill={() => void joinQueue('fill')}
            />
          )}
          {screen === 'loading' && <Loading />}
          {queueStatus && (
            <div className="queue-banner">
              <span>
                position #{queueStatus.position} · {queueStatus.waiting} waiting
              </span>
              {queueStatus.holder && (
                <span className="tag">HOLDER · EMBER CHARM</span>
              )}
              {queueStatus.selected && (
                <>
                  <b>
                    READY CHECK ·{' '}
                    {Math.max(
                      0,
                      Math.ceil(
                        (queueStatus.readyUntil - queueStatus.now) / 1000,
                      ),
                    )}
                    s
                  </b>
                  <button
                    onClick={() => queueRoom.current?.send('ready', true)}
                  >
                    {queueStatus.ready ? 'READY' : 'I’M READY'}
                  </button>
                  <button
                    onClick={() => queueRoom.current?.send('ready', false)}
                  >
                    NOT THIS NIGHT
                  </button>
                </>
              )}
              {queueStatus.offerKiller && (
                <button onClick={() => queueRoom.current?.send('offer')}>
                  TAKE THE KILLER SEAT
                </button>
              )}
            </div>
          )}
          {screen === 'queue' && (
            <section className="queue-screen">
              <p className="eyebrow">THE FIRE WON’T KEEP YOU SAFE FOREVER</p>
              <h1>WAITING FOR THE OTHERS.</h1>
              <p>
                {queueStatus ? (
                  <>
                    estimated wait:{' '}
                    {queueStatus.live
                      ? Math.max(
                          1,
                          Math.ceil(queueStatus.position / C.MAX_PLAYERS),
                        ) * 15
                      : 2}{' '}
                    minutes
                  </>
                ) : (
                  <>
                    invite a friend with room code{' '}
                    <b className="room-code">{session.current?.room.roomId}</b>
                  </>
                )}
              </p>
              <div className="seat-grid">
                {Array.from({ length: C.MAX_PLAYERS }, (_, i) => {
                  const p = queueStatus
                    ? queueStatus.seats[i]
                    : snapshot?.players[i];
                  return (
                    <div className={`seat ${p ? 'occupied' : ''}`} key={i}>
                      <span className="seat-number">0{i + 1}</span>
                      {p && (
                        <img
                          src={`/assets/portraits/${p.role === 'killer' ? 5 : p.character}.png`}
                          alt=""
                        />
                      )}
                      <Icon
                        kind={p?.role === 'killer' ? 'skull' : 'heart'}
                        size={64}
                      />
                      <h3>{p?.name ?? 'EMPTY SEAT'}</h3>
                      <p>{p?.role ?? 'dev bot on start'}</p>
                      <span className="tag">{p ? 'CONNECTED' : 'WAITING'}</span>
                    </div>
                  );
                })}
              </div>
              <button
                className="primary"
                disabled={!!queueStatus}
                onClick={() => session.current?.start()}
              >
                EVERYONE IN? START THE NIGHT <Key>↵</Key>
              </button>
              <button className="text-button" onClick={leave}>
                return to the fire
              </button>
            </section>
          )}
          {screen === 'spectator' && (
            <Spectator
              snapshot={snapshot}
              follow={follow}
              onFollow={(id) => {
                setFollow(id);
                if (renderer.current) renderer.current.follow = id;
              }}
              crowd={crowd}
              onScream={() => session.current?.room.send('scream')}
              onLeave={leave}
            />
          )}
          {screen === 'match' && snapshot && (
            <Hud
              bindings={settings.keys}
              snapshot={snapshot}
              onPause={() => setPause(true)}
            />
          )}
          {screen === 'results' && snapshot && (
            <Results
              snapshot={snapshot}
              onReturn={leave}
              onWatch={() => void watch()}
              onQueue={() => void joinQueue()}
            />
          )}
          {screen === 'leaderboard' && <Leaderboard wallet={login?.wallet} />}
          {screen === 'token' && <Token />}
        </>
      )}
      {pause && (
        <div className="modal-backdrop">
          <Panel
            className="pause-panel"
            eyebrow="TAKE A BREATH"
            title="THE NIGHT CONTINUES."
          >
            <p>the match keeps running while you pause.</p>
            {leaveConfirm ? (
              <>
                <p>leave this match? your survivor will be taken.</p>
                <button className="primary danger" onClick={leave}>
                  LEAVE MATCH
                </button>
                <button onClick={() => setLeaveConfirm(false)}>
                  stay here
                </button>
              </>
            ) : (
              <>
                <button className="primary" onClick={() => setPause(false)}>
                  KEEP GOING <Key>ESC</Key>
                </button>
                <button
                  className="secondary"
                  onClick={() => setSettingsOpen(true)}
                >
                  SETTINGS
                </button>
                <button
                  className="text-button"
                  onClick={() => setLeaveConfirm(true)}
                >
                  leave the fairground
                </button>
              </>
            )}
          </Panel>
        </div>
      )}
      {settingsOpen && (
        <Settings
          value={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {walletOpen && (
        <WalletModal
          busy={busy}
          onClose={() => setWalletOpen(false)}
          onConnect={(name) => void connectWallet(name)}
        />
      )}
      {error && (
        <div role="alert" className="error-toast">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {showPerf && perf && (
        <div className="perf">
          {perf.fps} fps · {perf.calls} calls ·{' '}
          {Math.round(perf.triangles / 1000)}k tris · {perf.scale}×
        </div>
      )}
    </main>
  );
}
