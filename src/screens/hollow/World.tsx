import { useEffect, useRef, useState } from 'react';
import {
  StreetController,
  type StreetView,
} from '../../game/hollow/street-controller';
import { H } from '../../../shared/config';
import { plotLocation } from '../../../shared/house/neighborhood';
import { plotTier } from '../../../shared/house/plots';
import { WEAPON_SITES } from '../../../shared/house/combat';
import { HeldWorldMap } from './HeldWorldMap';
import type { Door, OwnHouse } from '../../lib/hollow-api';
import { hollowAudio } from '../../lib/hollow-audio';
import { readHollowSettings } from '../../lib/hollow-settings';
import {
  Compass,
  Hotbar,
  useHotbar,
  Terror,
  Segments,
  KeyCap,
} from '../rework/ui';
import { useVoice, MicMeter } from '../rework/mic';
const ITEMS = [
  { name: 'Lantern', texture: 'sprite:lantern' },
  { name: 'Crowbar', texture: 'sprite:crowbar' },
  { name: 'Grave shovel', texture: 'sprite:shovel' },
  { name: 'Map', texture: 'sprite:map' },
];
export function World({
  entered,
  active,
  doors,
  plots,
  onDoor,
  onPlot,
  onMenu,
  homeSlot,
  ownHouse,
  street = 0,
}: {
  entered: boolean;
  active: boolean;
  doors: Door[];
  plots: { slot: number; code: string }[];
  onDoor: (slot: number) => void;
  onPlot: (slot: number) => void;
  onMenu: () => void;
  homeSlot?: number;
  ownHouse?: OwnHouse | null;
  street?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<StreetController | null>(null),
    callbacks = useRef({ onDoor, onPlot });
  callbacks.current = { onDoor, onPlot };
  const [view, setView] = useState<StreetView>({
    walking: false,
    count: 0,
    slot: -1,
    distance: Infinity,
    x: H.WORLD_SPAWN_X,
    z: H.WORLD_SPAWN_Z,
    district: 'Lost in the dark',
    notice: '',
    yaw: Math.PI,
    stamina: 100,
    carried: 0,
    bank: 0,
    hold: 0,
    search: '',
    nearest: Infinity,
    peers: [],
    health: 100,
    kills: 0,
    deaths: 0,
    respawn: 0,
    shovel: false,
    hurt: false,
    connected: false,
  });
  const [map, setMap] = useState(false),
    [error, setError] = useState('');
  const [selected, select] = useHotbar(active && !map, 4),
    voice = useVoice(
      () => controller.current?.scream(),
      active && view.health > 0,
    );
  useEffect(() => {
    try {
      const c = new StreetController(
        host.current!,
        setView,
        (s) => callbacks.current.onDoor(s),
        street,
        (s) => callbacks.current.onPlot(s),
      );
      controller.current = c;
      return () => {
        c.dispose();
        controller.current = null;
      };
    } catch (e) {
      setError((e as Error).message);
    }
  }, [street]);
  useEffect(() => controller.current?.setDoors(doors), [doors]);
  useEffect(
    () => controller.current?.setOwnHouse(ownHouse ?? null),
    [ownHouse],
  );
  useEffect(
    () => controller.current?.setWorldPlots(plots, homeSlot),
    [plots, homeSlot],
  );
  useEffect(() => {
    if (active && !map) {
      void controller.current?.walk();
      hollowAudio.street();
    } else controller.current?.pause();
  }, [active, map]);
  useEffect(() => {
    if (selected === 2 && !view.shovel) select(1);
  }, [selected, view.shovel, select]);
  useEffect(() => {
    controller.current?.selectItem(selected);
    if (selected === 3) setMap(true);
  }, [selected]);
  useEffect(() => {
    if (controller.current) controller.current.renderer.held.visible = !map;
    if (map && view.health <= 0) {
      setMap(false);
      select(0);
    }
  }, [map, selected, view.health, select]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !active ||
        e.repeat ||
        (e.target instanceof HTMLElement && e.target.matches('input,textarea'))
      )
        return;
      if (e.code === 'KeyM') {
        setMap(!map);
        select(map ? 0 : 3);
      }
      if (e.code === 'Escape') {
        if (map) {
          setMap(false);
          select(0);
        } else onMenu();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, map, onMenu, select]);
  const door = doors.find((d) => d.slot === view.slot),
    own = view.slot === homeSlot;
  const free =
    view.slot >= 0 &&
    !plots.some((p) => p.slot === view.slot) &&
    plotTier(view.slot) === 0;
  const pickup =
    !view.shovel &&
    WEAPON_SITES.some((p) => Math.hypot(p.x - view.x, p.z - view.z) < 2.5);
  const atBank =
    Math.hypot(view.x - H.WORLD_SPAWN_X, view.z - H.WORLD_SPAWN_Z) < 4 &&
    view.carried > 0;
  const interaction = pickup
    ? 'TAKE GRAVE SHOVEL'
    : own
      ? 'BUILD YOUR HOUSE'
      : free
        ? 'CLAIM PLOT · FREE'
        : door
          ? 'ENTER HAUNTED HOUSE'
          : '';
  const bearing = (x: number, z: number) =>
    ((Math.atan2(x - view.x, -(z - view.z)) * 180) / Math.PI + 360) % 360;
  const nearestFree = Array.from({ length: 40 }, (_, i) => i)
    .filter((i) => plotTier(i) === 0 && !plots.some((p) => p.slot === i))
    .sort(
      (a, b) =>
        Math.hypot(
          plotLocation(a).door.x - view.x,
          plotLocation(a).door.z - view.z,
        ) -
        Math.hypot(
          plotLocation(b).door.x - view.x,
          plotLocation(b).door.z - view.z,
        ),
    )[0];
  const markers = [
    ...(homeSlot !== undefined
      ? [{ label: 'HOME', ...plotLocation(homeSlot % 40).door }]
      : nearestFree !== undefined
        ? [{ label: 'FREE PLOT', ...plotLocation(nearestFree).door }]
        : []),
    ...(!view.shovel
      ? [
          {
            label: 'SHOVEL',
            ...[...WEAPON_SITES].sort(
              (a, b) =>
                Math.hypot(a.x - view.x, a.z - view.z) -
                Math.hypot(b.x - view.x, b.z - view.z),
            )[0],
          },
        ]
      : []),
  ].map((p) => ({ label: p.label, bearing: bearing(p.x, p.z) }));
  return (
    <>
      <div className="hl-world" ref={host} />
      {entered && (
        <>
          <Terror
            distance={view.nearest}
            reduced={readHollowSettings().reducedFlash}
          />
          {view.hurt && !readHollowSettings().reducedFlash && (
            <div className="world-hurt" />
          )}
          <div className="night-crosshair" />
          <Compass
            heading={((-view.yaw * 180) / Math.PI + 360) % 360}
            markers={markers}
          />
          <div className="night-hud-top">
            <small>{view.count} ON THE STREET</small>
          </div>
          <div className="world-vitals">
            <Segments value={view.health} color="blood" label="Health" />
            <b>{view.health} HEALTH</b>
            <small>
              {view.kills} KILLS · {view.deaths} DEATHS
            </small>
            <small>
              {view.carried} LOOSE CANDY · {view.bank} BANKED
            </small>
          </div>
          <div className="world-controls">
            1 LANTERN · 2 CROWBAR · 3 SHOVEL
            <br />
            LMB STRIKE · E INTERACT · Q SCREAM · M MAP
          </div>
          {view.notice && (
            <p className="hl-world-notice" role="status">
              {view.notice}
            </p>
          )}
          {view.health > 0 &&
            (pickup ||
              atBank ||
              view.search ||
              (interaction && view.distance < 8)) && (
              <div className="night-interaction">
                <small>
                  {pickup
                    ? 'LEFT BEHIND BY SOMEONE'
                    : atBank
                      ? 'THE LANTERN GATE'
                      : view.search || door?.title || `PLOT ${view.slot + 1}`}
                </small>
                <button
                  disabled={
                    !view.connected ||
                    (!pickup &&
                      !view.search &&
                      !atBank &&
                      view.distance > H.DOOR_REACH)
                  }
                  onClick={() => controller.current?.interact()}
                >
                  <KeyCap>E</KeyCap>
                  <strong>
                    {pickup
                      ? interaction
                      : atBank
                        ? 'HOLD E TO BANK'
                        : view.search
                          ? 'HOLD TO SEARCH'
                          : interaction}
                  </strong>
                </button>
                <Segments
                  value={view.hold}
                  max={1.6}
                  count={20}
                  label="Search progress"
                />
              </div>
            )}
          <Hotbar
            slots={4}
            items={ITEMS.map((item, i) =>
              i === 2
                ? {
                    ...item,
                    name: view.shovel ? 'Grave shovel' : 'Shovel · find one',
                    count: view.shovel ? 1 : 0,
                  }
                : item,
            )}
            selected={selected}
            onSelect={select}
            stamina={view.stamina}
            bag={view.carried}
          />
          <MicMeter voice={voice} />
          {view.health <= 0 && (
            <div className="world-death">
              <h1>THE NIGHT TOOK YOU</h1>
              <p>Returning somewhere far away in {view.respawn}s</p>
              <small>Loose candy and found weapons were lost.</small>
            </div>
          )}
          {active && !view.connected && !view.notice && (
            <div className="hl-world-resume" role="status">
              JOINING THE NIGHT…
            </div>
          )}
          {active &&
            view.connected &&
            !view.walking &&
            !map &&
            view.health > 0 && (
              <div className="hl-world-resume">
                <button
                  className="hl-primary"
                  onClick={() => void controller.current?.walk()}
                >
                  CONTINUE EXPLORING
                </button>
              </div>
            )}
          {map && (
            <HeldWorldMap
              occupied={plots.map((p) => p.slot)}
              home={homeSlot}
              position={view}
              onClose={() => {
                setMap(false);
                select(0);
              }}
            />
          )}
        </>
      )}
      {error && (
        <div className="hl-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
