import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['server/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node26',
  outDir: 'dist-server',
  external: ['@dimforge/rapier3d-compat'],
  removeNodeProtocol: false,
});
