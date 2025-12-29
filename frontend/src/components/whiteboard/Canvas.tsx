import { useRef, useEffect, useCallback } from 'react';
import { CanvasElement, Point, ToolType, PencilElement, LineElement } from '@/types/whiteboard';
import { useTheme } from '@/hooks/useTheme';

interface CanvasProps {
  elements: CanvasElement[];
  drawingElement: CanvasElement | null;
  viewportOffset: Point;
  zoom: number;
  backgroundColor: string;
  activeTool: ToolType;
  hasElements: boolean;
  onStartDrawing: (point: Point) => void;
  onContinueDrawing: (point: Point) => void;
  onEndDrawing: () => void;
  onPan: (delta: Point) => void;
  onZoom: (delta: number, center: Point) => void;
  onSelectElement: (id: string, addToSelection: boolean) => void;
  onEraseElement: (id: string) => void;
  onClearSelection: () => void;
  selectedIds?: string[];
  onBeginMove?: () => void;
  onMoveSelected?: (delta: Point) => void;
  onEndMove?: () => void;
  editingElementId?: string | null;
}

export function Canvas({
  elements,
  drawingElement,
  viewportOffset,
  zoom,
  backgroundColor,
  activeTool,
  hasElements,
  onStartDrawing,
  onContinueDrawing,
  onEndDrawing,
  onPan,
  onZoom,
  onSelectElement,
  onEraseElement,
  onClearSelection,
  selectedIds,
  onBeginMove,
  onMoveSelected,
  onEndMove,
  editingElementId,
}: CanvasProps) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const isMovingSelection = useRef(false);
  const isMarquee = useRef(false);
  const marqueeStart = useRef<Point | null>(null);
  const isMovingCandidate = useRef(false);
  const rafId = useRef<number | null>(null);
  const moveAccum = useRef<Point>({ x: 0, y: 0 });
  const moveRafId = useRef<number | null>(null);
  const eraserCursorRef = useRef<HTMLDivElement | null>(null);
  const isErasing = useRef(false);
  const erasedIds = useRef<Set<string>>(new Set());
  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const spacePressed = useRef(false);

  const getStrokeWidth = (width: string): number => {
    switch (width) {
      case 'thin': return 1;
      case 'medium': return 2;
      case 'thick': return 4;
      default: return 2;
    }
  };

  // Helper function to get theme-adapted color
  const getThemeAdaptedColor = (colorValue: string, colorId: string, isDark: boolean): string => {
    // If it's black/dark color and we're in dark mode, use white/light color
    if (isDark && (colorId === 'black' || colorValue === '#1a1a1a' || colorValue === '#000000' || colorValue === 'black')) {
      return '#ffffff'; // White for dark mode
    }
    // If it's white/light color and we're in light mode, use black
    if (!isDark && (colorValue === '#ffffff' || colorValue === '#fff' || colorValue === 'white')) {
      // Only if it was originally black (meaning it was adapted from dark mode)
      // For now, we'll check if colorId is black to determine if it should be black in light mode
      if (colorId === 'black') {
        return '#1a1a1a'; // Black for light mode
      }
    }
    // Return the original color for other cases
    return colorValue;
  };

  const setStrokeStyle = (
    ctx: CanvasRenderingContext2D, 
    style: CanvasElement['style'],
    isDark: boolean
  ) => {
    // Adapt color based on theme
    const adaptedColor = getThemeAdaptedColor(style.strokeColorValue, style.strokeColor, isDark);
    ctx.strokeStyle = adaptedColor;
    ctx.lineWidth = getStrokeWidth(style.strokeWidth) * zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (style.strokeStyle === 'dashed') {
      ctx.setLineDash([8 * zoom, 4 * zoom]);
    } else if (style.strokeStyle === 'dotted') {
      ctx.setLineDash([2 * zoom, 4 * zoom]);
    } else {
      ctx.setLineDash([]);
    }
  };

  const getPattern = (
    ctx: CanvasRenderingContext2D,
    style: CanvasElement['style'],
    color: string,
    zoomLevel: number
  ): CanvasPattern | string | null => {
    if (style.fillStyle === 'solid') return color;
    if (style.fillStyle === 'none') return 'transparent';

    const patternCanvas = document.createElement('canvas');
    const pCtx = patternCanvas.getContext('2d');
    if (!pCtx) return color;

    const size = 10 * zoomLevel;
    patternCanvas.width = size;
    patternCanvas.height = size;

    pCtx.strokeStyle = color;
    pCtx.lineWidth = 2 * zoomLevel;
    pCtx.lineCap = 'round';

    switch (style.fillStyle) {
      case 'hachure':
        pCtx.beginPath();
        pCtx.moveTo(0, size);
        pCtx.lineTo(size, 0);
        pCtx.stroke();
        break;
      case 'cross-hatch':
        pCtx.beginPath();
        pCtx.moveTo(0, size);
        pCtx.lineTo(size, 0);
        pCtx.moveTo(0, 0);
        pCtx.lineTo(size, size);
        pCtx.stroke();
        break;
      case 'dots':
        pCtx.fillStyle = color;
        pCtx.beginPath();
        pCtx.arc(size / 2, size / 2, 1.5 * zoomLevel, 0, Math.PI * 2);
        pCtx.fill();
        break;
      case 'zigzag':
        pCtx.beginPath();
        pCtx.moveTo(0, size / 2);
        pCtx.lineTo(size / 2, 0);
        pCtx.lineTo(size, size / 2);
        pCtx.stroke();
        break;
      default:
        return color;
    }

    return ctx.createPattern(patternCanvas, 'repeat');
  };

  const setFillStyle = (
    ctx: CanvasRenderingContext2D, 
    style: CanvasElement['style'],
    isDark: boolean,
    origin?: { x: number, y: number }
  ) => {
    // Only fill if fillStyle is not 'none' AND fillColor is not 'transparent'
    if (style.fillStyle === 'none') {
      ctx.fillStyle = 'transparent';
    } else if (style.fillColor === 'transparent') {
      ctx.fillStyle = 'transparent';
    } else {
      // Adapt fill color based on theme (for dark fills in dark mode, use lighter version)
      const adaptedColor = getThemeAdaptedColor(style.fillColorValue, style.fillColor, isDark);
      
      const pattern = getPattern(ctx, style, adaptedColor, zoom);
      if (pattern && typeof pattern !== 'string') {
        if (origin) {
          const matrix = new DOMMatrix();
          matrix.translateSelf(origin.x, origin.y);
          pattern.setTransform(matrix);
        }
        ctx.fillStyle = pattern;
      } else {
        ctx.fillStyle = typeof pattern === 'string' ? pattern : adaptedColor;
      }
    }
  };

  const drawSmoothLine = (ctx: CanvasRenderingContext2D, points: Point[], startX: number, startY: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(
      (startX + points[0].x) * zoom + viewportOffset.x,
      (startY + points[0].y) * zoom + viewportOffset.y
    );

    // Use quadratic bezier curves for smooth lines
    for (let i = 1; i < points.length - 1; i++) {
      const xc = ((startX + points[i].x) * zoom + viewportOffset.x + (startX + points[i + 1].x) * zoom + viewportOffset.x) / 2;
      const yc = ((startY + points[i].y) * zoom + viewportOffset.y + (startY + points[i + 1].y) * zoom + viewportOffset.y) / 2;
      ctx.quadraticCurveTo(
        (startX + points[i].x) * zoom + viewportOffset.x,
        (startY + points[i].y) * zoom + viewportOffset.y,
        xc,
        yc
      );
    }

    // Draw the last segment
    if (points.length > 1) {
      const last = points[points.length - 1];
      ctx.lineTo(
        (startX + last.x) * zoom + viewportOffset.x,
        (startY + last.y) * zoom + viewportOffset.y
      );
    }

    ctx.stroke();
  };

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement, isDark: boolean) => {
    const x = element.x * zoom + viewportOffset.x;
    const y = element.y * zoom + viewportOffset.y;
    const width = element.width * zoom;
    const height = element.height * zoom;

    setStrokeStyle(ctx, element.style, isDark);
    setFillStyle(ctx, element.style, isDark, { x, y });

    switch (element.type) {
      case 'rectangle':
        if (element.style.fillStyle !== 'none' && element.style.fillColor !== 'transparent') {
          ctx.fillRect(x, y, width, height);
        }
        ctx.strokeRect(x, y, width, height);
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height / 2);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();
        if (element.style.fillStyle !== 'none' && element.style.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2, 
          y + height / 2, 
          Math.abs(width / 2), 
          Math.abs(height / 2), 
          0, 
          0, 
          Math.PI * 2
        );
        if (element.style.fillStyle !== 'none' && element.style.fillColor !== 'transparent') {
          ctx.fill();
        }
        ctx.stroke();
        break;

      case 'pencil': {
        const pencilEl = element as PencilElement;
        if (pencilEl.points && pencilEl.points.length > 0) {
          drawSmoothLine(ctx, pencilEl.points, element.x, element.y);
        }
        break;
      }

      case 'line': {
        const lineEl = element as LineElement;
        if (lineEl.points && lineEl.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(
            (element.x + lineEl.points[0].x) * zoom + viewportOffset.x,
            (element.y + lineEl.points[0].y) * zoom + viewportOffset.y
          );
          const last = lineEl.points[lineEl.points.length - 1];
          ctx.lineTo(
            (element.x + last.x) * zoom + viewportOffset.x,
            (element.y + last.y) * zoom + viewportOffset.y
          );
          ctx.stroke();
        }
        break;
      }

      case 'arrow': {
        const arrowEl = element as LineElement;
        if (arrowEl.points && arrowEl.points.length >= 2) {
          const start = arrowEl.points[0];
          const end = arrowEl.points[arrowEl.points.length - 1];
          
          const startX = (element.x + start.x) * zoom + viewportOffset.x;
          const startY = (element.y + start.y) * zoom + viewportOffset.y;
          const endX = (element.x + end.x) * zoom + viewportOffset.x;
          const endY = (element.y + end.y) * zoom + viewportOffset.y;

          // Draw line
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLength = 12 * zoom;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;
      }

      case 'text': {
        const fontSizePx = ((element as any).fontSize || 20) * zoom;
        ctx.font = `${fontSizePx}px Assistant, sans-serif`;
        // Adapt text color based on theme
        const textColor = getThemeAdaptedColor(element.style.strokeColorValue, element.style.strokeColor, isDark);
        ctx.fillStyle = textColor;
        // Draw multiline text
        const lineHeight = 1.2;
        const text = (element as any).text || 'Text';
        const lines = String(text).split(/\r?\n/);
        // Use top baseline so y represents the top of the text box
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          ctx.fillText(line, x, y + i * fontSizePx * lineHeight);
        }
        // restore baseline (optional)
        ctx.textBaseline = 'alphabetic';
        break;
      }
        
      case 'image': {
        const imageEl = element as any;
        if (imageEl.imageData && !imageEl._img) {
          const img = new Image();
          img.src = imageEl.imageData;
          imageEl._img = img;
        }
        if (imageEl._img && imageEl._img.complete) {
          ctx.drawImage(imageEl._img, x, y, width, height);
        }
        break;
      }
    }
  }, [viewportOffset, zoom, theme]);

  const render = useCallback(() => {
    // render canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the backgroundColor prop that's controlled by theme
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid - compute color based on theme
    // Determine which theme to use
    let isDark = false;
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    
    const gridSize = 20 * zoom;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;

    const offsetX = viewportOffset.x % gridSize;
    const offsetY = viewportOffset.y % gridSize;

    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = offsetY; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw elements with theme-aware colors
    elements.forEach(element => {
      // Skip drawing the element that's currently being edited to avoid duplicate rendering
      if (editingElementId && element.id === editingElementId) return;
      drawElement(ctx, element, isDark);
    });

    // Draw current drawing element with theme-aware colors
    if (drawingElement) {
      drawElement(ctx, drawingElement, isDark);
    }

    // Draw selection outlines and handles for selected elements
    if (selectedIds && selectedIds.length > 0) {
      selectedIds.forEach(id => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        const x = el.x * zoom + viewportOffset.x;
        const y = el.y * zoom + viewportOffset.y;
        const w = el.width * zoom;
        const h = el.height * zoom;

        ctx.save();
        ctx.strokeStyle = 'rgba(0,120,212,0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        ctx.setLineDash([]);

        // draw small square handles at corners
        const handleSize = Math.max(6, 6 * zoom);
        const handles = [
          { x: x - 4, y: y - 4 },
          { x: x + w + 4 - handleSize, y: y - 4 },
          { x: x - 4, y: y + h + 4 - handleSize },
          { x: x + w + 4 - handleSize, y: y + h + 4 - handleSize },
        ];
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(0,120,212,0.9)';
        handles.forEach(hp => {
          ctx.fillRect(hp.x, hp.y, handleSize, handleSize);
          ctx.strokeRect(hp.x, hp.y, handleSize, handleSize);
        });
        ctx.restore();
      });
    }

    // Draw marquee overlay if active (marquee coords are stored in client space refs)
    if (isMarquee.current && marqueeStart.current) {
      const rect = canvas.getBoundingClientRect();
      const startX = marqueeStart.current.x;
      const startY = marqueeStart.current.y;
      const endX = lastMousePos.current.x;
      const endY = lastMousePos.current.y;
      const x = Math.min(startX, endX) - rect.left;
      const y = Math.min(startY, endY) - rect.top;
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);

      ctx.save();
      ctx.fillStyle = 'rgba(0,120,212,0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,120,212,0.9)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [elements, drawingElement, viewportOffset, zoom, backgroundColor, theme, drawElement]);
  
  // scheduleRender throttles calls to render via requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = window.requestAnimationFrame(() => {
      rafId.current = null;
      render();
    });
  }, [render]);

  // ensure any pending RAFs are cancelled on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (moveRafId.current !== null) {
        cancelAnimationFrame(moveRafId.current);
        moveRafId.current = null;
      }
    };
  }, []);
  

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      scheduleRender();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      scheduleRender();
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, render]);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewportOffset.x) / zoom,
      y: (e.clientY - rect.top - viewportOffset.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'hand' || spacePressed.current || e.button === 1) {
      isPanning.current = true;
      return;
    }

    if (activeTool === 'select') {
      // Convert mouse to canvas-local coords for accurate hit testing
      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hitPadding = 6; // easier to hit thin strokes

      // Check if clicked on an element (topmost first)
      const clickedElement = [...elements].reverse().find(el => {
        const x = el.x * zoom + viewportOffset.x;
        const y = el.y * zoom + viewportOffset.y;
        const w = el.width * zoom;
        const h = el.height * zoom;
        return (
          mx >= Math.min(x, x + w) - hitPadding &&
          mx <= Math.max(x, x + w) + hitPadding &&
          my >= Math.min(y, y + h) - hitPadding &&
          my <= Math.max(y, y + h) + hitPadding
        );
      });

      if (clickedElement) {
        // Select element immediately
        onSelectElement(clickedElement.id, e.shiftKey);
        // Mark as candidate to move; only start real move when mouse moves beyond threshold
        isMovingCandidate.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      } else {
        // start marquee selection
        onClearSelection();
        isMarquee.current = true;
        marqueeStart.current = { x: e.clientX, y: e.clientY };
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    if (activeTool === 'eraser') {
      // start erasing stroke
      isErasing.current = true;
      erasedIds.current = new Set();
      // perform immediate erase at start point
      eraseAtPoint(e.clientX, e.clientY);
      return;
    }

    isDrawing.current = true;
    onStartDrawing(point);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Eraser overlay follow mouse
    if (activeTool === 'eraser') {
      const el = eraserCursorRef.current;
      if (el) {
        const size = Math.max(16, 24);
        el.style.display = 'block';
        el.style.left = `${e.clientX - size / 2}px`;
        el.style.top = `${e.clientY - size / 2}px`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
      }
    }
    if (isPanning.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      onPan({ x: dx, y: dy });
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // If mousedown selected an element but we didn't start moving yet,
    // start moving only after a small drag threshold to allow clicks to select quickly.
    if (isMovingCandidate.current && !isMovingSelection.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 9) { // threshold ~3px
        isMovingSelection.current = true;
        isMovingCandidate.current = false;
        if (onBeginMove) onBeginMove();
        // reset lastMousePos so subsequent movement deltas are correct
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    }

    if (isMovingSelection.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      // accumulate pixel delta converted to canvas coordinates
      moveAccum.current.x += dx / zoom;
      moveAccum.current.y += dy / zoom;
      if (moveRafId.current === null) {
        moveRafId.current = window.requestAnimationFrame(() => {
          moveRafId.current = null;
          if (onMoveSelected) onMoveSelected({ x: moveAccum.current.x, y: moveAccum.current.y });
          moveAccum.current.x = 0;
          moveAccum.current.y = 0;
        });
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isMarquee.current && marqueeStart.current) {
      // update marquee end point and schedule a render (overlay is drawn inside render)
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      scheduleRender();
      return;
    }

    // while erasing, wipe over elements
    if (activeTool === 'eraser' && isErasing.current) {
      eraseAtPoint(e.clientX, e.clientY);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing.current) {
      const point = getCanvasPoint(e);
      onContinueDrawing(point);
    }
  };

  const handleMouseUp = () => {
    // hide eraser overlay
    if (eraserCursorRef.current) {
      eraserCursorRef.current.style.display = 'none';
    }
    // end erasing stroke
    if (isErasing.current) {
      isErasing.current = false;
      erasedIds.current.clear();
    }
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    // If we only clicked (was a candidate) but never moved beyond threshold, treat as click
    if (isMovingCandidate.current && !isMovingSelection.current) {
      isMovingCandidate.current = false;
      return;
    }

    if (isMovingSelection.current) {
      isMovingSelection.current = false;
      if (onEndMove) onEndMove();
      return;
    }

    if (isMarquee.current && marqueeStart.current) {
      // finalize marquee selection
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const start = marqueeStart.current;
        const end = lastMousePos.current;
        const x1 = Math.min(start.x, end.x);
        const y1 = Math.min(start.y, end.y);
        const x2 = Math.max(start.x, end.x);
        const y2 = Math.max(start.y, end.y);

        // convert to canvas coordinates (unzoom, remove viewportOffset)
        const selRect = {
          x: (x1 - rect.left - viewportOffset.x) / zoom,
          y: (y1 - rect.top - viewportOffset.y) / zoom,
          w: (x2 - x1) / zoom,
          h: (y2 - y1) / zoom,
        };

        // select elements that are fully contained inside the marquee (containment)
        onClearSelection();
        elements.forEach(el => {
          const ex = el.x;
          const ey = el.y;
          const ew = el.width;
          const eh = el.height;
          const contained = (
            ex >= selRect.x &&
            ey >= selRect.y &&
            ex + ew <= selRect.x + selRect.w &&
            ey + eh <= selRect.y + selRect.h
          );
          if (contained) {
            onSelectElement(el.id, true);
          }
        });
      }

      isMarquee.current = false;
      marqueeStart.current = null;
      // redraw final
      scheduleRender();
      return;
    }

    if (isDrawing.current) {
      isDrawing.current = false;
      onEndDrawing();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    onZoom(delta, { x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spacePressed.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCursor = () => {
    if (activeTool === 'hand' || spacePressed.current) return 'grab';
    if (activeTool === 'select') return 'default';
    if (activeTool === 'eraser') return 'none';
    return 'crosshair';
  };

  // Helper: check rectangle (x,y,w,h) intersects circle at (cx,cy) with radius r
  const rectIntersectsCircle = (rx: number, ry: number, rw: number, rh: number, cx: number, cy: number, r: number) => {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  };

  // Erase elements under eraser circle at client coordinates
  const eraseAtPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left; // canvas client-space x
    const cy = clientY - rect.top;
    const r = 20; // eraser radius in pixels (client-space)

    // For each element, test intersection with eraser circle
    // Elements stored in canvas coordinates; convert to client-space for test
    elements.forEach(el => {
      const x = el.x * zoom + viewportOffset.x;
      const y = el.y * zoom + viewportOffset.y;
      const w = el.width * zoom;
      const h = el.height * zoom;
      if (erasedIds.current.has(el.id)) return;
      if (rectIntersectsCircle(x, y, w, h, cx, cy, r)) {
        // mark and erase
        erasedIds.current.add(el.id);
        if (onEraseElement) onEraseElement(el.id);
      }
    });
  };

  return (
    <div className="fixed inset-0" style={{ cursor: getCursor() }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full"
      />
      {/* Eraser circular cursor overlay */}
      <div
        ref={eraserCursorRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '2px solid rgba(0,120,212,0.9)',
          background: 'rgba(0,120,212,0.08)',
          pointerEvents: 'none',
          display: 'none',
          transform: 'translate(0,0)'
        }}
      />
    </div>
  );
}
