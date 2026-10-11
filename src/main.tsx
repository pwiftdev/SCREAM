import ReactDOM from 'react-dom/client';
import '@fontsource/anton/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/silkscreen/latin-400.css';
const legacy = location.pathname.startsWith('/legacy');
const { default: App } = legacy
  ? await import('./LegacyApp')
  : await import('./HollowApp');
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
