import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Keyboard, 
  Home, 
  Database, 
  Brain, 
  FileText, 
  Settings,
  X,
  HelpCircle
} from 'lucide-react';

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if Ctrl/Cmd is pressed
      const isMod = e.ctrlKey || e.metaKey;

      // Show shortcuts help with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }

      // Ctrl/Cmd + ? to go to help page
      if (isMod && e.key === '?') {
        e.preventDefault();
        navigate('/help');
        return;
      }

      if (!isMod) return;

      // Navigation shortcuts
      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'd':
          e.preventDefault();
          navigate('/datasets');
          break;
        case 'p':
          e.preventDefault();
          navigate('/preprocessing');
          break;
        case 't':
          e.preventDefault();
          navigate('/training');
          break;
        case 'r':
          e.preventDefault();
          navigate('/reports');
          break;
        case 'k':
          e.preventDefault();
          setIsOpen(!isOpen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, isOpen]);

  const shortcuts = [
    { key: 'Ctrl + H', description: 'Go to Dashboard', icon: Home },
    { key: 'Ctrl + D', description: 'Go to Datasets', icon: Database },
    { key: 'Ctrl + P', description: 'Go to Preprocessing', icon: Settings },
    { key: 'Ctrl + T', description: 'Go to Training', icon: Brain },
    { key: 'Ctrl + R', description: 'Go to Reports', icon: FileText },
    { key: 'Ctrl + K', macKey: 'Cmd + K', description: 'Toggle shortcuts help', icon: Keyboard },
    { key: '?', description: 'Show shortcuts overlay', icon: HelpCircle },
    { key: 'Ctrl + ?', macKey: 'Cmd + ?', description: 'Go to Help page', icon: HelpCircle },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="glassmorphism w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" />
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <CardDescription>
            Navigate faster with keyboard shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <shortcut.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{shortcut.description}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium">Pro Tip:</span> Press <kbd className="px-2 py-1 bg-background rounded border text-xs">?</kbd> anytime to toggle this help screen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

