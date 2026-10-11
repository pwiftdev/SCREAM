import { it, expect } from 'vitest';
import * as THREE from 'three';
import { bakeGeometry } from '../src/game/geometry-utils';
it('bakes compressed positions without overflowing normalized integer attributes', () => {
  const source = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Int16Array([32767, 0, 0, 0, 32767, 0, 0, 0, 32767]),
      3,
      true,
    ),
  );
  const geometry = bakeGeometry(
    source,
    new THREE.Matrix4().makeScale(12, 9, 6),
  );
  const positions = geometry.getAttribute('position');
  expect(positions.getX(0)).toBeCloseTo(12);
  expect(positions.getY(1)).toBeCloseTo(9);
  expect(positions.getZ(2)).toBeCloseTo(6);
  expect(source.getAttribute('position').getX(0)).toBe(1);
});
