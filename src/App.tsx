
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import About from '@/pages/About';
import NotFound from '@/pages/NotFound';
import ErrorBoundaryEnhanced from '@/components/ErrorBoundaryEnhanced';

import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryEnhanced>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
          
        </Router>
      </ErrorBoundaryEnhanced>
    </QueryClientProvider>
  );
}

export default App;
