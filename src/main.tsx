import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupClientApiInterceptor } from './utils/clientApiFallback';

// Inicializa o interceptor resiliente de API para garantir funcionamento
// perfeito em hospedagens estáticas (como Netlify) e servidores Node (Render / Cloud Run).
setupClientApiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
