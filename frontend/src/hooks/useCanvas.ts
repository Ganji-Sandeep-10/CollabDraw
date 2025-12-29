import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  CanvasElement, 
  CanvasState, 
  Point, 
  ToolType, 
  ElementStyle,
  PencilElement,
  LineElement
} from '@/types/whiteboard';
import { saveCanvasState, loadCanvasState, clearCanvas } from '@/lib/db';

const DEFAULT_STYLE: ElementStyle = {
  strokeColor: 'black',
  strokeColorValue: '#1a1a1a',
  fillColor: 'transparent',
  fillColorValue: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 'medium',
  strokeStyle: 'solid',
};

const DEFAULT_STATE: CanvasState = {
  elements: [],
  viewportOffset: { x: 0, y: 0 },
  zoom: 1,
  backgroundColor: '#ffffff',
};

export function useCanvas(defaultBackgroundColor?: string) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewportOffset, setViewportOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:36',message:'backgroundColor state initialized',data:{initialValue:defaultBackgroundColor || '#ffffff'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return defaultBackgroundColor || '#ffffff';
  });
  const [currentStyle, setCurrentStyle] = useState<ElementStyle>(DEFAULT_STYLE);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingElement, setDrawingElement] = useState<CanvasElement | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const undoStack = useRef<CanvasElement[][]>([]);
  const redoStack = useRef<CanvasElement[][]>([]);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDrawingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  // Track if backgroundColor is user-set (true) or theme-based (false)
  const isUserSetBgRef = useRef(false);

  // Load canvas state on mount (only once)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    loadCanvasState().then((state) => {
      if (state) {
        setElements(state.elements);
        setViewportOffset(state.viewportOffset);
        setZoom(state.zoom);
        // ALWAYS use theme-based backgroundColor on initial load (theme takes precedence)
        // Never load saved backgroundColor - always use current theme
        if (defaultBackgroundColor) {
          setBackgroundColor(defaultBackgroundColor);
          isUserSetBgRef.current = false; // Theme-based
        } else {
          // Fallback: if no theme color provided, use saved (shouldn't happen)
          setBackgroundColor(state.backgroundColor);
          isUserSetBgRef.current = false; // Treat as theme-based even if from saved state
        }
      } else if (defaultBackgroundColor) {
        setBackgroundColor(defaultBackgroundColor);
        isUserSetBgRef.current = false; // Theme-based
      }
      hasLoadedRef.current = true;
    });
  }, []); // Only run once on mount

  // CRITICAL: Update backgroundColor when defaultBackgroundColor changes (theme change)
  // Only update if backgroundColor is theme-based (not user-set)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:81',message:'defaultBackgroundColor change effect triggered',data:{defaultBackgroundColor,currentBg:backgroundColor,isUserSet:isUserSetBgRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (defaultBackgroundColor && !isUserSetBgRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:84',message:'Updating backgroundColor from defaultBackgroundColor',data:{oldBg:backgroundColor,newBg:defaultBackgroundColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // Only update if it's theme-based, not user-set
      setBackgroundColor(defaultBackgroundColor);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:86',message:'Skipping backgroundColor update',data:{reason:!defaultBackgroundColor?'no defaultBg':'user-set',isUserSet:isUserSetBgRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
  }, [defaultBackgroundColor, backgroundColor]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      const state: CanvasState = {
        elements,
        viewportOffset,
        zoom,
        backgroundColor,
      };
      saveCanvasState(state);
    }, 500);
  }, [elements, viewportOffset, zoom, backgroundColor]);

  useEffect(() => {
    if (elements.length > 0) {
      debouncedSave();
    }
  }, [elements, debouncedSave]);

  const pushToUndo = useCallback(() => {
    undoStack.current.push([...elements]);
    redoStack.current = [];
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(false);
  }, [elements]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const previousState = undoStack.current.pop()!;
    redoStack.current.push([...elements]);
    setElements(previousState);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, [elements]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const nextState = redoStack.current.pop()!;
    undoStack.current.push([...elements]);
    setElements(nextState);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, [elements]);

  const startDrawing = useCallback((point: Point) => {
    if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'eraser') return;
    
    // Text tool: prompt for text input
    if (activeTool === 'text') {
      // Create an empty text element and enter inline editing mode
      pushToUndo();
      const id = uuidv4();
      const textElement: CanvasElement = {
        id,
        type: 'text',
        x: point.x,
        y: point.y,
        width: 0,
        height: 24,
        style: { ...currentStyle },
        text: '',
        fontSize: 20,
      } as any;
      setElements(prev => [...prev, textElement]);
      setEditingElementId(id);
      return;
    }
    
    // Image tool: open file picker
    if (activeTool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Use object URL for immediate display (fast), then downscale asynchronously
        const objectUrl = URL.createObjectURL(file);
        // Use createImageBitmap for faster, async decoding when available
        createImageBitmap(file).then(bitmap => {
          const id = uuidv4();
          pushToUndo();

          // Compute initial display size (cap to reasonable dimensions)
          const maxDisplayW = 800;
          const maxDisplayH = 600;
          const scale = Math.min(1, maxDisplayW / bitmap.width, maxDisplayH / bitmap.height);
          const displayW = Math.max(24, Math.round(bitmap.width * scale));
          const displayH = Math.max(24, Math.round(bitmap.height * scale));

          const imageElement: CanvasElement = {
            id,
            type: 'image',
            x: point.x,
            y: point.y,
            width: displayW,
            height: displayH,
            style: { ...currentStyle },
            // use objectUrl for immediate rendering
            imageData: objectUrl,
            // store bitmap reference for potential faster draw (not serialized)
            _img: undefined as any,
          } as any;

          setElements(prev => [...prev, imageElement]);

          // Downscale asynchronously using OffscreenCanvas if available
          setTimeout(async () => {
            try {
              const maxStoredW = 1200;
              const maxStoredH = 900;
              const storeScale = Math.min(1, maxStoredW / bitmap.width, maxStoredH / bitmap.height);
              const targetW = Math.max(1, Math.round(bitmap.width * storeScale));
              const targetH = Math.max(1, Math.round(bitmap.height * storeScale));

              let blob: Blob | null = null;
              if (typeof OffscreenCanvas !== 'undefined') {
                try {
                  const off = new OffscreenCanvas(targetW, targetH);
                  const ctx = off.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
                    // convert to blob
                    blob = await off.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
                  }
                } catch (err) {
                  blob = null;
                }
              }

              if (!blob) {
                const off = document.createElement('canvas');
                off.width = targetW;
                off.height = targetH;
                const ctx = off.getContext('2d');
                if (ctx) {
                  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
                  blob = await new Promise<Blob | null>(resolve => off.toBlob(b => resolve(b), 'image/jpeg', 0.8));
                }
              }

              if (blob) {
                const smallUrl = URL.createObjectURL(blob);
                setElements(prev => prev.map(el => el.id === id ? { ...el, imageData: smallUrl } : el));
                try { URL.revokeObjectURL(objectUrl); } catch {}
              }
            } catch (err) {
              // ignore and keep objectUrl
            } finally {
              try { bitmap.close(); } catch {}
            }
          }, 50);
        }).catch(() => {
          // fallback to FileReader if createImageBitmap unavailable/fails
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const id = uuidv4();
              pushToUndo();
              const maxDisplayW = 800;
              const maxDisplayH = 600;
              const scale = Math.min(1, maxDisplayW / img.width, maxDisplayH / img.height);
              const displayW = Math.max(24, Math.round(img.width * scale));
              const displayH = Math.max(24, Math.round(img.height * scale));
              const imageElement: CanvasElement = {
                id,
                type: 'image',
                x: point.x,
                y: point.y,
                width: displayW,
                height: displayH,
                style: { ...currentStyle },
                imageData: objectUrl,
                _img: img as any,
              } as any;
              setElements(prev => [...prev, imageElement]);
              // attempt async downscale like above
              setTimeout(() => {
                try {
                  const maxStoredW = 1200;
                  const maxStoredH = 900;
                  const storeScale = Math.min(1, maxStoredW / img.width, maxStoredH / img.height);
                  const targetW = Math.max(1, Math.round(img.width * storeScale));
                  const targetH = Math.max(1, Math.round(img.height * storeScale));
                  const off = document.createElement('canvas');
                  off.width = targetW;
                  off.height = targetH;
                  const ctx = off.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                    off.toBlob(b => {
                      if (b) {
                        const smallUrl = URL.createObjectURL(b);
                        setElements(prev => prev.map(el => el.id === id ? { ...el, imageData: smallUrl } : el));
                        try { URL.revokeObjectURL(objectUrl); } catch {}
                      }
                    }, 'image/jpeg', 0.8);
                  }
                } catch (err) {}
              }, 50);
            };
            img.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      };
      input.click();
      return;
    }

    setIsDrawing(true);
    isDrawingRef.current = true;
    pushToUndo();

    const newElement: CanvasElement = {
      id: uuidv4(),
      type: activeTool as any,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      style: { ...currentStyle },
      points: activeTool === 'pencil' || activeTool === 'line' || activeTool === 'arrow' 
        ? [{ x: 0, y: 0 }] 
        : undefined,
    } as any;

    setDrawingElement(newElement);
  }, [activeTool, currentStyle, pushToUndo]);

  const continueDrawing = useCallback((point: Point) => {
    if (!isDrawingRef.current || !drawingElement) return;

    const updatedElement = { ...drawingElement };

    if (drawingElement.type === 'pencil' || drawingElement.type === 'line' || drawingElement.type === 'arrow') {
      const pencilEl = updatedElement as PencilElement;
      const newPoint = {
        x: point.x - drawingElement.x,
        y: point.y - drawingElement.y,
      };
      pencilEl.points = [...(pencilEl.points || []), newPoint];
      
      // Update bounding box
      if (pencilEl.points && pencilEl.points.length > 0) {
        const allX = pencilEl.points.map(p => p.x);
        const allY = pencilEl.points.map(p => p.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);
        pencilEl.width = Math.max(0, maxX - minX);
        pencilEl.height = Math.max(0, maxY - minY);
      }
    } else {
      updatedElement.width = point.x - drawingElement.x;
      updatedElement.height = point.y - drawingElement.y;
    }

    setDrawingElement(updatedElement);
  }, [drawingElement]);

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current || !drawingElement) return;

    setIsDrawing(false);
    isDrawingRef.current = false;
    
    // Only add if it has some size
    const hasSize = 
      Math.abs(drawingElement.width) > 2 || 
      Math.abs(drawingElement.height) > 2 ||
      (drawingElement.type === 'pencil' && (drawingElement as PencilElement).points && (drawingElement as PencilElement).points.length > 2) ||
      ((drawingElement.type === 'line' || drawingElement.type === 'arrow') && (drawingElement as LineElement).points && (drawingElement as LineElement).points.length >= 2);

    if (hasSize) {
      setElements(prev => [...prev, drawingElement]);
    }
    setDrawingElement(null);
  }, [drawingElement]);

  const updateElementText = useCallback((id: string, text: string) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      const lines = (text || '').split(/\r?\n/);
      const fontSize = (el as any).fontSize || 20;
      const approxCharWidth = fontSize * 0.6; // rough estimate
      const maxLineLen = Math.max(...lines.map(l => l.length), 1);
      const width = Math.max(24, Math.ceil(maxLineLen * approxCharWidth));
      const lineHeight = 1.2;
      const height = Math.max(24, Math.ceil(lines.length * fontSize * lineHeight));
      return { ...el, text, width, height };
    }));
  }, []);

  const finishEditingElement = useCallback((id?: string) => {
    setEditingElementId(prevId => {
      const toClear = id ?? prevId;
      // If the element's text is empty, remove it
      if (toClear) {
        setElements(prev => {
          const el = prev.find(e => e.id === toClear);
          if (el && (el as any).text === '') {
            return prev.filter(e => e.id !== toClear);
          }
          return prev;
        });
      }
      return null;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    pushToUndo();
    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  }, [selectedIds, pushToUndo]);

  const eraseElement = useCallback((id: string) => {
    pushToUndo();
    setElements(prev => prev.filter(el => el.id !== id));
  }, [pushToUndo]);

  const selectElement = useCallback((id: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Move selected elements by a delta (in canvas coordinates)
  const moveSelectedBy = useCallback((delta: Point) => {
    if (selectedIds.length === 0) return;
    setElements(prev => prev.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      return { ...el, x: el.x + delta.x, y: el.y + delta.y };
    }));
  }, [selectedIds]);

  // Begin a move operation (push current state to undo stack)
  const beginMoveSelected = useCallback(() => {
    // Always push current state so the upcoming move can be undone
    pushToUndo();
  }, [selectedIds, pushToUndo]);

  const endMoveSelected = useCallback(() => {
    // No-op for now, kept for symmetry and future features
  }, []);

  const resetCanvas = useCallback(() => {
    pushToUndo();
    setElements([]);
    setSelectedIds([]);
    setViewportOffset({ x: 0, y: 0 });
    setZoom(1);
    setBackgroundColor(defaultBackgroundColor || '#ffffff');
    isUserSetBgRef.current = false; // Reset to theme-based
    clearCanvas();
  }, [pushToUndo, defaultBackgroundColor]);

  const applyRemoteScene = useCallback((scene: any) => {
    // Apply remote scene without adding to undo history (don't push to undo)
    setElements(scene.elements || []);
    setViewportOffset(scene.viewportOffset || { x: 0, y: 0 });
    setZoom(scene.zoom || 1);
    setBackgroundColor(scene.backgroundColor || '#ffffff');
    setSelectedIds([]); // Clear selection when remote scene is applied
    isUserSetBgRef.current = true; // Mark as user-set color (from remote)
  }, []);

  const exportToJSON = useCallback(() => {
    const state: CanvasState = {
      elements,
      viewportOffset,
      zoom,
      backgroundColor,
    };
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard-canvas.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, viewportOffset, zoom, backgroundColor]);

  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state: CanvasState = JSON.parse(e.target?.result as string);
        pushToUndo();
        setElements(state.elements);
        setViewportOffset(state.viewportOffset);
        setZoom(state.zoom);
        // On import, use theme-based color (don't use imported backgroundColor)
        // This ensures theme consistency after import
        if (defaultBackgroundColor) {
          setBackgroundColor(defaultBackgroundColor);
          isUserSetBgRef.current = false; // Theme-based after import
        } else {
          setBackgroundColor(state.backgroundColor);
          isUserSetBgRef.current = true; // User had set it in imported file
        }
      } catch (err) {
        console.error('Failed to import canvas:', err);
      }
    };
    reader.readAsText(file);
  }, [pushToUndo, defaultBackgroundColor]);

  const hasElements = elements.length > 0 || drawingElement !== null;

  // Wrapper for setBackgroundColor that marks it as user-set
  const setBackgroundColorUser = useCallback((color: string) => {
    setBackgroundColor(color);
    isUserSetBgRef.current = true; // Mark as user-set
  }, []);

  // Internal function to set backgroundColor as theme-based (used by Whiteboard)
  const setBackgroundColorTheme = useCallback((color: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:355',message:'setBackgroundColorTheme called',data:{newColor:color,currentBg:backgroundColor,wasUserSet:isUserSetBgRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setBackgroundColor(color);
    isUserSetBgRef.current = false; // Mark as theme-based
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCanvas.ts:358',message:'setBackgroundColorTheme completed',data:{color,isUserSetNow:isUserSetBgRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }, [backgroundColor]);

  // Expose both functions - user-set and theme-based
  return {
    elements,
    selectedIds,
    viewportOffset,
    zoom,
    backgroundColor,
    currentStyle,
    activeTool,
    isDrawing,
    drawingElement,
    canUndo,
    canRedo,
    hasElements,
    setViewportOffset,
    setZoom,
    setBackgroundColor: setBackgroundColorUser, // User-set version (from MenuPanel)
    setBackgroundColorTheme, // Theme-based version (internal use)
    setCurrentStyle,
    setActiveTool,
    startDrawing,
    continueDrawing,
    endDrawing,
    deleteSelected,
    eraseElement,
    selectElement,
    clearSelection,
    beginMoveSelected,
    moveSelectedBy,
    endMoveSelected,
    resetCanvas,
    undo,
    redo,
    exportToJSON,
    importFromJSON,
    editingElementId,
    updateElementText,
    finishEditingElement,
    applyRemoteScene,
  };
}
