import { Root } from '@typegpu/react';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root') as HTMLDivElement).render(
  <StrictMode>
    <Root>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </Root>
  </StrictMode>,
);
