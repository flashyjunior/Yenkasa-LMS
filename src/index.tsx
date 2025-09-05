import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// normalize PUBLIC_URL so basename has no trailing slash (except root '/')
const rawBase = process.env.PUBLIC_URL ?? '/';
const basename = rawBase === '/' ? '/' : rawBase.replace(/\/+$/, '');

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
