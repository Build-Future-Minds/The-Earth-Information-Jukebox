import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev only: serve the listening tools (../tools) and the NASA still (../assets/frames) like the Pages
// build does, so the app's link to the game works on localhost too. Vite serves repo files under /@fs/
// (allowed by server.fs.allow below).
function devTools(): Plugin {
  return {
    name: 'dev-tools',
    configureServer(server) {
      const repo = server.config.root.replace(/\\/g, '/').replace(/\/[^/]+\/?$/, '');
      server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
        const url = req.url ?? '';
        if ((url.startsWith('/tools/') || url.startsWith('/assets/frames/')) && !url.includes('..')) {
          req.url = `/@fs/${repo.replace(/^\//, '')}${url}`;
        }
        next();
      });
    },
  };
}

// base './' keeps asset paths relative, so the same build works on GitHub Pages
// (served under /The-Earth-Information-Jukebox/) and from `npm run preview`.
export default defineConfig({
  base: './',
  plugins: [react(), devTools()],
  // The app imports the shared fixtures and data from the repo root (../fixtures, ../data).
  server: { fs: { allow: ['..'] } },
  // Two pages: the app (index.html) and Student A's globe prototype (globe.html, see src/globe/README.md).
  build: { rollupOptions: { input: { main: 'index.html', globe: 'globe.html' } } },
});
