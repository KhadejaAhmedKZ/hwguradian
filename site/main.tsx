import './chrome-stub';
import { createRoot } from 'react-dom/client';
import '../src/styles/base.css';
import '../src/popup/popup.css';
import '../src/blocked/blocked.css';
import './site.css';
import { Site } from './Site';

createRoot(document.getElementById('root')!).render(<Site />);
