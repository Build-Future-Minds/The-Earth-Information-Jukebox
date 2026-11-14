import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative, so the same build works on GitHub Pages
// (served under /The-Earth-Information-Jukebox/) and from `npm run preview`.
export default defineConfig({
  base: './',
  plugins: [react()],
  // The app imports the shared fixtures and data from the repo root (../fixtures, ../data).
  server: { fs: { allow: ['..'] } },
});
