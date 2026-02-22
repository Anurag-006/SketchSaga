//TODO: Add Global undo and redo functionality.

import { RefObject } from "react";
import { getExistingShapes } from "./http";

type BaseShape = {
  id: string;
  userId: string; // <-- Added to track ownership for Undo
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
  private handleMouseDown!: (e: MouseEvent) => void;
  private handleMouseUp!: (e: MouseEvent) => void;
  private handleMouseMove!: (e: MouseEvent) => void;
  private handleKeyDown!: (e: KeyboardEvent) => void;
  private remotePreviews = new Map<string, Shape>();

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

      // Handle Remote Undo
      if (message.type === "undo") {
        const shapeId = message.data.shapeId;
        this.shapes = this.shapes.filter((s) => s.id !== shapeId);
        this.redrawOffscreen();
        this.redraw();
        return;
      }

      if (message.type === "shape") {
        const shape = message.data.shape as Shape;
        const final = message.data.final;
        const fromUser = message.data.userId as string;

        if (fromUser === this.myUserId) return;

        if (final) {
          this.remotePreviews.delete(fromUser);
          this.shapes = this.shapes.filter((s) => s.id !== shape.id);
          this.shapes.push(shape);
          this.redrawOffscreen();
        } else {
          this.remotePreviews.set(fromUser, shape);
        }
      }

      if (message.type === "chat") {
        console.log("Chat msg: ", message.data.message);
      }
    };
  }

  private initKeyboardHandlers() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.redo();
      }
    };
    window.addEventListener("keydown", this.handleKeyDown);
  }

  setColor(color: string) {
    this.color = color;
  }

  setStrokeWidth(width: number) {
    this.strokeWidth = width;
  }

  undo() {
    // Find the LAST shape drawn by THIS specific user
    let lastMyShapeIndex = -1;
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].userId === this.myUserId) {
        lastMyShapeIndex = i;
        break;
      }
    }

    if (lastMyShapeIndex === -1) return;

    // Remove optimistically
    const shape = this.shapes.splice(lastMyShapeIndex, 1)[0];
    this.undone.push(shape);

    this.redrawOffscreen();
    this.redraw();

    // Broadcast the undo to the network
    this.socket.send(
      JSON.stringify({
        type: "undo",
        data: {
          roomId: this.roomId,
          shapeId: shape.id,
          userId: this.myUserId,
        },
      }),
    );
  }

  redo() {
    if (this.undone.length === 0) return;
    const shape = this.undone.pop();
    if (shape) {
      this.shapes.push(shape);
      this.redrawOffscreen();
      this.redraw();

      // Resend it to the network as a new shape
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

      const id = crypto.randomUUID();

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

      if (this.currentShape) this.sendShape(this.currentShape, false);
    };

    this.handleMouseMove = (e) => {
      if (!this.isDrawing) return;

      const tool = this.currentTool.current as Tool;
      const x = e.offsetX;
      const y = e.offsetY;

      if (!this.currentShape && tool !== "selectTool") return;

      if (tool === "pencil" && this.currentShape?.type === "pencil") {
        (this.currentShape as PencilShape).points.push({ x, y });
      } else if (tool === "rect" && this.currentShape?.type === "rect") {
        (this.currentShape as RectShape).width = x - this.startX;
        (this.currentShape as RectShape).height = y - this.startY;
      } else if (tool === "line" && this.currentShape?.type === "line") {
        (this.currentShape as LineShape).x2 = x;
        (this.currentShape as LineShape).y2 = y;
      } else if (tool === "circle" && this.currentShape?.type === "circle") {
        (this.currentShape as CircleShape).x = (this.startX + x) / 2;
        (this.currentShape as CircleShape).y = (this.startY + y) / 2;
        (this.currentShape as CircleShape).radiusX =
          Math.abs(x - this.startX) / 2;
        (this.currentShape as CircleShape).radiusY =
          Math.abs(y - this.startY) / 2;
      } else if (tool === "selectTool" && this.selectedShape) {
        switch (this.selectedShape.type) {
          case "rect":
          case "circle":
            this.selectedShape.x = x - this.offsetX;
            this.selectedShape.y = y - this.offsetY;
            break;
          case "line":
            const dx = x - this.offsetX - this.selectedShape.x1;
            const dy = y - this.offsetY - this.selectedShape.y1;
            this.selectedShape.x1 += dx;
            this.selectedShape.y1 += dy;
            this.selectedShape.x2 += dx;
            this.selectedShape.y2 += dy;
            this.offsetX = x - this.selectedShape.x1;
            this.offsetY = y - this.selectedShape.y1;
            break;
          case "pencil":
            const dxP = x - this.offsetX - this.selectedShape.points[0].x;
            const dyP = y - this.offsetY - this.selectedShape.points[0].y;
            this.selectedShape.points = this.selectedShape.points.map((p) => ({
              x: p.x + dxP,
              y: p.y + dyP,
            }));
            this.offsetX = x - this.selectedShape.points[0].x;
            this.offsetY = y - this.selectedShape.points[0].y;
            break;
        }
        this.redraw();
        if (this.selectedShape.type !== "pencil") {
          this.sendShape(this.selectedShape, false);
        }
      }

      this.redraw();

      if (this.currentShape && this.currentShape.type !== "pencil") {
        this.sendShape(this.currentShape, false);
      }
    };

    this.handleMouseUp = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      const tool = this.currentTool.current as Tool;

      if (tool !== "selectTool") {
        if (this.currentShape) {
          this.shapes.push(this.currentShape);
          this.undone = []; // Clear redo stack on new drawing
          this.redrawOffscreen();
          this.sendShape(this.currentShape, true);
          this.currentShape = null;
        }
      }

      if (this.selectedShape) {
        this.shapes = this.shapes.filter(
          (s) => s.id !== this.selectedShape!.id,
        );
        this.shapes.push(this.selectedShape);
        this.redrawOffscreen();
        this.sendShape(this.selectedShape, true);
        this.selectedShape = null;
      }
    };

    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  private startRenderLoop() {
    const render = () => {
      this.redraw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  private redrawOffscreen() {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    this.offCtx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
    );
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

    for (const shape of this.remotePreviews.values()) {
      this.drawShape(shape, false, this.ctx);
    }

    if (this.currentShape) {
      this.drawShape(
        this.currentShape,
        this.currentShape === this.selectedShape,
        this.ctx,
      );
    }

    if (this.selectedShape && this.selectedShape !== this.currentShape) {
      this.drawShape(this.selectedShape, true, this.ctx);
    }
  }

  private drawShape(
    shape: Shape,
    highlight = false,
    context: CanvasRenderingContext2D = this.ctx,
  ) {
    context.strokeStyle = shape.color || "#fff";
    context.lineWidth = shape.strokeWidth || 2;

    switch (shape.type) {
      case "rect":
        context.strokeRect(shape.x, shape.y, shape.width, shape.height);
        if (highlight) this.drawHighlightRect(shape, context);
        break;
      case "line":
        context.beginPath();
        context.moveTo(shape.x1, shape.y1);
        context.lineTo(shape.x2, shape.y2);
        context.stroke();
        if (highlight) this.drawHighlightLine(shape, context);
        break;
      case "circle":
        context.beginPath();
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
        if (highlight) this.drawHighlightCircle(shape, context);
        break;
      case "pencil":
        const pencil = shape as PencilShape;
        if (pencil.points.length >= 2) {
          context.beginPath();
          context.moveTo(pencil.points[0].x, pencil.points[0].y);
          for (let i = 1; i < pencil.points.length; i++) {
            context.lineTo(pencil.points[i].x, pencil.points[i].y);
          }
          context.stroke();
        }
        if (highlight) this.drawHighlightPencil(shape, context);
        break;
    }
  }

  private drawHighlightRect(
    shape: RectShape,
    context: CanvasRenderingContext2D,
  ) {
    context.save();
    context.strokeStyle = "yellow";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.strokeRect(
      shape.x - 5,
      shape.y - 5,
      shape.width + 10,
      shape.height + 10,
    );
    context.restore();
  }

  private drawHighlightLine(
    shape: LineShape,
    context: CanvasRenderingContext2D,
  ) {
    context.save();
    context.strokeStyle = "yellow";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.strokeRect(
      Math.min(shape.x1, shape.x2) - 5,
      Math.min(shape.y1, shape.y2) - 5,
      Math.abs(shape.x2 - shape.x1) + 10,
      Math.abs(shape.y2 - shape.y1) + 10,
    );
    context.restore();
  }

  private drawHighlightCircle(
    shape: CircleShape,
    context: CanvasRenderingContext2D,
  ) {
    context.save();
    context.strokeStyle = "yellow";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.beginPath();
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
    context.restore();
  }

  private drawHighlightPencil(
    shape: PencilShape,
    context: CanvasRenderingContext2D,
  ) {
    const xs = shape.points.map((p) => p.x);
    const ys = shape.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    context.save();
    context.strokeStyle = "yellow";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
    context.restore();
  }

  private sendShape(shape: Shape | null, final = false) {
    if (!shape) return;
    this.socket.send(
      JSON.stringify({
        type: "shape",
        data: {
          shape,
          roomId: this.roomId,
          final,
          userId: this.myUserId,
        },
      }),
    );
  }

  private isPointInShape(x: number, y: number, shape: Shape): boolean {
    switch (shape.type) {
      case "rect":
        return (
          x >= shape.x &&
          x <= shape.x + shape.width &&
          y >= shape.y &&
          y <= shape.y + shape.height
        );
      case "circle":
        const dx = x - shape.x;
        const dy = y - shape.y;
        return (
          (dx * dx) / (shape.radiusX * shape.radiusX) +
            (dy * dy) / (shape.radiusY * shape.radiusY) <=
          1
        );
      case "line":
        return this.pointToLineDistance(x, y, shape) <= shape.strokeWidth + 5;
      case "pencil":
        return shape.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) < shape.strokeWidth + 5,
        );
      default:
        return false;
    }
  }

  private pointToLineDistance(x: number, y: number, line: LineShape): number {
    const { x1, y1, x2, y2 } = line;
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

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
    return Math.hypot(x - xx, y - yy);
  }

  private selectShape(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (this.isPointInShape(x, y, shape)) {
        this.selectedShape = shape;
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
        return;
      }
    }
    this.selectedShape = null;
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
