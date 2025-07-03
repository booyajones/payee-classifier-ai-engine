import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
}

const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  const shortcuts: KeyboardShortcut[] = [
    { key: '1', altKey: true, description: 'Switch to Single Classification tab' },
    { key: '2', altKey: true, description: 'Switch to Upload tab' },
    { key: '3', altKey: true, description: 'Switch to Jobs tab' },
    { key: '4', altKey: true, description: 'Switch to Keywords tab' },
    { key: '5', altKey: true, description: 'Switch to Health tab' },
    { key: 'H', ctrlKey: true, shiftKey: true, description: 'Show this help dialog' },
    { key: 'R', ctrlKey: true, description: 'Refresh current tab data' },
    { key: 'N', ctrlKey: true, description: 'Start new upload (when in upload tab)' },
  ];

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    keys.push(shortcut.key);
    
    return keys.join(' + ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border"
          aria-label="Show keyboard shortcuts (Ctrl+Shift+H)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use these keyboard shortcuts to navigate more efficiently:
          </p>
          
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{shortcut.description}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatShortcut(shortcut)}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>💡 Tip: These shortcuts work when you're not typing in an input field.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;