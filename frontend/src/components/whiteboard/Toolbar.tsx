import { 
  MousePointer2, 
  Hand, 
  Square, 
  Diamond, 
  Circle, 
  ArrowRight, 
  Minus, 
  Pencil, 
  Type, 
  Image, 
  Eraser 
} from 'lucide-react';
import { ToolType } from '@/types/whiteboard';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools: { type: ToolType; icon: React.ElementType; label: string; shortcut: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: '1' },
  { type: 'hand', icon: Hand, label: 'Hand', shortcut: '2' },
  { type: 'rectangle', icon: Square, label: 'Rectangle', shortcut: '3' },
  { type: 'diamond', icon: Diamond, label: 'Diamond', shortcut: '4' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: '5' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: '6' },
  { type: 'line', icon: Minus, label: 'Line', shortcut: '7' },
  { type: 'pencil', icon: Pencil, label: 'Pencil', shortcut: '8' },
  { type: 'text', icon: Type, label: 'Text', shortcut: '9' },
  { type: 'image', icon: Image, label: 'Image', shortcut: '0' },
  { type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      className="fixed top-3 left-1/2 z-50"
    >
      <div className="flex items-center gap-0.5 bg-toolbar-bg border border-border rounded-xl p-1.5 shadow-toolbar">
        {tools.map((tool, index) => (
          <div key={tool.type} className="relative group">
            {index > 0 && index % 2 === 0 && index < tools.length && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-px bg-border -ml-0.5" />
            )}
            <button
              onClick={() => onToolChange(tool.type)}
              className={cn(
                "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150",
                activeTool === tool.type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <tool.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              <span className="absolute -bottom-0.5 right-1 text-[9px] font-medium opacity-50">
                {tool.shortcut}
              </span>
            </button>
            
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {tool.label}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
