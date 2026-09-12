import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import './blocked.css';
import { Blocked } from './Blocked';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Blocked />
  </StrictMode>,
);
