
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'sonner';
import NetworkStatusMonitor from './components/common/NetworkStatusMonitor';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" richColors />
        <NetworkStatusMonitor />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
