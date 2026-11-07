import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { AuthProvider } from './context/AuthContext.js';
import { MoodProvider } from './context/MoodContext.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <MoodProvider>
        <App />
      </MoodProvider>
    </AuthProvider>
  </React.StrictMode>
);
