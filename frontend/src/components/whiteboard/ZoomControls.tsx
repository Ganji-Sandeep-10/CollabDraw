import { Minus, Plus, Undo2, Redo2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ZoomControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2"
    >
      {/* Zoom controls */}
      <div className="flex items-center bg-toolbar-bg border border-border rounded-lg shadow-toolbar overflow-hidden">
        <button
          onClick={onZoomOut}
          className="p-2.5 hover:bg-secondary transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="px-3 text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-2.5 hover:bg-secondary transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center bg-toolbar-bg border border-border rounded-lg shadow-toolbar overflow-hidden">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
