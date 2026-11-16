import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Geist and Geist Mono (Pulse Catalogue, DESIGN.md), bundled so the app works offline (OFL-1.1).
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
