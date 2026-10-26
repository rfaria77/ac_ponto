import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { registerSW } from 'virtual:pwa-register';

injectSpeedInsights();

// Registrar Service Worker do PWA para suporte offline e notificações
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nova versão pronta');
  },
  onOfflineReady() {
    console.log('[PWA] Ponto A&C pronto para operação');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

