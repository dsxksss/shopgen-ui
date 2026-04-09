import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DebugPanel } from './components/DebugPanel.tsx';
import './index.css';

const query = new URLSearchParams(window.location.search);
const isDebugWindow = query.get('window') === 'debug';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDebugWindow ? <DebugPanel /> : <App />}
  </StrictMode>,
);
