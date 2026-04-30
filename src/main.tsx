import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
