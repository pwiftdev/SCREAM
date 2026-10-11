import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '**/*.e2e.ts',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: process.env.SCREAM_TEST_BASE_URL ?? 'http://127.0.0.1:5173',
    headless: process.env.CI === '1' || process.platform !== 'darwin',
    launchOptions:
      process.platform === 'darwin' ? { args: ['--use-angle=metal'] } : {},
  },
  webServer: process.env.SCREAM_TEST_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
        timeout: 30000,
      },
});
