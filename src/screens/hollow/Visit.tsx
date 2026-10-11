import { useEffect, useRef, useState } from 'react';
import { H } from '../../../shared/config';
import type { HouseV1 } from '../../../shared/house/format';
import type { Frame, VisitState } from '../../../shared/house/simulation';
import { laneApi, compressFrames } from '../../lib/hollow-api';
import {
  Compass,
  Hotbar,
  EXPLORE_ITEMS,
  useHotbar,
  Terror,
  Segments,
  KeyCap,
  ItemIcon,
} from '../rework/ui';
import { useVoice, MicMeter } from '../rework/mic';
import { readHollowSettings } from '../../lib/hollow-settings';
import type { MicMark } from '../../../shared/house/mic';
import { VisitController } from '../../game/hollow/controller';
import { XProfileLink } from '../rework/XProfileLink';
export interface RunResult {
  outcome: VisitState['outcome'];
  ticks: number;
  frames: Frame[];
  seed: number;
  pos: { x: number; y: number; z: number };
  mic: MicMark[];
}
export function Visit({
  house,
  seed,
  onFinish,
  onExit,
  ticketId,
  autoStart = false,
  estimatedLoot = 0,
}: {
  house: HouseV1;
  seed: number;
  onFinish: (r: RunResult) => void;
  onExit: () => void;
  ticketId?: string;
  autoStart?: boolean;
  estimatedLoot?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<VisitController | null>(null),
    callbacks = useRef({ onFinish, onExit });
  const marks = useRef<MicMark[]>([]);
  const voice = useVoice((peak) => {
    const c = controller.current;
    if (
      c?.running &&
      c.state.tick - (marks.current.at(-1)?.tick ?? -Infinity) >=
        (H.MIC_COOLDOWN_MS / 1000) * H.TICK_HZ
    )
      marks.current.push({ tick: c.state.tick, peak });
  });
  const [selected, select] = useHotbar();
  callbacks.current = { onFinish, onExit };
  const [hud, setHud] = useState({
      battery: H.FLASHLIGHT_SECONDS as number,
      tick: 0,
      candy: false,
      hold: 0,
      locked: false,
      stamina: 100,
      yaw: Math.PI,
      x: 12.5,
      z: 2.5,
      nearest: Infinity,
      stashes: 0,
    }),
    [error, setError] = useState('');
  useEffect(() => {
    try {
      const c = new VisitController(
        host.current!,
        house,
        seed,
        (s, locked) =>
          setHud({
            battery: s.battery,
            tick: s.tick,
            candy: s.candy,
            hold: s.hold,
            locked,
            stamina: s.stamina,
            yaw: s.yaw,
            x: s.pos.x,
            z: s.pos.z,
            nearest: Math.min(
              Infinity,
              ...s.props
                .filter((p) => p.active >= 0)
                .map((p) => Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z)),
            ),
            stashes: s.stashes.size,
          }),
        (s, frames) =>
          callbacks.current.onFinish({
            outcome: s.outcome,
            ticks: s.tick,
            frames,
            seed,
            pos: { ...s.pos },
            mic: [...marks.current],
          }),
      );
      controller.current = c;
      if (autoStart) void c.lock();
      return () => {
        c.dispose();
        controller.current = null;
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'WebGL could not start');
    }
  }, [house, seed, autoStart]);
  useEffect(() => {
    controller.current?.selectItem(selected);
  }, [selected]);
  useEffect(() => {
    if (!ticketId) return;
    let sent = 0,
      pending = false;
    const timer = setInterval(async () => {
      const c = controller.current;
      if (!c || pending || c.frames.length <= sent) return;
      pending = true;
      try {
        const end = Math.min(sent + H.TICK_HZ * 2, c.frames.length);
        const ack = await laneApi<{ accepted: number }>('/stream', {
          id: ticketId,
          from: sent,
          frames: await compressFrames(c.frames.slice(sent, end)),
        });
        sent = ack.accepted;
      } catch {
        return;
      } finally {
        pending = false;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ticketId]);
  const seconds = Math.max(
    0,
    H.VISIT_LIMIT_S - Math.floor(hud.tick / H.TICK_HZ),
  );
  return (
    <div className="hl-visit">
      <div ref={host} className="hl-world" />
      <Terror
        distance={hud.nearest}
        heist={hud.candy}
        reduced={readHollowSettings().reducedFlash}
      />
      <div className="night-crosshair" />
      <Compass
        heading={((-hud.yaw * 180) / Math.PI + 360) % 360}
        markers={[
          {
            label: `GATE · ${Math.ceil(Math.hypot(hud.x - house.spawn.x - 0.5, hud.z - house.spawn.z - 0.5))}M`,
            bearing:
              ((Math.atan2(
                house.spawn.x + 0.5 - hud.x,
                -(house.spawn.z + 0.5 - hud.z),
              ) *
                180) /
                Math.PI +
                360) %
              360,
            color: '#e01b22',
          },
        ]}
      />
      <div className="night-hud-top">
        <div className="night-zone">
          {hud.candy ? 'ESCAPE BEFORE' : 'FIND THE STASH'}
        </div>
        <strong>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </strong>
        <p>{house.title}</p>
        <small>
          GATE ·{' '}
          {Math.ceil(
            Math.hypot(
              hud.x - house.spawn.x - 0.5,
              hud.z - house.spawn.z - 0.5,
            ),
          )}
          M
        </small>
      </div>
      <div className="night-bag">
        <ItemIcon name="sprite:bag" />
        <strong>{hud.candy ? estimatedLoot : 0}</strong>
        <small>
          {hud.candy ? 'NOT SAFE UNTIL YOU ESCAPE' : 'SEARCH THE HOUSE'}
        </small>
        <small>$SCREAM · SIMULATED · VERIFIED AFTER ESCAPE</small>
      </div>
      {hud.candy && (
        <div className="night-stash-title">
          <h1>STASH FOUND</h1>
          <small>
            {house.title} · {hud.stashes} STASH RECOVERED
          </small>
        </div>
      )}
      <div className="night-interaction hl-objective">
        <small>
          {hud.candy ? 'YOUR SHARE OF THE REMAINING REWARD' : 'CANDY STASH'}
        </small>
        {hud.candy ? (
          <>
            <strong className="candy-text">
              +{estimatedLoot} CANDY IF YOU ESCAPE
            </strong>
            <p>
              <KeyCap>SHIFT</KeyCap> RUN FOR THE GATE
            </p>
          </>
        ) : (
          <>
            <KeyCap>E</KeyCap>
            <strong>HOLD TO SEARCH</strong>
          </>
        )}
        <Segments
          value={hud.hold}
          max={H.CANDY_HOLD_S * H.TICK_HZ}
          count={20}
          label="Stash search progress"
        />
      </div>
      <Hotbar
        items={EXPLORE_ITEMS}
        selected={selected}
        onSelect={select}
        stamina={hud.stamina}
        bag={hud.candy ? estimatedLoot : 0}
      />
      <MicMeter voice={voice} />
      <div className="night-light-meter">
        <small>LANTERN · {Math.ceil(hud.battery)}S</small>
        <Segments
          value={hud.battery}
          max={H.FLASHLIGHT_SECONDS}
          label="Lantern battery"
        />
      </div>
      {!hud.locked && (
        <div className="hl-scrim">
          <section className="hl-panel hl-pause">
            <span className="hl-eyebrow">
              {hud.tick ? 'PAUSED' : 'ON THE OTHER SIDE'}
            </span>
            <h1>{hud.tick ? 'take a breath.' : house.title}</h1>
            <p>
              hold E at a stash chest. return to the entrance.
              <br />
              the house has other plans.
            </p>
            <div className="hl-control-grid">
              <span>
                W A S D <small>move</small>
              </span>
              <span>
                MOUSE <small>look</small>
              </span>
              <span>
                SPACE <small>jump</small>
              </span>
              <span>
                SHIFT <small>sprint</small>
              </span>
              <span>
                E <small>interact</small>
              </span>
              <span>
                F <small>flashlight</small>
              </span>
            </div>
            <button onClick={voice.toggle}>
              {voice.on ? 'DISABLE MICROPHONE' : 'ENABLE MICROPHONE (OPTIONAL)'}
            </button>
            <small>
              only scream timestamps and levels are saved. never audio.
            </small>
            {error && <p role="alert">{error}</p>}
            <button
              className="hl-primary"
              onClick={() =>
                controller.current
                  ?.lock()
                  .catch(() => setError('click again to allow mouse control'))
              }
            >
              {hud.tick ? 'RESUME' : 'STEP INSIDE'}
            </button>
            <button onClick={onExit}>BACK TO THE STREET</button>
            <XProfileLink />
          </section>
        </div>
      )}
    </div>
  );
}
