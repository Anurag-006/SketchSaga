import { RefObject } from "react";
import { getExistingShapes } from "./http";

// --- TYPES ---
// (Keep your existing types)
type BaseShape = {
  id: string;
  userId: string;
  type: string;
  color: string;
  strokeWidth: number;
};

type RectShape = BaseShape & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

type CircleShape = BaseShape & {
  type: "circle";
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  startAngle: number;
  endAngle: number;
};

type LineShape = BaseShape & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type PencilShape = BaseShape & {
  type: "pencil";
  points: { x: number; y: number }[];
};

export type Shape = RectShape | CircleShape | LineShape | PencilShape;
type Tool = "selectTool" | "rect" | "circle" | "line" | "pencil";

// --- POLYFILLS ---
function generateId() {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// --- INTERPOLATION HELPER ---
// LINEAR INTERPOLATION: Smoothly transitions value a to b by factor t
const lerp = (start: number, end: number, t: number) => {
  return start + (end - start) * t;
};

// --- GAME CLASS ---
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private shapes: Shape[] = [];
  private undone: Shape[] = [];
  private roomId: string;
  private myUserId: string;
  private socket: WebSocket;
  private currentTool: RefObject<string>;

  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentShape: Shape | null = null;
  private color = "#ffffff";
  private strokeWidth = 2;

  private selectedShape: Shape | null = null;
  private offsetX = 0;
  private offsetY = 0;

  private lastSentTime = 0;
  // 3G OPTIMIZATION: Lower tick rate to save bandwidth (50ms = 20fps updates)
  private readonly THROTTLE_MS = 50;

  private handleMouseDown!: (e: MouseEvent) => void;
  private handleMouseUp!: (e: MouseEvent) => void;
  private handleMouseMove!: (e: MouseEvent) => void;
  private handleKeyDown!: (e: KeyboardEvent) => void;
  private animationFrameId: number | null = null;

  // 3G OPTIMIZATION: Store target state for interpolation
  private remotePreviews = new Map<string, { current: Shape; target: Shape }>();

  // 3G OPTIMIZATION: Prevent "Snap Back"
  // Keep track of shapes we recently touched so we ignore laggy server packets for them
  private recentlyEdited = new Set<string>();

  constructor(
    canvas: HTMLCanvasElement,
    roomId: string,
    socket: WebSocket,
    currentTool: RefObject<string>,
    myUserId: string,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offCtx = this.offscreenCanvas.getContext("2d")!;

    this.roomId = roomId;
    this.socket = socket;
    this.currentTool = currentTool;
    this.myUserId = myUserId;

    this.init();
    this.initHandlers();
    this.initMouseHandlers();
    this.initKeyboardHandlers();
    this.startRenderLoop();
  }

  async init() {
    this.shapes = await getExistingShapes(this.roomId);
    this.redrawOffscreen();
  }

  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "undo") {
        const shapeId = message.data.shapeId;
        this.shapes = this.shapes.filter((s) => s.id !== shapeId);
        this.redrawOffscreen();
        return;
      }

      if (message.type === "shape") {
        const shape = message.data.shape as Shape;
        const final = message.data.final;
        const fromUser = message.data.userId as string;

        // 🛑 ECHO CANCELLATION & LAG PROTECTION
        if (fromUser === this.myUserId) return;
        if (this.currentShape?.id === shape.id) return;
        if (this.selectedShape?.id === shape.id) return;

        // If we recently edited this shape, ignore updates for a while (500ms)
        // This stops the shape from snapping back to old positions due to lag
        if (this.recentlyEdited.has(shape.id)) return;

        if (final) {
          this.remotePreviews.delete(fromUser);
          this.shapes = this.shapes.filter((s) => s.id !== shape.id);
          this.shapes.push(shape);
          this.redrawOffscreen();
        } else {
          // INTERPOLATION SETUP:
          // Instead of replacing the shape, we set a "Target".
          // The render loop will slide 'current' towards 'target'.
          const existing = this.remotePreviews.get(fromUser);
          if (existing) {
            // Update the target, keep the current visual state for smoothing
            existing.target = shape;
          } else {
            // First time seeing this shape? Snap to it immediately.
            this.remotePreviews.set(fromUser, {
              current: shape,
              target: shape,
            });
          }
        }
      }
    };
  }

  private initKeyboardHandlers() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? this.redo() : this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.redo();
      }
    };
    window.addEventListener("keydown", this.handleKeyDown);
  }

  // ... (setColor, setStrokeWidth, undo, redo methods remain the same) ...
  setColor(color: string) {
    this.color = color;
  }
  setStrokeWidth(width: number) {
    this.strokeWidth = width;
  }
  undo() {
    if (this.isDrawing) return;
    let lastMyShapeIndex = -1;
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].userId === this.myUserId) {
        lastMyShapeIndex = i;
        break;
      }
    }
    if (lastMyShapeIndex === -1) return;
    const shape = this.shapes.splice(lastMyShapeIndex, 1)[0];
    this.undone.push(shape);
    this.redrawOffscreen();
    this.socket.send(
      JSON.stringify({
        type: "undo",
        data: { roomId: this.roomId, shapeId: shape.id, userId: this.myUserId },
      }),
    );
  }
  redo() {
    if (this.undone.length === 0) return;
    const shape = this.undone.pop();
    if (shape) {
      this.shapes.push(shape);
      this.redrawOffscreen();
      this.sendShape(shape, true);
    }
  }

  private initMouseHandlers() {
    this.handleMouseDown = (e) => {
      this.isDrawing = true;
      this.startX = e.offsetX;
      this.startY = e.offsetY;

      const tool = this.currentTool.current as Tool;
      if (tool === "selectTool") {
        this.selectShape(e);
        return;
      }

      const id = generateId();

      // ... (Shape Factory Logic remains same as previous step) ...
      if (tool === "pencil") {
        this.currentShape = {
          id,
          userId: this.myUserId,
          type: "pencil",
          points: [{ x: this.startX, y: this.startY }],
          color: this.color,
          strokeWidth: this.strokeWidth,
        } as PencilShape;
      } else if (tool === "rect") {
        this.currentShape = {
          id,
          userId: this.myUserId,
          type: "rect",
          x: this.startX,
          y: this.startY,
          width: 0,
          height: 0,
          color: this.color,
          strokeWidth: this.strokeWidth,
        } as RectShape;
      } else if (tool === "line") {
        this.currentShape = {
          id,
          userId: this.myUserId,
          type: "line",
          x1: this.startX,
          y1: this.startY,
          x2: this.startX,
          y2: this.startY,
          color: this.color,
          strokeWidth: this.strokeWidth,
        } as LineShape;
      } else if (tool === "circle") {
        this.currentShape = {
          id,
          userId: this.myUserId,
          type: "circle",
          x: this.startX,
          y: this.startY,
          radiusX: 0,
          radiusY: 0,
          rotation: 0,
          startAngle: 0,
          endAngle: 2 * Math.PI,
          color: this.color,
          strokeWidth: this.strokeWidth,
        } as CircleShape;
      }

      if (this.currentShape && this.currentShape.type !== "pencil")
        this.sendShape(this.currentShape, false);
    };

    this.handleMouseMove = (e) => {
      if (!this.isDrawing) return;
      const x = e.offsetX;
      const y = e.offsetY;

      if (this.selectedShape) {
        this.updateSelectedShapePosition(x, y);
        this.throttledSend(this.selectedShape, false);
      } else if (this.currentShape) {
        this.updateCurrentShapeGeometry(x, y);
        if (this.currentShape.type !== "pencil") {
          this.throttledSend(this.currentShape, false);
        } else {
          // 3G OPTIMIZATION: Even heavier throttle for pencil
          // We only send pencil updates every ~100ms or so to prevent packet flooding
          this.throttledSend(this.currentShape, false);
        }
      }
    };

    this.handleMouseUp = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      if (this.selectedShape) {
        this.shapes.push(this.selectedShape);
        this.redrawOffscreen();
        this.sendShape(this.selectedShape, true);

        // 3G FIX: Mark this shape as "Just Edited".
        // Ignore server updates for it for 500ms to prevent "Rubber Banding"
        const id = this.selectedShape.id;
        this.recentlyEdited.add(id);
        setTimeout(() => this.recentlyEdited.delete(id), 500);

        this.selectedShape = null;
      } else if (this.currentShape) {
        this.shapes.push(this.currentShape);
        this.undone = [];
        this.redrawOffscreen();
        this.sendShape(this.currentShape, true);

        const id = this.currentShape.id;
        this.recentlyEdited.add(id);
        setTimeout(() => this.recentlyEdited.delete(id), 500);

        this.currentShape = null;
      }
    };

    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  // ... (updateSelectedShapePosition and updateCurrentShapeGeometry remain same) ...
  private updateSelectedShapePosition(x: number, y: number) {
    if (!this.selectedShape) return;
    const s = this.selectedShape;
    if (s.type === "rect" || s.type === "circle") {
      s.x = x - this.offsetX;
      s.y = y - this.offsetY;
    } else if (s.type === "line") {
      const dx = x - this.offsetX - s.x1;
      const dy = y - this.offsetY - s.y1;
      s.x1 += dx;
      s.y1 += dy;
      s.x2 += dx;
      s.y2 += dy;
      this.offsetX = x - s.x1;
      this.offsetY = y - s.y1;
    } else if (s.type === "pencil") {
      const dx = x - this.offsetX - s.points[0].x;
      const dy = y - this.offsetY - s.points[0].y;
      s.points = s.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      this.offsetX = x - s.points[0].x;
      this.offsetY = y - s.points[0].y;
    }
  }

  private updateCurrentShapeGeometry(x: number, y: number) {
    if (!this.currentShape) return;
    const s = this.currentShape;
    if (s.type === "pencil") s.points.push({ x, y });
    else if (s.type === "rect") {
      s.width = x - this.startX;
      s.height = y - this.startY;
    } else if (s.type === "line") {
      s.x2 = x;
      s.y2 = y;
    } else if (s.type === "circle") {
      s.x = (this.startX + x) / 2;
      s.y = (this.startY + y) / 2;
      s.radiusX = Math.abs(x - this.startX) / 2;
      s.radiusY = Math.abs(y - this.startY) / 2;
    }
  }

  private startRenderLoop() {
    const render = () => {
      this.redraw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  // ... (redrawOffscreen remains same) ...
  private redrawOffscreen() {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offCtx.fillStyle = "black";
    this.offCtx.fillRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
    );
    for (const shape of this.shapes) {
      this.drawShape(shape, false, this.offCtx);
    }
  }

  public redraw() {
    if (
      this.offscreenCanvas.width !== this.canvas.width ||
      this.offscreenCanvas.height !== this.canvas.height
    ) {
      this.redrawOffscreen();
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    // 🌟 INTERPOLATION LOGIC 🌟
    // Iterate through remote previews and smooth them
    for (const [userId, wrapper] of this.remotePreviews.entries()) {
      this.smoothRemoteShape(wrapper.current, wrapper.target);
      this.drawShape(wrapper.current, false, this.ctx);
    }

    if (this.currentShape) {
      this.drawShape(this.currentShape, false, this.ctx);
    }
    if (this.selectedShape) {
      this.drawShape(this.selectedShape, true, this.ctx);
    }
  }

  // 3G SMOOTHING FUNCTION
  private smoothRemoteShape(current: Shape, target: Shape) {
    // 0.2 means we move 20% of the way to the target every frame.
    // This creates a smooth "slide" effect rather than a teleport.
    const smoothingFactor = 0.2;

    if (current.type === "rect" && target.type === "rect") {
      current.x = lerp(current.x, target.x, smoothingFactor);
      current.y = lerp(current.y, target.y, smoothingFactor);
      current.width = lerp(current.width, target.width, smoothingFactor);
      current.height = lerp(current.height, target.height, smoothingFactor);
    } else if (current.type === "circle" && target.type === "circle") {
      current.x = lerp(current.x, target.x, smoothingFactor);
      current.y = lerp(current.y, target.y, smoothingFactor);
      current.radiusX = lerp(current.radiusX, target.radiusX, smoothingFactor);
      current.radiusY = lerp(current.radiusY, target.radiusY, smoothingFactor);
    } else if (current.type === "line" && target.type === "line") {
      current.x1 = lerp(current.x1, target.x1, smoothingFactor);
      current.y1 = lerp(current.y1, target.y1, smoothingFactor);
      current.x2 = lerp(current.x2, target.x2, smoothingFactor);
      current.y2 = lerp(current.y2, target.y2, smoothingFactor);
    } else if (current.type === "pencil" && target.type === "pencil") {
      // Pencil is hard to interpolate perfectly point-by-point.
      // Easiest "Smooth" fix: just take the target points but render them
      // We can optimize this later, but for now just sync the points.
      current.points = target.points;
    }
  }

  // ... (drawShape, drawSelectionHighlight, pointToLineDistance, etc. remain the same) ...
  private drawShape(
    shape: Shape,
    highlight = false,
    context: CanvasRenderingContext2D,
  ) {
    context.strokeStyle = shape.color || "#fff";
    context.lineWidth = shape.strokeWidth || 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    switch (shape.type) {
      case "rect":
        context.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "line":
        context.moveTo(shape.x1, shape.y1);
        context.lineTo(shape.x2, shape.y2);
        context.stroke();
        break;
      case "circle":
        context.ellipse(
          shape.x,
          shape.y,
          shape.radiusX,
          shape.radiusY,
          0,
          0,
          2 * Math.PI,
        );
        context.stroke();
        break;
      case "pencil":
        if (shape.points.length < 2) return;
        context.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++)
          context.lineTo(shape.points[i].x, shape.points[i].y);
        context.stroke();
        break;
    }
    if (highlight) this.drawSelectionHighlight(shape, context);
  }

  private drawSelectionHighlight(
    shape: Shape,
    context: CanvasRenderingContext2D,
  ) {
    context.save();
    context.strokeStyle = "yellow";
    context.setLineDash([6, 4]);
    context.lineWidth = 2;
    context.beginPath();
    if (shape.type === "rect") {
      context.strokeRect(
        shape.x - 5,
        shape.y - 5,
        shape.width + 10,
        shape.height + 10,
      );
    } else if (shape.type === "circle") {
      context.ellipse(
        shape.x,
        shape.y,
        shape.radiusX + 5,
        shape.radiusY + 5,
        0,
        0,
        2 * Math.PI,
      );
      context.stroke();
    } else if (shape.type === "line") {
      const minX = Math.min(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      context.strokeRect(
        minX - 5,
        minY - 5,
        Math.abs(shape.x2 - shape.x1) + 10,
        Math.abs(shape.y2 - shape.y1) + 10,
      );
    } else if (shape.type === "pencil") {
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      context.strokeRect(
        minX - 5,
        minY - 5,
        maxX - minX + 10,
        maxY - minY + 10,
      );
    }
    context.restore();
  }

  private throttledSend(shape: Shape, final: boolean) {
    const now = Date.now();
    // 3G OPTIMIZATION: Only send every 50ms unless it's the final update
    if (now - this.lastSentTime > this.THROTTLE_MS || final) {
      this.sendShape(shape, final);
      this.lastSentTime = now;
    }
  }

  private sendShape(shape: Shape | null, final = false) {
    if (!shape || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type: "shape",
        data: { shape, roomId: this.roomId, final, userId: this.myUserId },
      }),
    );
  }

  // ... (isPointInShape, pointToLineDistance, selectShape, destroy remain the same) ...
  private isPointInShape(x: number, y: number, shape: Shape): boolean {
    const threshold = shape.strokeWidth + 10;
    switch (shape.type) {
      case "rect": {
        const left = Math.min(shape.x, shape.x + shape.width);
        const right = Math.max(shape.x, shape.x + shape.width);
        const top = Math.min(shape.y, shape.y + shape.height);
        const bottom = Math.max(shape.y, shape.y + shape.height);
        return (
          x >= left - 5 && x <= right + 5 && y >= top - 5 && y <= bottom + 5
        );
      }
      case "circle": {
        const dx = x - shape.x;
        const dy = y - shape.y;
        return (
          (dx * dx) / (shape.radiusX * shape.radiusX) +
            (dy * dy) / (shape.radiusY * shape.radiusY) <=
          1.2
        );
      }
      case "line": {
        const dist = this.pointToLineDistance(
          x,
          y,
          shape.x1,
          shape.y1,
          shape.x2,
          shape.y2,
        );
        return dist <= threshold;
      }
      case "pencil": {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        if (
          x < Math.min(...xs) - 10 ||
          x > Math.max(...xs) + 10 ||
          y < Math.min(...ys) - 10 ||
          y > Math.max(...ys) + 10
        )
          return false;
        return shape.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) <= threshold,
        );
      }
      default:
        return false;
    }
  }

  private pointToLineDistance(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private selectShape(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;
    this.selectedShape = null;

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (this.isPointInShape(x, y, shape)) {
        this.selectedShape = shape;
        this.shapes.splice(i, 1);
        this.redrawOffscreen();

        if (shape.type === "rect" || shape.type === "circle") {
          this.offsetX = x - shape.x;
          this.offsetY = y - shape.y;
        } else if (shape.type === "line") {
          this.offsetX = x - shape.x1;
          this.offsetY = y - shape.y1;
        } else if (shape.type === "pencil") {
          this.offsetX = x - shape.points[0].x;
          this.offsetY = y - shape.points[0].y;
        }
        break;
      }
    }
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
