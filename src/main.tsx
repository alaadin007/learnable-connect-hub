
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { Toaster } from "sonner";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" closeButton richColors />
    </BrowserRouter>
  </React.StrictMode>
);
