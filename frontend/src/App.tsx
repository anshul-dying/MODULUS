import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Navbar from './components/Navbar';
import InteractiveGrid from './components/InteractiveGrid';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Training from './pages/Training';
import Reports from './pages/Reports';
import ImageTraining from './pages/ImageTraining';
import Preprocessing from './pages/Preprocessing';
import Help from './pages/Help';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200 relative">
          <InteractiveGrid />
          <Navbar className="relative z-20" />
          <main className="container mx-auto px-4 py-8 relative z-20">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/training" element={<Training />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/image-training" element={<ImageTraining />} />
              <Route path="/preprocessing" element={<Preprocessing />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </main>
          <Toaster />
          <KeyboardShortcuts />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;