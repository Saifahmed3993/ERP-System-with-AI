import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/global.css';
import './styles/dark-mode.css';
import './styles/print.css';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
createRoot(document.getElementById('root')!).render(<App />);
