import axios from "axios";
import { HTTP_BACKEND } from "../config";
import { RefObject } from "react";

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

export async function initDraw(
  canvas: HTMLCanvasElement,
  roomId: string,
  socket: WebSocket,
  currentShape: RefObject<string>,
) {
  let existingShapes: Shape[] = await getExistingShapes(roomId);

  let mouseClicked = false;
  let startX = 0;
  let startY = 0;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  clearCanvas(existingShapes, canvas, ctx);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "chat") {
      const parsedShape = JSON.parse(message.data.message);
      existingShapes.push(parsedShape);
      clearCanvas(existingShapes, canvas, ctx);
    }
  };

  canvas.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    mouseClicked = true;
  });
  canvas.addEventListener("mouseup", (e) => {
    let shape = {};

    if (currentShape.current === "rect") {
      const width = e.clientX - startX;
      const height = e.clientY - startY;
      shape = {
        type: "rect",
        x: startX,
        y: startY,
        width,
        height,
      } as Shape;
    }

    if (currentShape.current === "line") {
      shape = {
        type: "line",
        x1: startX,
        y1: startY,
        x2: e.clientX,
        y2: e.clientY,
      } as Shape;
    }

    if (currentShape.current === "circle") {
      shape = {
        type: "circle",
        x: Math.abs(startX + (e.clientX - startX) / 2),
        y: Math.abs(startY + (e.clientY - startY) / 2),
        radiusX: Math.abs((e.clientX - startX) / 2),
        radiusY: Math.abs((e.clientY - startY) / 2),
        rotation: 0,
        startAngle: 0,
        endAngle: 2 * Math.PI,
      } as Shape;
    }

    const stringShape = JSON.stringify(shape);

    const socketMsg = {
      type: "chat",
      data: {
        message: stringShape,
        roomId: roomId,
      },
    };

    const finalMsg = JSON.stringify(socketMsg);

    console.log(JSON.parse(finalMsg));

    socket.send(finalMsg);

    existingShapes.push(shape as Shape);

    clearCanvas(existingShapes, canvas, ctx);

    mouseClicked = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (mouseClicked) {
      clearCanvas(existingShapes, canvas, ctx);
      drawShape(e, currentShape.current, ctx, startX, startY);
    }
  });
}

function drawShape(
  event: MouseEvent,
  currentShape: string,
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
) {
  if (currentShape === "rect") {
    const width = event.clientX - startX;
    const height = event.clientY - startY;
    ctx.strokeStyle = "rgba(255, 255, 255)";
    ctx.strokeRect(startX, startY, width, height);
  }
  if (currentShape === "line") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(event.clientX, event.clientY);
    ctx.strokeStyle = "rgba(255, 255, 255)";
    ctx.stroke();
  }
  if (currentShape === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      Math.abs(startX + (event.clientX - startX) / 2),
      Math.abs(startY + (event.clientY - startY) / 2),
      Math.abs((event.clientX - startX) / 2),
      Math.abs((event.clientY - startY) / 2),
      0,
      0,
      2 * Math.PI,
    );
    ctx.strokeStyle = "rgba(255, 255, 255)";
    ctx.stroke();
  }
}

function clearCanvas(
  existingShapes: Shape[],
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  existingShapes.map((shape) => {
    if (shape.type === "rect") {
      ctx.strokeStyle = "rgba(255, 255, 255)";
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
    if (shape.type === "line") {
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.strokeStyle = "rgba(255, 255, 255)";
      ctx.stroke();
    }
    if (shape.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        shape.x,
        shape.y,
        shape.radiusX,
        shape.radiusY,
        0,
        0,
        2 * Math.PI,
      );
      ctx.strokeStyle = "rgba(255, 255, 255)";
      ctx.stroke();
    }
  });
}

async function getExistingShapes(roomId: string) {
  const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
  const messages = res.data.messages;

  const shapes = messages.map((message: { message: string }) => {
    const messageData = JSON.parse(message.message);
    return messageData;
  });

  console.log(shapes);

  return shapes;
}
