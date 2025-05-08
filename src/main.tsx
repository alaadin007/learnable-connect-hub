
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'sonner';

// Create a client with proper error handling and retry settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount > 3) return false;
        return true;
      },
      staleTime: 30000, // 30 seconds
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
