import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project at /<repo-name>/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/home-stock/' : '/',
  plugins: [react()],
}));
