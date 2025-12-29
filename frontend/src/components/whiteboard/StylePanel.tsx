import { Check } from 'lucide-react';
import { ElementStyle, StrokeWidth, StrokeStyle, FillStyle } from '@/types/whiteboard';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StylePanelProps {
  style: ElementStyle;
  onStyleChange: (style: Partial<ElementStyle>) => void;
  isVisible: boolean;
}

const strokeColors = [
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
];

const fillColors = [
  { id: 'transparent', color: 'transparent', label: 'None' },
  { id: 'lightBlue', color: '#dbeafe', label: 'Light Blue' },
  { id: 'lightGreen', color: '#dcfce7', label: 'Light Green' },
  { id: 'lightPink', color: '#fce7f3', label: 'Light Pink' },
  { id: 'lightYellow', color: '#fef3c7', label: 'Light Yellow' },
];

const fillStyles: { id: FillStyle; icon: React.ReactNode; label: string }[] = [
  { id: 'none', icon: <div className="w-5 h-5 border border-border rounded" />, label: 'None' },
  { id: 'solid', icon: <div className="w-5 h-5 bg-muted rounded" />, label: 'Solid' },
  { id: 'hachure', icon: <div className="w-5 h-5 border border-border rounded bg-gradient-to-br from-transparent via-muted to-transparent" />, label: 'Hachure' },
  { id: 'cross-hatch', icon: <div className="w-5 h-5 border border-border rounded" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, hsl(var(--muted)) 2px, hsl(var(--muted)) 4px)' }} />, label: 'Cross-hatch' },
  { id: 'dots', icon: <div className="w-5 h-5 border border-border rounded" style={{ background: 'radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />, label: 'Dots' },
  { id: 'zigzag', icon: <div className="w-5 h-5 border border-border rounded bg-muted/50" />, label: 'Zigzag' },
];

const strokeWidths: { id: StrokeWidth; width: number; label: string }[] = [
  { id: 'thin', width: 1, label: 'Thin' },
  { id: 'medium', width: 2, label: 'Medium' },
  { id: 'thick', width: 4, label: 'Thick' },
];

const strokeStyles: { id: StrokeStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
];

export function StylePanel({ style, onStyleChange, isVisible }: StylePanelProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed left-4 top-20 z-40 w-56"
    >
      <div className="bg-panel-bg border border-border rounded-xl p-4 shadow-panel space-y-5">
        {/* Stroke Color */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke</label>
          <div className="flex gap-1.5">
            {strokeColors.map((c) => (
              <button
                key={c.id}
                onClick={() => onStyleChange({ strokeColor: c.id as any, strokeColorValue: c.color })}
                className={cn(
                  "w-7 h-7 rounded-md border-2 transition-all",
                  style.strokeColorValue === c.color
                    ? "border-orange-400 ring-2 ring-orange-400/30"
                    : "border-transparent hover:scale-110"
                )}
                style={{ backgroundColor: c.color }}
              >
                {style.strokeColorValue === c.color && (
                  <Check className="w-4 h-4 text-white mx-auto" strokeWidth={3} />
                )}
              </button>
            ))}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = style.strokeColorValue;
                input.onchange = (e) => {
                  onStyleChange({ strokeColor: 'custom', strokeColorValue: (e.target as HTMLInputElement).value });
                };
                input.click();
              }}
              className="w-7 h-7 rounded-md border-2 border-border hover:border-muted-foreground transition-colors flex items-center justify-center"
            >
              <div className="w-4 h-4 rounded-sm" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
            </button>
          </div>
        </div>

        {/* Fill Color */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Background</label>
          <div className="flex gap-1.5">
            {fillColors.map((c) => (
              <button
                key={c.id}
                onClick={() => onStyleChange({ fillColor: c.id as any, fillColorValue: c.color })}
                className={cn(
                  "w-7 h-7 rounded-md border-2 transition-all",
                  c.id === 'transparent' ? "bg-white dark:bg-muted" : "",
                  style.fillColor === c.id
                    ? "border-orange-400 ring-2 ring-orange-400/30"
                    : "border-border hover:scale-110"
                )}
                style={{ backgroundColor: c.color === 'transparent' ? undefined : c.color }}
              >
                {style.fillColor === c.id && c.id === 'transparent' && (
                  <Check className="w-4 h-4 text-muted-foreground mx-auto" strokeWidth={3} />
                )}
                {style.fillColor === c.id && c.id !== 'transparent' && (
                  <Check className="w-4 h-4 text-muted-foreground mx-auto" strokeWidth={3} />
                )}
              </button>
            ))}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = style.fillColorValue === 'transparent' ? '#ffffff' : style.fillColorValue;
                input.onchange = (e) => {
                  onStyleChange({ fillColor: 'custom', fillColorValue: (e.target as HTMLInputElement).value });
                };
                input.click();
              }}
              className="w-7 h-7 rounded-md border-2 border-border hover:border-muted-foreground transition-colors flex items-center justify-center"
            >
              <div className="w-4 h-4 rounded-sm" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
            </button>
          </div>
        </div>

        {/* Fill Style */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Fill</label>
          <div className="flex flex-wrap gap-1.5">
            {fillStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => onStyleChange({ fillStyle: s.id })}
                className={cn(
                  "p-1.5 rounded-lg border transition-all",
                  style.fillStyle === s.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary"
                )}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke width</label>
          <div className="flex gap-1.5">
            {strokeWidths.map((w) => (
              <button
                key={w.id}
                onClick={() => onStyleChange({ strokeWidth: w.id })}
                className={cn(
                  "flex-1 h-9 rounded-lg border flex items-center justify-center transition-all",
                  style.strokeWidth === w.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary"
                )}
              >
                <div 
                  className="bg-foreground rounded-full" 
                  style={{ width: 20 + w.width * 4, height: w.width + 1 }} 
                />
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Style */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke Style</label>
          <div className="flex gap-1.5">
            {strokeStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => onStyleChange({ strokeStyle: s.id })}
                className={cn(
                  "flex-1 h-9 rounded-lg border flex items-center justify-center transition-all",
                  style.strokeStyle === s.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary"
                )}
              >
                <div 
                  className={cn(
                    "h-0.5 w-8",
                    s.id === 'solid' && "bg-foreground",
                    s.id === 'dashed' && "border-t-2 border-dashed border-foreground",
                    s.id === 'dotted' && "border-t-2 border-dotted border-foreground"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
