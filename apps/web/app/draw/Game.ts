import { RefObject } from "react";
import { getExistingShapes } from "./http";

type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
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
    }
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
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
    this.init();
    this.initHandlers();
    this.initMouseHandlers();
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

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgba(0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.existingShapes.map((shape) => {
      if (shape.type === "rect") {
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      }
      if (shape.type === "line") {
        this.ctx.moveTo(shape.x1, shape.y1);
        this.ctx.lineTo(shape.x2, shape.y2);
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
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
        this.ctx.strokeStyle = "rgba(255, 255, 255)";
        this.ctx.stroke();
      }
    });
  }

  initMouseHandlers() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.mouseClicked = true;
    });

    this.canvas.addEventListener("mouseup", (e) => {
      let shape = {};

      if (this.currentShape.current === "rect") {
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;
        shape = {
          type: "rect",
          x: this.startX,
          y: this.startY,
          width,
          height,
        } as Shape;
      }

      if (this.currentShape.current === "line") {
        shape = {
          type: "line",
          x1: this.startX,
          y1: this.startY,
          x2: e.clientX,
          y2: e.clientY,
        } as Shape;
      }

      if (this.currentShape.current === "circle") {
        shape = {
          type: "circle",
          x: Math.abs(this.startX + (e.clientX - this.startX) / 2),
          y: Math.abs(this.startY + (e.clientY - this.startY) / 2),
          radiusX: Math.abs((e.clientX - this.startX) / 2),
          radiusY: Math.abs((e.clientY - this.startY) / 2),
          rotation: 0,
          startAngle: 0,
          endAngle: 2 * Math.PI,
        } as Shape;
      }

      if (this.currentShape.current === "pencil") {
        this.prevX = -1;
        this.prevY = -1;
      }

      const stringShape = JSON.stringify(shape);

      const socketMsg = {
        type: "chat",
        data: {
          message: stringShape,
          roomId: this.roomId,
        },
      };

      const finalMsg = JSON.stringify(socketMsg);

      console.log(JSON.parse(finalMsg));

      this.socket.send(finalMsg);

      this.existingShapes.push(shape as Shape);

      this.clearCanvas();

      this.mouseClicked = false;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.mouseClicked) {
        this.clearCanvas();
        this.drawShape(e, this.currentShape.current);
      }
    });
  }

  drawShape(event: MouseEvent, currentShape: string) {
    if (currentShape === "rect") {
      const width = event.clientX - this.startX;
      const height = event.clientY - this.startY;
      this.ctx.strokeStyle = "rgba(255, 255, 255)";
      this.ctx.strokeRect(this.startX, this.startY, width, height);
    }
    if (currentShape === "line") {
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(event.clientX, event.clientY);
      this.ctx.strokeStyle = "rgba(255, 255, 255)";
      this.ctx.stroke();
    }
    if (currentShape === "circle") {
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
      this.ctx.strokeStyle = "rgba(255, 255, 255)";
      this.ctx.stroke();
    }
    if (currentShape === "pencil") {
      this.ctx.beginPath();
      if (this.prevX === -1) {
        this.prevX = this.startX;
        this.prevY = this.startY;
      }

      this.ctx.moveTo(this.prevX, this.prevY);
      this.ctx.lineTo(event.clientX, event.clientY);
      this.ctx.strokeStyle = "rgba(255, 255, 255)";
      this.ctx.stroke();

      const shape = {
        type: "line",
        x1: this.prevX,
        y1: this.prevY,
        x2: event.clientX,
        y2: event.clientY,
      } as Shape;
      this.prevX = event.clientX;
      this.prevY = event.clientY;

      const stringShape = JSON.stringify(shape);

      const socketMsg = {
        type: "chat",
        data: {
          message: stringShape,
          roomId: this.roomId,
        },
      };

      const finalMsg = JSON.stringify(socketMsg);

      console.log(JSON.parse(finalMsg));

      this.socket.send(finalMsg);

      this.existingShapes.push(shape as Shape);

      this.clearCanvas();
    }
  }
}
