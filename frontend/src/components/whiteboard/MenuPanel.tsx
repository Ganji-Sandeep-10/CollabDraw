import { useState } from 'react';
import { 
  Menu, 
  FolderOpen, 
  Image, 
  Download, 
  Users, 
  Command, 
  Search, 
  HelpCircle, 
  RotateCcw,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

interface MenuPanelProps {
  onImport: (file: File) => void;
  onExportImage: () => void;
  onExportJSON: () => void;
  onCollaborate: () => void;
  onReset: () => void;
  onBackgroundChange: (color: string) => void;
  backgroundColor: string;
  // Controlled open state and toggle handler so parent can coordinate with style panel
  isOpen?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { id: 'open', icon: FolderOpen, label: 'Open', shortcut: 'Ctrl+O' },
  { id: 'export-image', icon: Image, label: 'Export image', shortcut: 'Ctrl+Shift+E' },
  { id: 'export-json', icon: Download, label: 'Export canvas', shortcut: '' },
  { id: 'collaborate', icon: Users, label: 'Live collaboration...', shortcut: '' },
  { id: 'command', icon: Command, label: 'Command palette', shortcut: 'Ctrl+/' },
  { id: 'find', icon: Search, label: 'Find on canvas', shortcut: 'Ctrl+F' },
  { id: 'help', icon: HelpCircle, label: 'Help', shortcut: '?' },
  { id: 'reset', icon: RotateCcw, label: 'Reset canvas', shortcut: '' },
];

const canvasBackgroundsLight = [
  { color: '#ffffff', dark: '#1a1d24' },
  { color: '#f8fafc', dark: '#1e2129' },
  { color: '#f1f5f9', dark: '#232730' },
  { color: '#fef3c7', dark: '#2a2520' },
  { color: '#fce7f3', dark: '#2a2028' },
  { color: '#f3f4f6', dark: '#25282e' },
];

export function MenuPanel({
  onImport,
  onExportImage,
  onExportJSON,
  onCollaborate,
  onReset,
  onBackgroundChange,
  backgroundColor,
  isOpen = false,
  onToggle,
}: MenuPanelProps) {
  const { theme, setTheme } = useTheme();

  const handleMenuAction = (id: string) => {
    switch (id) {
      case 'open':
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) onImport(file);
        };
        input.click();
        break;
      case 'export-image':
        onExportImage();
        break;
      case 'export-json':
        onExportJSON();
        break;
      case 'collaborate':
        onCollaborate();
        break;
      case 'reset':
        if (confirm('Are you sure you want to reset the canvas? This cannot be undone.')) {
          onReset();
        }
        break;
    }
    if (onToggle) onToggle();
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="flex items-center gap-3">
        
        {/* Menu Button */}
        <button
          onClick={() => onToggle ? onToggle() : undefined}
          className="w-10 h-10 flex items-center justify-center bg-toolbar-bg border border-border rounded-lg shadow-toolbar hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="/CollabDraw.png" 
            alt="CollabDraw" 
            className="h-9 w-auto"
          />
        </div>
          
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => onToggle ? onToggle() : undefined} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              // Match StylePanel position/size: fixed left-4 top-20 and same width
              className="fixed left-4 top-20 w-56 bg-panel-bg border border-border rounded-xl shadow-panel overflow-hidden z-50"
            >
              <div className="p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuAction(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                      <span className={cn(
                        item.id === 'command' && "text-primary font-medium"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-border p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Theme</span>
                  <div className="flex bg-secondary rounded-lg p-0.5">
                    <button
                      onClick={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MenuPanel.tsx:142',message:'Theme button clicked - light',data:{currentTheme:theme},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        setTheme('light');
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === 'light' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MenuPanel.tsx:151',message:'Theme button clicked - dark',data:{currentTheme:theme},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        setTheme('dark');
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === 'dark' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MenuPanel.tsx:160',message:'Theme button clicked - system',data:{currentTheme:theme},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                        setTheme('system');
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === 'system' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground block mb-2">Canvas background</span>
                  <div className="flex gap-1.5">
                    {canvasBackgroundsLight.map((bg) => {
                      const currentColor = theme === 'dark' ? bg.dark : bg.color;
                      return (
                        <button
                          key={bg.color}
                          onClick={() => onBackgroundChange(currentColor)}
                          className={cn(
                            "w-7 h-7 rounded-md border-2 transition-all",
                            backgroundColor === currentColor || backgroundColor === bg.color || backgroundColor === bg.dark
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border hover:scale-110"
                          )}
                          style={{ backgroundColor: currentColor }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
