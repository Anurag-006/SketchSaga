import { RefObject } from "react";
import { getExistingShapes } from "./http";

type Shape =
  | {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    strokeWidth: number;
  }
  | {
    type: "circle";
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
    rotation: number;
    startAngle: number;
    endAngle: number;
    color: string;
    strokeWidth: number;
  }
  | {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    strokeWidth: number;
  };

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[];
  private roomId: string;
  private socket: WebSocket;
  private mouseClicked: boolean;
  private startX: number;
  private startY: number;
  private currentShape: RefObject<string>;
  private prevX: number;
  private prevY: number;
  private drawing: boolean;
  private points: { x: number, y: number }[];
  private pencilBuffer: Shape[];
  private pencilSendTimeout: number | undefined;
  private lastDrawTime: number;
  private color: string;
  private strokeWidth: number;
  private handleMouseDown!: (e: MouseEvent) => void;
  private handleMouseUp!: (e: MouseEvent) => void;
  private handleMouseMove!: (e: MouseEvent) => void;
  // private setStrokeStyle: (shape?:Shape) => void;

  constructor(
    canvas: HTMLCanvasElement,
    roomId: string,
    socket: WebSocket,
    currentShape: RefObject<string>,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.existingShapes = [];
    this.roomId = roomId;
    this.socket = socket;
    this.mouseClicked = false;
    this.startX = 0;
    this.startY = 0;
    this.currentShape = currentShape;
    this.prevX = -1;
    this.prevY = -1;
    this.drawing = false;
    this.lastDrawTime = 0;
    this.color = "#ffffff";
    this.strokeWidth = 2;
    this.pencilBuffer = [];
    this.points = [];
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
    // this.setStrokeStyle();
  }
  async init() {
    this.existingShapes = await getExistingShapes(this.roomId);
    this.clearCanvas();
  }
  initHandlers() {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "chat") {
        const parsedShape = JSON.parse(message.data.message);
        this.existingShapes.push(parsedShape);
        this.clearCanvas();
      }
    };
  }

  setColor(color: string) {
    this.color = color;
  }

  setStrokeWidth(width: number) {
    this.strokeWidth = width;
  }


  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgba(0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.existingShapes.map((shape) => {
      this.ctx.strokeStyle = shape.color || "white";
      this.ctx.lineWidth = shape.strokeWidth || 2;

      // this.setStrokeStyle(shape);
      if (shape.type === "rect") {
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      }
      if (shape.type === "line") {
        this.ctx.moveTo(shape.x1, shape.y1);
        this.ctx.lineTo(shape.x2, shape.y2);
        this.ctx.stroke();
      }
      if (shape.type === "circle") {
        this.ctx.beginPath();
        this.ctx.ellipse(
          shape.x,
          shape.y,
          shape.radiusX,
          shape.radiusY,
          0,
          0,
          2 * Math.PI,
        );
        this.ctx.stroke();
      }
    });
  }

  sendBufferedPencil = () => {
    if (this.pencilBuffer.length > 0) {
      this.pencilBuffer.forEach((shape) => this.sendShape(shape));
      this.pencilBuffer = [];
    }
  };

  setStrokeStyle = (shape?: Shape) => {
    this.ctx.strokeStyle = shape?.color || this.color || "#ffffff";
    this.ctx.lineWidth = shape?.strokeWidth || this.strokeWidth || 2;
  }

  initMouseHandlers() {
    this.handleMouseDown = (e) => {
      this.drawing = true;
      this.points = [{ x: e.clientX, y: e.clientY }];
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.mouseClicked = true;

      if (this.currentShape.current === "selectTool") {
        this.selectShape(e);
      }
    };

    this.handleMouseUp = (e) => {
      if (this.currentShape.current === "rect") {
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;
        const shape = {
          type: "rect",
          x: this.startX,
          y: this.startY,
          width,
          height,
          color: this.color,
          strokeWidth: this.strokeWidth
        } as Shape;

        this.drawing = false;
        this.sendShape(shape);
      }

      if (this.currentShape.current === "line") {
        const shape = {
          type: "line",
          x1: this.startX,
          y1: this.startY,
          x2: e.clientX,
          y2: e.clientY,
          color: this.color,
          strokeWidth: this.strokeWidth
        } as Shape;

        this.sendShape(shape);
      }

      if (this.currentShape.current === "circle") {
        const shape = {
          type: "circle",
          x: Math.abs(this.startX + (e.clientX - this.startX) / 2),
          y: Math.abs(this.startY + (e.clientY - this.startY) / 2),
          radiusX: Math.abs((e.clientX - this.startX) / 2),
          radiusY: Math.abs((e.clientY - this.startY) / 2),
          rotation: 0,
          startAngle: 0,
          endAngle: 2 * Math.PI,
          color: this.color,
          strokeWidth: this.strokeWidth
        } as Shape;

        this.sendShape(shape);
      }

      if (this.currentShape.current === "pencil") {
        this.sendBufferedPencil();
        this.prevX = -1;
        this.prevY = -1;
      }

      this.mouseClicked = false;
    };


    this.handleMouseMove = (e) => {

      if (!this.mouseClicked) return;

      if (!this.drawing) return;

      if (this.currentShape.current === "pencil") {

        const now = performance.now();
        if (now - this.lastDrawTime < 16) return;
        this.lastDrawTime = now;

        if (this.prevX === -1) {
          this.prevX = this.startX;
          this.prevY = this.startY;
        }

        const shape = {
          type: "line",
          x1: this.prevX,
          y1: this.prevY,
          x2: e.clientX,
          y2: e.clientY,
          color: this.color,
          strokeWidth: this.strokeWidth
        } as Shape;

        if (shape.type !== "line") return;

        this.prevX = e.clientX;
        this.prevY = e.clientY;
        this.setStrokeStyle(shape);
        this.ctx.beginPath();
        this.ctx.moveTo(shape.x1, shape.y1);
        this.ctx.lineTo(shape.x2, shape.y2);
        this.ctx.stroke();
        this.pencilBuffer.push(shape);

        if (!this.pencilSendTimeout) {
          this.pencilSendTimeout = window.setTimeout(() => {
            this.sendBufferedPencil();
            this.pencilSendTimeout = undefined;
          }, 100)
        }
      }
      else if (this.currentShape.current !== "pencil") {
        this.clearCanvas();
        this.drawShape(e, this.currentShape.current);
      }
    };

    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  sendShape(shape: Shape) {
    const stringShape = JSON.stringify(shape);

    const socketMsg = {
      type: "chat",
      data: {
        message: stringShape,
        roomId: Number(this.roomId),
      },
    };

    const finalMsg = JSON.stringify(socketMsg);

    console.log("Sending shape from socket: ", finalMsg);

    this.socket.send(finalMsg);

    this.existingShapes.push(shape as Shape);

    this.clearCanvas();
  }

  drawShape(event: MouseEvent, currentShape: string) {
    if (currentShape === "rect") {

      const width = event.clientX - this.startX;
      const height = event.clientY - this.startY;

      const shape = {
        type: "rect",
        x: this.startX,
        y: this.startY,
        width,
        height,
        color: this.color,
        strokeWidth: this.strokeWidth
      } as Shape;

      this.setStrokeStyle(shape);

      this.ctx.strokeRect(this.startX, this.startY, width, height);
    }
    if (currentShape === "line") {
      const shape: Shape = {
        type: "line",
        x1: this.startX,
        y1: this.startY,
        x2: event.clientX,
        y2: event.clientY,
        color: this.color,
        strokeWidth: this.strokeWidth,
      };
      this.setStrokeStyle(shape);
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(event.clientX, event.clientY);
      this.ctx.stroke();
    }
    if (currentShape === "circle") {
      const shape = {
        type: "circle",
        x: Math.abs(this.startX + (event.clientX - this.startX) / 2),
        y: Math.abs(this.startY + (event.clientY - this.startY) / 2),
        radiusX: Math.abs((event.clientX - this.startX) / 2),
        radiusY: Math.abs((event.clientY - this.startY) / 2),
        rotation: 0,
        startAngle: 0,
        endAngle: 2 * Math.PI,
        color: this.color,
        strokeWidth: this.strokeWidth
      } as Shape;

      this.setStrokeStyle(shape);
      this.ctx.beginPath();
      this.ctx.ellipse(
        Math.abs(this.startX + (event.clientX - this.startX) / 2),
        Math.abs(this.startY + (event.clientY - this.startY) / 2),
        Math.abs((event.clientX - this.startX) / 2),
        Math.abs((event.clientY - this.startY) / 2),
        0,
        0,
        2 * Math.PI,
      );
      this.ctx.stroke();
    }
    if (currentShape === "pencil") {
      // if (this.prevX === -1) {
      //   this.prevX = this.startX;
      //   this.prevY = this.startY;
      // }

      // this.ctx.beginPath();
      // this.ctx.moveTo(this.prevX, this.prevY);
      // this.ctx.lineTo(event.clientX, event.clientY);
      // this.ctx.strokeStyle = "rgba(255, 255, 255)";
      // this.ctx.stroke();

      // const shape = {
      //   type: "line",
      //   x1: this.prevX,
      //   y1: this.prevY,
      //   x2: event.clientX,
      //   y2: event.clientY,
      // } as Shape;
      // this.prevX = event.clientX;
      // this.prevY = event.clientY;

      // this.sendShape(shape);

      return;
    }
  }

  // Select Functionality

selectShape(e: MouseEvent) {
  const x = e.clientX;
  const y = e.clientY;

  let shapeSelected = false;
  const updatedShapes = this.existingShapes.map((shape) => {
    if (shapeSelected) return shape; 

    let isSelected = false;

    if (shape.type === "rect") {
      const x1 = Math.min(shape.x, shape.x + shape.width);
      const x2 = Math.max(shape.x, shape.x + shape.width);
      const y1 = Math.min(shape.y, shape.y + shape.height);
      const y2 = Math.max(shape.y, shape.y + shape.height);
      isSelected = x >= x1 && x <= x2 && y >= y1 && y <= y2;
    }

    if (shape.type === "circle") {
      const dx = x - shape.x;
      const dy = y - shape.y;
      isSelected =
        (dx * dx) / (shape.radiusX * shape.radiusX) +
        (dy * dy) / (shape.radiusY * shape.radiusY) <= 1;
    }

    if (shape.type === "line") {
      const distance = this.pointToLineDistance(x, y, shape);
      isSelected = distance < 5;
    }

    if (isSelected) {
      shapeSelected = true;
      return { ...shape, color: "#155bdf" };
    }

    return shape;
  });

  this.existingShapes = updatedShapes;
  this.clearCanvas();
}


  pointToLineDistance(
    x: number,
    y: number,
    line: { x1: number; y1: number; x2: number; y2: number },
  ): number {
    const { x1, y1, x2, y2 } = line;
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

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

  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
