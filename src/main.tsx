import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundFileGenerationService } from './lib/services/backgroundFileGenerationService'

// Start background services
BackgroundFileGenerationService.start();

createRoot(document.getElementById("root")!).render(<App />);
