
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { DownloadProgressProvider } from '@/contexts/DownloadProgressContext';
import DownloadProgressDisplay from '@/components/download/DownloadProgressDisplay';
import Index from '@/pages/Index';
import About from '@/pages/About';
import NotFound from '@/pages/NotFound';
import ErrorBoundaryEnhanced from '@/components/ErrorBoundaryEnhanced';
import { NetworkStatusIndicator } from '@/components/ui/network-status-indicator';

import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryEnhanced>
        <DownloadProgressProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
            <DownloadProgressDisplay />
            <NetworkStatusIndicator />
          </Router>
        </DownloadProgressProvider>
      </ErrorBoundaryEnhanced>
    </QueryClientProvider>
  );
}

export default App;
