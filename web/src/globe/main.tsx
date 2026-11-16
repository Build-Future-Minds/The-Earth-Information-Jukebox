import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobePage } from './GlobePage';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '../styles.css';
import './globe.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobePage />
  </StrictMode>,
);
