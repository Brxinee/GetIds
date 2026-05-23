import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent zoom scaling & double tap highlights on touch screens
if (typeof window !== 'undefined') {
  // Block pinch-to-zoom multi-touch
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // Suppress double-tap zoom gestures except for keyboard focus fields
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      const targetEl = e.target as HTMLElement;
      const isTextInput = targetEl.tagName === 'INPUT' || 
                          targetEl.tagName === 'TEXTAREA' || 
                          targetEl.tagName === 'SELECT' || 
                          targetEl.isContentEditable;
      if (!isTextInput) {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, false);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
