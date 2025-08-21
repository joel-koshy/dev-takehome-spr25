import { defineConfig } from 'vitest/config';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});