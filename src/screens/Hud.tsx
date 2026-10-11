import { C, CHARACTERS } from '../../shared/config';
import { distance } from '../../shared/geometry';
import type { Snapshot } from '../../shared/types';
import { Key, Meter, Icon, keyLabel } from '../components/ui';
export function Hud({
  snapshot: s,
  onPause,
  bindings,
}: {
  snapshot: Snapshot;
  onPause: () => void;
  bindings: Record<string, string>;
}) {
  const p = s.players.find((p) => p.id === s.self);
  if (!p) return null;
  const done = s.generators.filter((g) => g.progress >= 1).length;
  const near =
    p.x !== undefined
      ? s.generators.find(
          (g) =>
            g.progress < 1 &&
            distance({ x: p.x!, z: p.z! }, g) < C.INTERACT_RANGE,
        )
      : undefined;
  const task = p.task;
  const invite = s.events.some(
    (e) =>
      e.kind === 'scream' &&
      e.player !== p.id &&
      s.now - e.at < C.SCREAM_WINDOW_MS &&
      p.x !== undefined &&
      distance({ x: p.x, z: p.z! }, e) <= C.SCREAM_ALLY_RANGE,
  );
  const hurt = s.events.some(
    (e) => e.kind === 'hit' && e.player === p.id && s.now - e.at < 700,
  );
  const prompt =
    p.health === 'carried'
      ? 'STRUGGLE'
      : ((task ?? p.prompt)?.kind.toUpperCase() ??
        (near ? 'REPAIR' : 'INTERACT'));
  return (
    <div className={`hud ${p.role} ${hurt ? 'hit-feedback' : ''}`}>
      <div className="dread" style={{ opacity: s.dread ?? 0 }} />
      <div className="hud-objective">
        <p className="eyebrow">ROTTEN HOLLOW</p>
        <div className="objective-number">
          <Icon size={36} />
          <strong>{Math.max(0, s.required - done)}</strong>
          <span>
            GENERATORS
            <br />
            REMAIN
          </span>
        </div>
        <div className="gen-pips">
          {Array.from({ length: s.required }, (_, i) => (
            <i className={i < done ? 'complete' : ''} key={i} />
          ))}
        </div>
      </div>
      <div className="hud-top-right">
        <span className="tag">
          {p.role === 'killer' ? 'THE HOLLOW' : CHARACTERS[p.character]}
        </span>
        <button onClick={onPause}>
          PAUSE <Key>ESC</Key>
        </button>
      </div>
      {s.dawnAt > 0 && (
        <div className="dawn">
          <span>DAWN COLLAPSE</span>
          <strong>{Math.ceil(Math.max(0, s.dawnAt - s.now) / 1000)}</strong>
          <p>the fairground is closing.</p>
        </div>
      )}
      <div className="teammates">
        {s.players
          .filter((p) => p.role === 'survivor')
          .map((ally) => (
            <div className={`teammate ${ally.health}`} key={ally.id}>
              <div className="portrait">
                {ally.health === 'taken' ? (
                  <Icon kind="skull" />
                ) : (
                  <img src={`/assets/portraits/${ally.character}.png`} alt="" />
                )}
              </div>
              <div>
                <b>
                  {ally.name}
                  {ally.id === p.id ? ' · you' : ''}
                </b>
                <span>
                  {ally.health}
                  {!ally.connected ? ' · disconnected' : ''}
                </span>
                {ally.cageRemaining !== undefined && (
                  <Meter value={ally.cageRemaining / (C.CAGE_STAGE_MS * 2)} />
                )}
              </div>
              <div className="cage-marks">{'Ⅰ'.repeat(ally.cages)}</div>
            </div>
          ))}
      </div>
      {p.health === 'taken' || p.health === 'escaped' ? (
        <div className="center-message">
          <h2>
            {p.health === 'escaped'
              ? 'YOU MADE IT OUT.'
              : 'THE HOLLOW GOT YOU.'}
          </h2>
          <p>the others are still in there.</p>
        </div>
      ) : (
        <>
          <div className="crosshair" />
          <div className="interaction">
            <p>
              <Key>{keyLabel(bindings.interact)}</Key> HOLD · {prompt}
            </p>
            {task && <Meter value={task.progress} />}
            <small>
              {task
                ? 'keep holding. every second counts.'
                : 'stay close. keep your eyes open.'}
            </small>
          </div>
        </>
      )}
      {p.skill && (
        <SkillRing skill={p.skill} now={s.now} binding={bindings.skill} />
      )}
      {invite && !p.screamUsed && (
        <div className="scream-invite">
          <Key>{keyLabel(bindings.scream)}</Key> THEY’RE SCREAMING. JOIN THEM.
        </div>
      )}
      <div className="ability">
        {p.role === 'survivor' ? (
          <>
            <div className={`ability-key ${p.screamUsed ? 'spent' : ''}`}>
              <Key>{keyLabel(bindings.scream)}</Key>
              <Icon kind="skull" size={32} />
            </div>
            <div>
              <h3>SCREAM TOGETHER</h3>
              <p>
                {p.screamUsed
                  ? 'your voice is spent.'
                  : 'one voice is a warning. two are a weapon.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="ability-key">
              <Key>RMB</Key>
              <Icon kind="skull" size={32} />
            </div>
            <div>
              <h3>HUSH</h3>
              <p>
                {(p.hushReady ?? 0) > s.now
                  ? `${Math.ceil(((p.hushReady ?? 0) - s.now) / 1000)}s until silence`
                  : '10 seconds. let them listen for nothing.'}
              </p>
            </div>
          </>
        )}
      </div>
      {p.role === 'killer' && (p.stunUntil ?? 0) > s.now && (
        <div className="stunned">
          <h2>THEY FOUND THEIR VOICE.</h2>
        </div>
      )}
      <div className="bottom-hints">
        <Key>WASD</Key> move <Key>{keyLabel(bindings.walk)}</Key> walk{' '}
        <Key>{keyLabel(bindings.crouch)}</Key> crouch{' '}
        {p.role === 'killer' && (
          <>
            <Key>LMB</Key> lunge
          </>
        )}
      </div>
    </div>
  );
}
function SkillRing({
  skill: s,
  now,
  binding,
}: {
  skill: NonNullable<Snapshot['players'][number]['skill']>;
  now: number;
  binding: string;
}) {
  const fraction = Math.max(0, Math.min(1, (now - s.startAt) / s.durationMs));
  return (
    <div className="skill-check">
      <div
        className="skill-ring"
        style={{
          background: `conic-gradient(from -90deg, transparent 0deg ${s.zoneStart * 360}deg, #ede6d8 ${s.zoneStart * 360}deg ${s.zoneEnd * 360}deg,transparent ${s.zoneEnd * 360}deg)`,
        }}
      >
        <i style={{ transform: `rotate(${fraction * 360 - 90}deg)` }} />
        <div>
          <Key>{keyLabel(binding)}</Key>
        </div>
      </div>
      <p>steady hands.</p>
    </div>
  );
}
