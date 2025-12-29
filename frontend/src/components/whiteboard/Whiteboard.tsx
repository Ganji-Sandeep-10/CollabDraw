import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { StylePanel } from './StylePanel';
import { MenuPanel } from './MenuPanel';
import { ZoomControls } from './ZoomControls';
import { ShareButton } from './ShareButton';
import { useCanvas } from '@/hooks/useCanvas';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useShareRoom } from '@/hooks/useShareRoom';
import { useJoinRoom } from '@/hooks/useCollaboration';
import { sendSceneUpdate, disconnectRoom, isSocketConnected } from '@/hooks/collaboration';
import { Point, ToolType, ElementStyle } from '@/types/whiteboard';
import { Scene } from '@/hooks/types';
import { toast } from 'sonner';
import { WelcomeScreen } from './WelcomeScreen';

export function Whiteboard() {
  const { theme, getCanvasBackgroundColor } = useTheme();
  // Always use the current theme's background color as the default (reactive to theme changes)
  const defaultBg = useMemo(() => {
    // #region agent log
    const bgColor = getCanvasBackgroundColor(theme as 'light' | 'dark' | 'system');
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Whiteboard.tsx:18',message:'defaultBg useMemo recalculated',data:{theme,calculatedColor:bgColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return bgColor;
  }, [theme, getCanvasBackgroundColor]);
  const {
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
    setBackgroundColor,
    setBackgroundColorTheme,
    setCurrentStyle,
    setActiveTool,
    startDrawing,
    continueDrawing,
    endDrawing,
    deleteSelected,
    eraseElement,
    selectElement,
    clearSelection,
    resetCanvas,
    undo,
    redo,
    exportToJSON,
    importFromJSON,
    editingElementId,
    updateElementText,
    finishEditingElement,
    beginMoveSelected,
    moveSelectedBy,
    endMoveSelected,
    applyRemoteScene: applyRemoteSceneFromHook,
  } = useCanvas(defaultBg);

  const editingRef = useRef<HTMLDivElement | null>(null);
  const editingElement = editingElementId ? elements.find(e => e.id === editingElementId) : null;

  // Collaboration functions
  const getLocalScene = useCallback((): Scene => {
    return {
      elements,
      viewportOffset,
      zoom,
      backgroundColor,
    };
  }, [elements, viewportOffset, zoom, backgroundColor]);

  const applyRemoteScene = useCallback((scene: Scene) => {
    // Use the hook's applyRemoteScene function
    applyRemoteSceneFromHook(scene);
    console.log('Remote scene applied, elements:', scene.elements?.length);
  }, [applyRemoteSceneFromHook]);

  // Initialize room joining on mount (if URL contains room ID)
  useEffect(() => {
    useJoinRoom(getLocalScene, applyRemoteScene);
  }, []);

  // Send scene updates to collaborators when canvas changes (only after socket is connected)
  useEffect(() => {
    // Don't send if socket is not connected
    if (!isSocketConnected()) {
      return;
    }

    const scene = getLocalScene();
    sendSceneUpdate(scene);
  }, [elements, viewportOffset, zoom, backgroundColor, getLocalScene]);

  // Handle page unload - disconnect from room
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnectRoom();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  useEffect(() => {
    if (editingElement) {
      // focus the editable div on next tick
      setTimeout(() => {
        const el = editingRef.current;
        if (!el) return;
        el.focus();
        // move caret to end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 0);
    }
  }, [editingElement]);

  // Draw final text directly to canvas immediately to avoid perceived lag
  const finalizeEditingImmediate = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const text = editingRef.current?.innerText ?? (el as any).text ?? '';

    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const x = el.x * zoom + viewportOffset.x;
        const y = el.y * zoom + viewportOffset.y;
        const fontSizePx = ((el as any).fontSize || 20) * zoom;
        ctx.save();
        ctx.font = `${fontSizePx}px Assistant, sans-serif`;
        ctx.fillStyle = (el.style && (el.style as any).strokeColorValue) || '#1a1a1a';
        ctx.textBaseline = 'top';
        const lines = String(text).split(/\r?\n/);
        const lineHeight = 1.2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, y + i * fontSizePx * lineHeight);
        }
        ctx.restore();
      }
    }

    // update state and clear editing overlay
    updateElementText(id, text);
    finishEditingElement(id);
  };

  const { user, login } = useAuth();
  const [canvasKey, setCanvasKey] = useState(0);
  // leftPanelMode controls what shows in the left panel area: 'menu' | 'style' | null
  const [leftPanelMode, setLeftPanelMode] = useState<null | 'menu' | 'style'>(null);
  
  // CRITICAL: Update backgroundColor immediately when theme changes
  // Use setBackgroundColorTheme to mark it as theme-based (not user-set)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Whiteboard.tsx:58',message:'Theme change effect triggered',data:{theme,currentBg:backgroundColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const newBgColor = getCanvasBackgroundColor(theme as 'light' | 'dark' | 'system');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/799d39de-5439-4afc-b156-06e2b73e8e17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Whiteboard.tsx:60',message:'About to call setBackgroundColorTheme',data:{newBgColor,currentBg:backgroundColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setBackgroundColorTheme(newBgColor);
  }, [theme, getCanvasBackgroundColor, setBackgroundColorTheme, backgroundColor]);
  
  // Force canvas to redraw when backgroundColor or theme changes
  useEffect(() => {
    setCanvasKey(prev => prev + 1);
  }, [backgroundColor, theme]);
  
  // Also listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const newBgColor = getCanvasBackgroundColor('system');
      setBackgroundColorTheme(newBgColor);
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, getCanvasBackgroundColor, setBackgroundColorTheme]);
  const handlePan = useCallback((delta: Point) => {
    setViewportOffset({
      x: viewportOffset.x + delta.x,
      y: viewportOffset.y + delta.y,
    });
  }, [viewportOffset, setViewportOffset]);

  const handleZoom = useCallback((delta: number, center: Point) => {
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    
    // Adjust offset to zoom towards cursor
    const zoomRatio = newZoom / zoom;
    const newOffset = {
      x: center.x - (center.x - viewportOffset.x) * zoomRatio,
      y: center.y - (center.y - viewportOffset.y) * zoomRatio,
    };
    
    setZoom(newZoom);
    setViewportOffset(newOffset);
  }, [zoom, viewportOffset, setZoom, setViewportOffset]);

  const handleZoomIn = () => {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    handleZoom(0.1, center);
  };

  const handleZoomOut = () => {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    handleZoom(-0.1, center);
  };

  const handleStyleChange = (changes: Partial<ElementStyle>) => {
    setCurrentStyle({ ...currentStyle, ...changes });
  };

  const handleExportImage = useCallback(() => {
    // Get the canvas element
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      toast.error('Could not export image');
      return;
    }

    // Create a temporary canvas to draw without the grid
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Could not export image');
      return;
    }

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Copy the content from the main canvas
    ctx.drawImage(canvas, 0, 0);

    // Convert to JPEG and download
    tempCanvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not export image');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whiteboard-export.jpg';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image exported successfully!');
    }, 'image/jpeg', 0.95);
  }, [backgroundColor]);

  const handleCollaborate = () => {
    if (!user) {
      toast.info('Please sign in to start a collaboration session');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const toolMap: { [key: string]: ToolType } = {
          '1': 'select',
          '2': 'hand',
          '3': 'rectangle',
          '4': 'diamond',
          '5': 'ellipse',
          '6': 'arrow',
          '7': 'line',
          '8': 'pencil',
          '9': 'text',
          '0': 'image',
          'e': 'eraser',
          'E': 'eraser',
        };
        
        if (toolMap[e.key]) {
          setActiveTool(toolMap[e.key]);
          return;
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo, selectedIds, deleteSelected]);

  // Determine if style panel should be visible
  const showStylePanel = activeTool !== 'select' && activeTool !== 'hand' && activeTool !== 'eraser';

  // Keep left panel in sync: if a tool that requires styles is active, show style panel.
  // If user opens the menu, set leftPanelMode to 'menu' via MenuPanel toggle.
  useEffect(() => {
    if (showStylePanel) {
      setLeftPanelMode('style');
    } else {
      // only clear if it was showing the style panel; keep menu if user opened it
      if (leftPanelMode === 'style') setLeftPanelMode(null);
    }
  }, [showStylePanel]);

  // Handle toolbar tool changes: ensure style panel opens for style-capable tools
  const styleTools = useMemo(() => new Set<ToolType>([
    'rectangle',
    'diamond',
    'ellipse',
    'arrow',
    'line',
    'pencil',
    'text',
  ]), []);

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    if (styleTools.has(tool)) {
      // show style panel whenever a style tool is selected
      setLeftPanelMode('style');
    } else {
      // hide left panel for tools that don't have styles
      setLeftPanelMode((m) => (m === 'menu' ? m : null));
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <Canvas
        key={canvasKey}
        elements={elements}
        drawingElement={drawingElement}
        viewportOffset={viewportOffset}
        zoom={zoom}
        backgroundColor={backgroundColor}
        activeTool={activeTool}
        hasElements={hasElements}
        onStartDrawing={startDrawing}
        onContinueDrawing={continueDrawing}
        onEndDrawing={endDrawing}
        onPan={handlePan}
        onZoom={handleZoom}
        onSelectElement={selectElement}
        onEraseElement={eraseElement}
        onClearSelection={clearSelection}
        selectedIds={selectedIds}
        onBeginMove={beginMoveSelected}
        onMoveSelected={moveSelectedBy}
        onEndMove={endMoveSelected}
        editingElementId={editingElementId}
      />

      {!hasElements && !isDrawing && <WelcomeScreen />}

      {editingElement && editingElement.type === 'text' && (
        <div
          className="absolute"
          style={{
            left: editingElement.x * zoom + viewportOffset.x,
            top: editingElement.y * zoom + viewportOffset.y - ((editingElement as any).fontSize || 20) * zoom,
            zIndex: 60,
          }}
        >
          <div
            ref={editingRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => updateElementText(editingElement.id, (e.target as HTMLDivElement).innerText)}
            onBlur={() => finalizeEditingImmediate(editingElement.id)}
            onKeyDown={(e) => {
              // Enter finalizes edit; Shift+Enter inserts a newline
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  // allow default to insert newline
                  return;
                }
                e.preventDefault();
                finalizeEditingImmediate(editingElement.id);
              }
            }}
            className="outline-none bg-transparent text-foreground"
            style={{
              minWidth: Math.max(80, (editingElement.width || 80) * zoom),
              fontSize: ((editingElement as any).fontSize || 20) * zoom,
              lineHeight: 1.1,
              whiteSpace: 'pre-wrap',
            }}
          >
            {(editingElement as any).text}
          </div>
        </div>
      )}

      <MenuPanel
        onImport={importFromJSON}
        onExportImage={handleExportImage}
        onExportJSON={exportToJSON}
        onCollaborate={handleCollaborate}
        onReset={resetCanvas}
        onBackgroundChange={setBackgroundColor}
        backgroundColor={backgroundColor}
        isOpen={leftPanelMode === 'menu'}
        onToggle={() => setLeftPanelMode((m) => (m === 'menu' ? null : 'menu'))}
      />

      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
      />

      <StylePanel
        style={currentStyle}
        onStyleChange={handleStyleChange}
        isVisible={leftPanelMode === 'style'}
      />

      <ShareButton
        getLocalScene={getLocalScene}
        applyRemoteScene={applyRemoteScene}
      />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}
