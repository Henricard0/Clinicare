import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setupResilienceInterceptor} from './services/resilienceEngine';

// Inicializa motor de resiliência local para tolerância a falhas na Vercel e offline
setupResilienceInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

