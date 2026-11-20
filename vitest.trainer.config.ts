import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['client/pages/auth/__tests__/trainer-role-routing.test.tsx'],
  },
  resolve: {
    alias: [
      { find: '@/components', replacement: path.resolve(__dirname, 'client/components') },
      { find: '@/lib', replacement: path.resolve(__dirname, 'client/lib') },
      { find: '@/app', replacement: path.resolve(__dirname, 'client/src/app') },
      { find: '@', replacement: path.resolve(__dirname, 'client/src') },
    ],
  },
});
