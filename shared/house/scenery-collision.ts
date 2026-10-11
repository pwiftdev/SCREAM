export interface SceneryBox {
  x: number;
  z: number;
  w: number;
  d: number;
  yaw?: number;
}
export function sceneryCollision(boxes: readonly SceneryBox[], radius: number) {
  const cells = new Map<
    string,
    { box: SceneryBox; sin: number; cos: number }[]
  >();
  const cellSize = 16;
  for (const box of boxes) {
    const sin = Math.sin(box.yaw ?? 0),
      cos = Math.cos(box.yaw ?? 0),
      w = box.w / 2 + radius,
      d = box.d / 2 + radius,
      ex = Math.abs(cos) * w + Math.abs(sin) * d,
      ez = Math.abs(sin) * w + Math.abs(cos) * d;
    const entry = { box, sin, cos };
    for (
      let x = Math.floor((box.x - ex) / cellSize);
      x <= Math.floor((box.x + ex) / cellSize);
      x++
    )
      for (
        let z = Math.floor((box.z - ez) / cellSize);
        z <= Math.floor((box.z + ez) / cellSize);
        z++
      ) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(entry);
      }
  }
  return (x: number, z: number) =>
    (
      cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) ?? []
    ).some(({ box, sin, cos }) => {
      const dx = x - box.x,
        dz = z - box.z;
      return (
        Math.abs(dx * cos - dz * sin) < box.w / 2 + radius &&
        Math.abs(dx * sin + dz * cos) < box.d / 2 + radius
      );
    });
}
