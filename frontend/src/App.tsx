import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OfflineBanner } from './components/offline/OfflineBanner';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds fresh window prevents repeated hits
      gcTime: 5 * 60 * 1000, // 5 minutes persistence
      retry: (failureCount, error: any) => {
        if (
          error?.response?.status === 429 ||
          error?.response?.status === 401 ||
          error?.response?.status === 403
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <OfflineBanner />
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
