export type ToolType = 
  | 'select' 
  | 'hand' 
  | 'rectangle' 
  | 'diamond' 
  | 'ellipse' 
  | 'arrow' 
  | 'line' 
  | 'pencil' 
  | 'text' 
  | 'image' 
  | 'eraser';

export type StrokeColor = 'blue' | 'black' | 'green' | 'red' | 'orange' | 'custom';
export type FillColor = 'transparent' | 'lightBlue' | 'lightGreen' | 'lightPink' | 'lightYellow' | 'custom';
export type FillStyle = 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'zigzag' | 'none';
export type StrokeWidth = 'thin' | 'medium' | 'thick';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface Point {
  x: number;
  y: number;
}

export interface ElementStyle {
  strokeColor: StrokeColor;
  strokeColorValue: string;
  fillColor: FillColor;
  fillColorValue: string;
  fillStyle: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  style: ElementStyle;
  isSelected?: boolean;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
}

export interface DiamondElement extends BaseElement {
  type: 'diamond';
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface LineElement extends BaseElement {
  type: 'line' | 'arrow';
  points: Point[];
}

export interface PencilElement extends BaseElement {
  type: 'pencil';
  points: Point[];
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export type CanvasElement = 
  | RectangleElement 
  | DiamondElement 
  | EllipseElement 
  | LineElement 
  | PencilElement 
  | TextElement 
  | ImageElement;

export interface CanvasState {
  elements: CanvasElement[];
  viewportOffset: Point;
  zoom: number;
  backgroundColor: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Room {
  id: string;
  createdBy: string;
  shareLink: string;
}
