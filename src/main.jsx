import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { loadDisplayFont } from './lib/displayFont';
import { loadDisplayIcons } from './lib/displayIcons';

loadDisplayFont();
loadDisplayIcons();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
