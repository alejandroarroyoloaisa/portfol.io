import swc from 'unplugin-swc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { defineConfig } from 'vitest/config';

// SWC conserva los metadatos de decoradores que necesita la inyección de dependencias de NestJS
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e.test.ts'],
    root: __dirname,
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/env.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
