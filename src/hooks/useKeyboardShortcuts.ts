import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[] = []) => {
  const { setActiveTab } = useAppStore();

  // Default shortcuts for tab navigation
  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: '1',
      altKey: true,
      action: () => setActiveTab('single'),
      description: 'Switch to Single Classification tab'
    },
    {
      key: '2',
      altKey: true,
      action: () => setActiveTab('upload'),
      description: 'Switch to Upload tab'
    },
    {
      key: '3',
      altKey: true,
      action: () => setActiveTab('jobs'),
      description: 'Switch to Jobs tab'
    },
    {
      key: '4',
      altKey: true,
      action: () => setActiveTab('keywords'),
      description: 'Switch to Keywords tab'
    },
    {
      key: '5',
      altKey: true,
      action: () => setActiveTab('health'),
      description: 'Switch to Health tab'
    },
    {
      key: 'h',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        // Show keyboard shortcuts help
        console.log('Keyboard shortcuts help requested');
      },
      description: 'Show keyboard shortcuts help'
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const matchingShortcut = allShortcuts.find(shortcut => 
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey
      );

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [allShortcuts]);

  return { shortcuts: allShortcuts };
};

export default useKeyboardShortcuts;