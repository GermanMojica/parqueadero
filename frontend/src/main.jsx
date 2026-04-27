import React    from 'react';
import './index.css';   // ← esta línea debe estar
import ReactDOM from 'react-dom/client';
import AppRouter from './router/AppRouter';
import { AuthProvider }        from './context/AuthContext';
import { ParqueaderoProvider } from './context/ParqueaderoContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ParqueaderoProvider>
        <AppRouter />
      </ParqueaderoProvider>
    </AuthProvider>
  </React.StrictMode>,
);