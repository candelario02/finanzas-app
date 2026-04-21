import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// 1. Renderizado de la aplicación
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registrado con éxito ✅ en el alcance:', registration.scope);
      })
      .catch((error) => {
        console.error('Fallo el registro del SW ❌:', error);
      });
  });
}