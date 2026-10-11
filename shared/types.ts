import type { Spot } from './maps/rotten-hollow';
export type Role = 'survivor' | 'killer';
export type Health =
  'healthy' | 'injured' | 'downed' | 'carried' | 'caged' | 'taken' | 'escaped';
export type Phase = 'lobby' | 'playing' | 'finished';
export type Action =
  | 'repair'
  | 'heal'
  | 'pickup'
  | 'cage'
  | 'rescue'
  | 'gate'
  | 'kick'
  | 'drop'
  | 'break'
  | 'vault'
  | 'locker'
  | 'search';
export interface Input {
  seq: number;
  x: number;
  z: number;
  yaw: number;
  run: boolean;
  crouch: boolean;
  interact: boolean;
  time: number;
}
export interface Points {
  Survival: number;
  Repair: number;
  Rescue: number;
  Hunt: number;
}
export interface SkillCheck {
  id: string;
  startAt: number;
  zoneStart: number;
  zoneEnd: number;
  durationMs: number;
}
export interface Task {
  kind: Action;
  target: string;
  progress: number;
  duration: number;
}
export interface Player extends Spot {
  cosmetic?: 'ember';
  name: string;
  character: number;
  role: Role;
  health: Health;
  y: number;
  yaw: number;
  connected: boolean;
  bot: boolean;
  input: Input;
  inputAt: number;
  interactLatch: boolean;
  ack: number;
  points: Points;
  cages: number;
  cagedAt: number;
  cageId?: string;
  lastCage?: string;
  immuneUntil: number;
  bleedAt: number;
  boostUntil: number;
  stunUntil: number;
  attackUntil: number;
  lungeUntil: number;
  hushUntil: number;
  hushReady: number;
  screamUsed: boolean;
  screamAt: number;
  revealUntil: number;
  carrier?: string;
  struggle: number;
  locker?: string;
  task?: Task;
  skill?: SkillCheck;
  nextSkill: number;
  trailAt: number;
  chaseSince: number;
  chaseLast: number;
  history: { time: number; x: number; z: number }[];
}
export interface Generator extends Spot {
  progress: number;
  regressing: boolean;
}
export interface Gate extends Spot {
  progress: number;
  open: boolean;
}
export interface Pallet extends Spot {
  state: 'up' | 'down' | 'broken';
}
export interface GameEvent extends Spot {
  kind:
    | 'noise'
    | 'scream'
    | 'bell'
    | 'scratch'
    | 'blood'
    | 'hit'
    | 'power'
    | 'escape'
    | 'together'
    | 'take';
  at: number;
  until: number;
  player?: string;
}
export interface Match {
  lockers: Spot[];
  id: string;
  seed: number;
  now: number;
  startedAt: number;
  phase: Phase;
  required: number;
  players: Player[];
  generators: Generator[];
  gates: Gate[];
  pallets: Pallet[];
  events: GameEvent[];
  dawnAt: number;
  endedAt: number;
  reason: string;
}
export interface PublicPlayer {
  cosmetic?: 'ember';
  id: string;
  name: string;
  character: number;
  role: Role;
  health: Health;
  connected: boolean;
  cages: number;
  points: Points;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  cageRemaining?: number;
  action?: string;
  task?: Task;
  prompt?: Task;
  screamUsed?: boolean;
  hushReady?: number;
  hushUntil?: number;
  stunUntil?: number;
  attackUntil?: number;
  struggle?: number;
  hidden?: boolean;
  carrying?: boolean;
  boostUntil?: number;
  lungeUntil?: number;
  ack?: number;
  skill?: SkillCheck;
}
export interface Snapshot {
  lockers: Spot[];
  id: string;
  seed: number;
  now: number;
  startedAt: number;
  phase: Phase;
  required: number;
  players: PublicPlayer[];
  generators: Generator[];
  gates: Gate[];
  pallets: Pallet[];
  events: GameEvent[];
  dawnAt: number;
  endedAt: number;
  reason: string;
  self?: string;
  dread?: number;
  chase?: boolean;
}
export const terminal = (p: Pick<Player, 'health'>) =>
  p.health === 'taken' || p.health === 'escaped';
export const mobile = (p: Pick<Player, 'health'>) =>
  p.health === 'healthy' || p.health === 'injured';
