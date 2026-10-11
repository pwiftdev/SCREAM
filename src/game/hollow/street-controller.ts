import {
  WEAPONS,
  WEAPON_SITES,
  type Weapon,
} from '../../../shared/house/combat';
import { plotTier } from '../../../shared/house/plots';
import { assetModel } from '../rework/asset-pack';
import { CameraMotion } from '../camera-motion';
import { OutdoorEncounters } from '../rework/outdoor-encounters';
import { EncounterActors } from '../rework/encounter-actors';
import { terrainHeight } from '../../../shared/house/terrain';
import * as T from 'three';
import { nearestSearch, staminaStep } from '../../../shared/house/rework';
import { disposeGroup } from './dispose';
import { Client, type Room } from '@colyseus/sdk';
import { H } from '../../../shared/config';
import type { StreetGhost } from '../../../server/hollow/StreetRoom';
import { endpoint } from '../session';
import { HollowRenderer } from './renderer';
import { maskedCharacter } from '../rework/pixels';
import { streetScene } from './street';
import {
  moveStreet,
  nearestDoor,
  worldBlocked,
  plotLocation,
} from '../../../shared/house/neighborhood';
import { decodeHouse, type HouseWire } from '../../../shared/house/format';
import {
  laneApi,
  laneSession,
  type Door,
  type OwnHouse,
} from '../../lib/hollow-api';
import { meshHouse } from './mesher';
import { readHollowSettings } from '../../lib/hollow-settings';
import { hollowAudio } from '../../lib/hollow-audio';
export interface StreetView {
  health: number;
  kills: number;
  deaths: number;
  respawn: number;
  shovel: boolean;
  hurt: boolean;
  connected: boolean;
  walking: boolean;
  count: number;
  slot: number;
  distance: number;
  x: number;
  z: number;
  notice: string;
  yaw: number;
  stamina: number;
  carried: number;
  bank: number;
  hold: number;
  search: string;
  nearest: number;
  peers: { name: string; distance: number }[];
}
export class StreetController {
  readonly renderer: HollowRenderer;
  private room?: Room;
  private abort = new AbortController();
  private raf = 0;
  private last = 0;
  private sendAt = 0;
  private keys = new Set<string>();
  private yaw = Math.PI;
  private settings = readHollowSettings();
  private pitch = 0;
  private walking = false;
  private closed = false;
  private targets: StreetGhost[] = [];
  private poses = new Map<string, T.Vector3>();
  private characters = new Map<string, ReturnType<typeof maskedCharacter>>();
  private labels = new Map<string, T.Sprite>();
  private plots: T.Group[] = [];
  private doors: Door[] = [];
  private loaded = new Map<number, string>();
  private fetching = new Set<number>();
  private notice = '';
  private stamina = 100;
  private carried = 0;
  private bank = 0;
  private hold = 0;
  private found = new Set<string>();
  private noticeUntil = 0;
  private motion = new CameraMotion();
  private encounters: OutdoorEncounters;
  private encounterActors: EncounterActors;
  private lanternOn = true;
  private selectedItem = 0;
  private health = 100;
  private kills = 0;
  private deaths = 0;
  private deadUntil = 0;
  private shovel = false;
  private hurtUntil = 0;
  private attackAt = 0;
  private connected = false;
  private occupied = new Set<number>();
  private homeSlot?: number;
  constructor(
    host: HTMLElement,
    private onState: (view: StreetView) => void,
    private onDoor: (slot: number) => void,
    private street = 0,
    private onPlot: (slot: number) => void = () => {},
  ) {
    const r = (this.renderer = new HollowRenderer(host));
    this.plots = streetScene(r, street);
    this.encounterActors = new EncounterActors(r.world);
    this.encounters = new OutdoorEncounters(
      worldBlocked,
      terrainHeight,
      (cue, p) => {
        hollowAudio.encounter(cue, p);
        if (cue === 'impact') this.motion.jolt();
      },
    );
    r.camera.position.set(
      H.WORLD_SPAWN_X,
      terrainHeight(H.WORLD_SPAWN_X, H.WORLD_SPAWN_Z) + H.EYE,
      H.WORLD_SPAWN_Z,
    );
    r.camera.rotation.set(0, this.yaw, 0, 'YXZ');
    const { signal } = this.abort;
    const configure = () => {
      this.settings = readHollowSettings();
    };
    configure();
    window.addEventListener('hollow-settings', configure, { signal });
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target instanceof HTMLElement &&
          e.target.matches('input,textarea,select')
        )
          return;
        if (e.code === 'Escape') {
          this.pause();
          return;
        }
        if (!this.walking) return;
        if (e.code === this.settings.keys.use && !e.repeat) {
          this.interact();
        }
        if (e.code === 'KeyQ' && !e.repeat) this.scream();
        if (e.code === this.settings.keys.flash && !e.repeat) {
          this.lanternOn = !this.lanternOn;
          this.selectItem(this.selectedItem);
        }
        if (
          ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyQ', 'Space'].includes(
            e.code,
          )
        )
          e.preventDefault();
        this.keys.add(e.code);
      },
      { signal },
    );
    r.gl.domElement.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button === 0) this.attack();
      },
      { signal },
    );
    r.gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault(), {
      signal,
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), {
      signal,
    });
    window.addEventListener('blur', () => this.pause(), { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.pause();
      },
      { signal },
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (document.pointerLockElement !== r.gl.domElement) this.pause();
      },
      { signal },
    );
    document.addEventListener(
      'mousemove',
      (e) => {
        if (
          !this.walking ||
          (document.pointerLockElement !== r.gl.domElement && e.buttons !== 1)
        )
          return;
        this.yaw = Math.atan2(
          Math.sin(
            this.yaw -
              e.movementX * H.MOUSE_SENSITIVITY * this.settings.sensitivity,
          ),
          Math.cos(
            this.yaw -
              e.movementX * H.MOUSE_SENSITIVITY * this.settings.sensitivity,
          ),
        );
        this.pitch = Math.max(
          -1.3,
          Math.min(
            1.3,
            this.pitch -
              e.movementY * H.MOUSE_SENSITIVITY * this.settings.sensitivity,
          ),
        );
      },
      { signal },
    );
    void new Client(endpoint())
      .joinOrCreate('street', {
        token: laneSession(),
        street: this.street,
      })
      .then((room) => {
        if (this.closed) {
          void room.leave();
          return;
        }
        this.room = room;
        this.connected = true;
        room.onMessage('spawn', (p: StreetGhost & { shovel: boolean }) => {
          r.camera.position.set(p.x, terrainHeight(p.x, p.z) + H.EYE, p.z);
          this.yaw = p.yaw;
          this.health = p.health;
          this.shovel = p.shovel;
          this.motion.reset();
          this.encounters.cancel();
        });
        room.onMessage('notice', (message: string) => {
          this.notice = message;
          this.noticeUntil = performance.now() + 3500;
        });
        room.onMessage(
          'combat',
          (event: {
            attacker: string;
            target?: string;
            killed: boolean;
            x: number;
            z: number;
          }) => {
            if (
              Math.hypot(
                event.x - r.camera.position.x,
                event.z - r.camera.position.z,
              ) < 20
            )
              hollowAudio.combat(!!event.target, event);
            if (event.target === room.sessionId) {
              this.hurtUntil = performance.now() + 500;
              this.motion.jolt();
            }
            if (event.attacker === room.sessionId && event.target) {
              this.notice = event.killed
                ? 'They fell. Keep moving.'
                : 'Hit confirmed';
              this.noticeUntil = performance.now() + 1800;
            }
          },
        );
        room.onLeave(() => {
          this.connected = false;
          this.pause();
          this.notice = 'Disconnected. Reload to rejoin the world.';
          this.noticeUntil = Infinity;
        });
        room.onMessage(
          'outdoor',
          (v: {
            stamina: number;
            carried: number;
            bank: number;
            banked: number;
            hold: number;
            found: string[];
            loot?: number;
            shovel: boolean;
          }) => {
            this.stamina = v.stamina;
            this.shovel = v.shovel;
            this.carried = v.carried;
            this.bank = v.bank;
            if (v.banked) {
              this.notice = `${v.banked} LOOSE CANDY BANKED AT THE LANTERN GATE`;
              this.noticeUntil = performance.now() + 4000;
              hollowAudio.cue('bank');
            }
            this.hold = v.hold;
            this.found = new Set(v.found);
            if (v.loot) {
              this.notice = `+${v.loot} CANDY · LOOSE CANDY FOUND`;
              this.noticeUntil = performance.now() + 3000;
              hollowAudio.cue('loot');
            }
          },
        );
        room.onMessage('street', (ghosts: StreetGhost[]) => {
          this.targets = ghosts;
          const self = ghosts.find((g) => g.id === room.sessionId),
            pos = r.camera.position;
          if (self) {
            this.health = self.health;
            this.kills = self.kills;
            this.deaths = self.deaths;
            this.deadUntil = self.deadUntil;
          }
          if (self && Math.hypot(pos.x - self.x, pos.z - self.z) > 2) {
            pos.x = self.x;
            pos.z = self.z;
          }
        });
        room.onMessage(
          'scream',
          (p: { id: string; x: number; z: number; name: string }) => {
            hollowAudio.scare({
              x: p.x,
              y: terrainHeight(p.x, p.z) + H.EYE,
              z: p.z,
            });
            this.notice =
              p.id === room.sessionId
                ? 'your scream echoes down the lane.'
                : `${p.name} screamed nearby.`;
            this.noticeUntil = performance.now() + 2500;
          },
        );
        room.onError(() => {
          this.notice = 'street connection interrupted';
          this.noticeUntil = Infinity;
        });
        room.send('sync');
      })
      .catch(() => {
        this.notice =
          'World connection unavailable. Reload after checking the local server.';
        this.noticeUntil = Infinity;
      });
    this.raf = requestAnimationFrame(this.loop);
  }
  scream() {
    this.room?.send('scream');
  }
  selectItem(n: number) {
    this.selectedItem = n;
    this.renderer.selectItem([0, 6, 7, 4][n] ?? 0);
    if (n === 1 || (n === 2 && this.shovel))
      this.room?.send('equip', n === 1 ? 'crowbar' : 'shovel');
    this.renderer.flash.visible = n === 0 && this.lanternOn;
    this.renderer.held.userData.lightEnabled(this.lanternOn);
  }
  setWorldPlots(plots: { slot: number }[], homeSlot?: number) {
    this.occupied = new Set(plots.map((p) => p.slot));
    this.homeSlot = homeSlot;
  }
  interact() {
    if (!this.walking || !this.connected || this.health <= 0) return;
    const p = this.renderer.camera.position,
      door = nearestDoor(p);
    if (
      !this.shovel &&
      WEAPON_SITES.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 2.5)
    ) {
      this.room?.send('pickup');
      return;
    }
    if (door.distance > H.DOOR_REACH) return;
    if (
      door.slot === this.homeSlot ||
      (!this.occupied.has(door.slot) && plotTier(door.slot) === 0)
    ) {
      this.pause();
      this.onPlot(door.slot);
      return;
    }
    if (this.doors.some((d) => d.slot === door.slot)) {
      this.pause();
      this.onDoor(door.slot);
    }
  }
  private attack() {
    if (
      !this.walking ||
      !this.connected ||
      this.health <= 0 ||
      ![1, 2].includes(this.selectedItem) ||
      (this.selectedItem === 2 && !this.shovel)
    )
      return;
    const weapon: Weapon = this.selectedItem === 1 ? 'crowbar' : 'shovel',
      now = performance.now();
    if (now < this.attackAt || this.stamina < WEAPONS[weapon].cost) return;
    this.attackAt = now + WEAPONS[weapon].cooldown;
    this.renderer.held.userData.strike(now / 1000);
    this.room?.send('attack');
  }
  async walk() {
    this.walking = true;
    try {
      await this.renderer.gl.domElement.requestPointerLock();
    } catch {
      return;
    }
  }
  pause() {
    this.walking = false;
    this.keys.clear();
    this.motion.reset();
    this.encounters.cancel();
    hollowAudio.endEncounter();
    if (document.pointerLockElement === this.renderer.gl.domElement)
      document.exitPointerLock();
  }
  setOwnHouse(own: OwnHouse | null) {
    if (!own?.plot || Math.floor(own.plot.slot / 40) !== this.street) return;
    const group = this.plots[own.plot.slot % 40];
    disposeGroup(group, this.renderer.atlas.material);
    group.clear();
    group.add(
      meshHouse(decodeHouse(own.house, true), this.renderer.atlas.material),
    );
  }
  setDoors(doors: Door[]) {
    this.doors = doors;
  }
  private loadNearby() {
    const pos = this.renderer.camera.position;
    for (const d of this.doors) {
      const slot = d.slot,
        p = plotLocation(slot);
      if (slot < 0 || slot >= H.PLOTS_PER_STREET || slot === this.homeSlot)
        continue;
      if (
        Math.hypot(pos.x - p.door.x, pos.z - p.door.z) > 45 ||
        this.loaded.get(slot) === d.hash ||
        this.fetching.has(slot)
      )
        continue;
      this.fetching.add(slot);
      void laneApi<{ house: HouseWire }>(`/houses/${d.code}`)
        .then((data) => {
          if (this.closed) return;
          const group = this.plots[slot];
          disposeGroup(group, this.renderer.atlas.material);
          group.clear();
          group.add(
            meshHouse(decodeHouse(data.house), this.renderer.atlas.material),
          );
          this.loaded.set(slot, d.hash);
        })
        .catch(() => {
          this.notice = 'a house could not load. try its door again.';
          this.noticeUntil = performance.now() + 2500;
        })
        .finally(() => this.fetching.delete(slot));
    }
  }
  private ghosts(time: number, dt: number) {
    const seen = new Set<string>();
    for (const g of this.targets) {
      if (g.id === this.room?.sessionId) continue;
      seen.add(g.id);
      let p = this.poses.get(g.id);
      if (!p) {
        p = new T.Vector3(g.x, terrainHeight(g.x, g.z), g.z);
        this.poses.set(g.id, p);
      }
      const destination = new T.Vector3(g.x, terrainHeight(g.x, g.z), g.z);
      if (p.distanceTo(destination) > 12) p.copy(destination);
      else p.lerp(destination, 1 - Math.exp(-H.GHOST_LERP * dt));
      p.y = terrainHeight(p.x, p.z);
      let actor = this.characters.get(g.id);
      if (!actor) {
        actor = maskedCharacter(true);
        this.characters.set(g.id, actor);
        this.renderer.world.add(actor.root);
      }
      if (actor.root.position.distanceTo(p) > 12) actor.root.position.copy(p);
      const moving = g.health > 0 && actor.root.position.distanceTo(p) > 0.01;
      if (actor.root.userData.weapon !== g.weapon) {
        const old = actor.root.getObjectByName('rival-weapon');
        old?.removeFromParent();
        const item = assetModel(WEAPONS[g.weapon].asset);
        item.name = 'rival-weapon';
        item.position.set(0, -0.5, 0);
        item.scale.setScalar(0.8);
        (actor.root.getObjectByName('pivot_armR') ?? actor.root).add(item);
        actor.root.userData.weapon = g.weapon;
      }
      actor.root.position.copy(p);
      actor.root.rotation.y = g.yaw + Math.PI;
      actor.animate(time, moving);
      actor.root.rotation.z = g.health > 0 ? 0 : Math.PI / 2;
      const arm = actor.root.getObjectByName('pivot_armR');
      if (arm && g.attackAt > Date.now())
        arm.rotation.x -=
          Math.sin(
            ((g.attackAt - Date.now()) / WEAPONS[g.weapon].cooldown) * Math.PI,
          ) * 1.7;
      let label = this.labels.get(g.id);
      if (!label) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 32;
        const c = canvas.getContext('2d')!;
        c.font = '20px Silkscreen';
        c.textAlign = 'center';
        c.fillStyle = '#aac9be';
        c.fillText(g.name, 128, 24);
        label = new T.Sprite(
          new T.SpriteMaterial({
            map: new T.CanvasTexture(canvas),
            transparent: true,
            depthTest: true,
          }),
        );
        label.scale.set(2, 0.25, 1);
        this.renderer.world.add(label);
        this.labels.set(g.id, label);
      }
      label.position.set(p.x, p.y + 2.3, p.z);
    }
    for (const [id, label] of this.labels)
      if (!seen.has(id)) {
        label.material.map?.dispose();
        label.material.dispose();
        this.renderer.world.remove(label);
        this.labels.delete(id);
        this.poses.delete(id);
        const actor = this.characters.get(id);
        if (actor) {
          disposeGroup(actor.root);
          this.renderer.world.remove(actor.root);
          this.characters.delete(id);
        }
      }
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const forward = this.walking
        ? Number(this.keys.has(this.settings.keys.forward)) -
          Number(this.keys.has(this.settings.keys.back))
        : 0,
      side = this.walking
        ? Number(this.keys.has(this.settings.keys.right)) -
          Number(this.keys.has(this.settings.keys.left))
        : 0;
    const c = this.renderer.camera;
    if (this.walking && this.connected && this.health > 0) {
      const sprint = this.keys.has('ShiftLeft') && this.stamina > 0;
      moveStreet(c.position, { forward, side, yaw: this.yaw, sprint }, dt);
      this.stamina = staminaStep(this.stamina, sprint, !!(forward || side), dt);
    }
    const ground = terrainHeight(c.position.x, c.position.z);
    const allowed =
      this.walking &&
      this.health > 0 &&
      !document.hidden &&
      this.settings.creatureScares &&
      !this.keys.has(this.settings.keys.use) &&
      nearestDoor(c.position).distance > H.DOOR_REACH + 2 &&
      Math.hypot(
        c.position.x - H.WORLD_SPAWN_X,
        c.position.z - H.WORLD_SPAWN_Z,
      ) > 14;
    this.encounters.step(
      dt,
      c.position,
      this.yaw,
      this.pitch,
      allowed,
      this.settings.reducedFlash,
    );
    if (!allowed || this.settings.reducedFlash) hollowAudio.endEncounter();
    else if (this.encounters.current)
      hollowAudio.moveEncounter(this.encounters.current);
    const motion = this.motion.sample(
      { x: c.position.x, y: ground, z: c.position.z },
      'healthy',
      dt,
      this.settings.reducedFlash || !this.walking,
    );
    const strength = this.settings.cameraMotion;
    c.position.y = T.MathUtils.damp(
      c.position.y,
      ground + (this.health > 0 ? H.EYE : 0.5) + motion.lift * strength,
      22,
      dt,
    );
    c.rotation.set(
      this.pitch + motion.kick * strength,
      this.yaw,
      motion.roll * strength,
      'YXZ',
    );
    this.encounterActors.update(this.encounters.current, c, now / 1000);
    if (now - this.sendAt >= 1000 / H.STREET_HZ) {
      this.sendAt = now;
      this.room?.send('move', {
        forward,
        side,
        yaw: this.yaw,
        sprint: this.keys.has('ShiftLeft'),
        use: this.keys.has(this.settings.keys.use),
      });
      const door = nearestDoor(c.position);
      this.onState({
        health: this.health,
        kills: this.kills,
        deaths: this.deaths,
        respawn: Math.max(0, Math.ceil((this.deadUntil - Date.now()) / 1000)),
        shovel: this.shovel,
        hurt: performance.now() < this.hurtUntil,
        connected: this.connected,
        yaw: this.yaw,
        stamina: this.stamina,
        carried: this.carried,
        bank: this.bank,
        hold: this.hold,
        search: nearestSearch(c.position, this.yaw, this.found)?.name ?? '',
        nearest: Math.min(
          Infinity,
          ...this.targets
            .filter((g) => g.id !== this.room?.sessionId)
            .map((g) => Math.hypot(g.x - c.position.x, g.z - c.position.z)),
        ),
        peers: this.targets
          .filter((g) => g.id !== this.room?.sessionId)
          .slice(0, 3)
          .map((g) => ({
            name: g.name,
            distance: Math.hypot(g.x - c.position.x, g.z - c.position.z),
          })),
        walking: this.walking,
        count: this.targets.length,
        slot: door.slot,
        distance: door.distance,
        x: c.position.x,
        z: c.position.z,
        notice: now < this.noticeUntil ? this.notice : '',
      });
      this.loadNearby();
      hollowAudio.worldView(
        c.position,
        this.yaw,
        this.health > 0 && !!(forward || side),
      );
    }

    this.renderer.held.userData.animate?.(now / 1000);
    this.ghosts(now / 1000, dt);
    this.renderer.draw(now / 1000);
    this.raf = requestAnimationFrame(this.loop);
  };
  dispose() {
    this.closed = true;
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    void this.room?.leave();
    hollowAudio.endEncounter();
    this.encounterActors.dispose();
    this.renderer.dispose();
  }
}
