import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
        '@': path.resolve(__dirname, '.')
    },
    // Prevent Vitest from trying to run Playwright E2E tests
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
