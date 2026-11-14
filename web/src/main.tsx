import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Student B's Axis Specimen type, bundled so the app works offline (OFL-1.1).
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
