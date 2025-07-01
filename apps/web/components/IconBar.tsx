import { RefObject, useState } from "react";
import {
  ArrowUpRight,
  RectangleHorizontal,
  Circle,
  Pencil,
} from "lucide-react";

export default function IconBar({
  currentShape,
}: {
  currentShape: RefObject<string>;
}) {
  const [circleColor, setCircleColor] = useState("bg-white");
  const [rectColor, setRectColor] = useState("bg-red-300");
  const [lineColor, setLineColor] = useState("bg-white");
  const [pencilColor, setPencilColor] = useState("bg-white");

  return (
    <div className="flex flex-row p-2 rounded-2xl">
      <div className={`m-2 ${rectColor} rounded-2xl`}>
        <RectangleHorizontal
          className={`m-2 ${rectColor}`}
          onClick={() => {
            currentShape.current = "rect";
            setCircleColor("bg-white");
            setLineColor("bg-white");
            setRectColor("bg-red-300");
            setPencilColor("bg-white");
          }}
        />
      </div>
      <div className={`m-2 ${circleColor} rounded-2xl`}>
        <Circle
          className={`m-2 ${circleColor}`}
          onClick={() => {
            currentShape.current = "circle";
            setCircleColor("bg-red-300");
            setLineColor("bg-white");
            setRectColor("bg-white");
            setPencilColor("bg-white");
          }}
        />
      </div>
      <div className={`m-2 ${lineColor} rounded-2xl`}>
        <ArrowUpRight
          className={`m-2 ${lineColor}`}
          onClick={() => {
            currentShape.current = "line";
            setCircleColor("bg-white");
            setLineColor("bg-red-300");
            setRectColor("bg-white");
            setPencilColor("bg-white");
          }}
        />
      </div>

      <div className={`m-2 ${pencilColor} rounded-2xl`}>
        <Pencil
          className={`m-2 ${pencilColor}`}
          onClick={() => {
            currentShape.current = "pencil";
            setCircleColor("bg-white");
            setLineColor("bg-white");
            setRectColor("bg-white");
            setPencilColor("bg-red-300");
          }}
        />
      </div>
    </div>
  );
}
