// Entry point: starts React, the router and the session provider.
// Base styles load FIRST, so page and component styles can override them.
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { ComfortProvider } from './hooks/ComfortContext.tsx';
import { SessionProvider } from './hooks/SessionContext.tsx';
import { SoundProvider } from './hooks/SoundContext.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <SoundProvider>
          <ComfortProvider>
            <App />
          </ComfortProvider>
        </SoundProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
