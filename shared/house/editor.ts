import { NIGHT } from './rework';
import { H } from '../config';
import { B } from './blocks';
import {
  cloneHouse,
  stashPositions,
  index,
  inside,
  put,
  rotate,
  type HouseV1,
  type Vec3i,
} from './format';
export class HouseEditor {
  house: HouseV1;
  private undoStack: HouseV1[] = [];
  private redoStack: HouseV1[] = [];
  constructor(house: HouseV1) {
    this.house = cloneHouse(house);
  }
  change(edit: (h: HouseV1) => void) {
    const next = cloneHouse(this.house);
    edit(next);
    this.undoStack.push(this.house);
    if (this.undoStack.length > H.UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.house = next;
    return next;
  }
  undo() {
    const prior = this.undoStack.pop();
    if (prior) {
      this.redoStack.push(this.house);
      this.house = prior;
    }
    return this.house;
  }
  redo() {
    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(this.house);
      this.house = next;
    }
    return this.house;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  placeStash(p: Vec3i) {
    if (!inside(p, this.house.height ?? H.PLOT_H)) return this.house;
    const stashes = stashPositions(this.house);
    if (
      stashes.length >= NIGHT.maxStashes &&
      this.house.blocks[index(p.x, p.y, p.z)] !== B.CANDY
    )
      throw new Error('Only three stashes. Break one before moving it.');
    return this.change((h) => {
      put(h, p.x, p.y, p.z, B.CANDY);
      h.candy = stashPositions(h)[0];
    });
  }
  paint(
    from: Vec3i,
    to: Vec3i,
    id: number,
    rot: number,
    tool: 'block' | 'line' | 'fill',
  ) {
    return this.change((h) => {
      const positions: Vec3i[] = [];
      if (tool === 'line') {
        const n = Math.max(
          Math.abs(to.x - from.x),
          Math.abs(to.y - from.y),
          Math.abs(to.z - from.z),
        );
        for (let i = 0; i <= n; i++) {
          const t = n ? i / n : 0;
          positions.push({
            x: Math.round(from.x + (to.x - from.x) * t),
            y: Math.round(from.y + (to.y - from.y) * t),
            z: Math.round(from.z + (to.z - from.z) * t),
          });
        }
      } else if (tool === 'fill')
        for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++)
          for (let z = Math.min(from.z, to.z); z <= Math.max(from.z, to.z); z++)
            for (
              let x = Math.min(from.x, to.x);
              x <= Math.max(from.x, to.x);
              x++
            )
              positions.push({ x, y, z });
      else positions.push(to);
      if (id === B.CANDY) {
        for (let i = 0; i < h.blocks.length; i++)
          if (h.blocks[i] === B.CANDY) h.blocks[i] = 0;
        positions.splice(0, positions.length - 1);
        h.candy = { ...to };
      }
      for (const p of positions)
        if (inside(p, h.height ?? H.PLOT_H)) {
          put(h, p.x, p.y, p.z, id);
          rotate(h, index(p.x, p.y, p.z), rot);
        }
      const first = stashPositions(h)[0];
      if (first) h.candy = first;
    });
  }
}
