import { RefObject, useState } from "react";
import {
  ArrowUpRight,
  RectangleHorizontal,
  Circle,
  Pencil,
  MousePointer2,
} from "lucide-react";

// Tool definitions
const tools = [
  { name: "rect", Icon: RectangleHorizontal },
  { name: "circle", Icon: Circle },
  { name: "line", Icon: ArrowUpRight },
  { name: "pencil", Icon: Pencil },
  { name: "selectTool", Icon: MousePointer2 },
];

export default function IconBar({
  currentShape,
  gameRef,
}: {
  currentShape: RefObject<string>;
  gameRef: RefObject<any>; // Replace `any` with your actual Game class type
}) {
  const [selected, setSelected] = useState("rect");
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const handleClick = (tool: string) => {
    currentShape.current = tool;
    setSelected(tool);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    gameRef.current?.setColor(newColor);
  };

  const handleStrokeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStroke = parseInt(e.target.value);
    setStrokeWidth(newStroke);
    gameRef.current?.setStrokeWidth(newStroke);
  };

  return (
    <div className="flex flex-row items-center p-2 gap-4 bg-white shadow-lg rounded-2xl">
      {/* Tool Buttons */}
      <div className="flex gap-2">
        {tools.map(({ name, Icon }) => {
          const baseClass = "p-2 rounded-2xl transition-all duration-150";
          const activeClass =
            selected === name ? "bg-red-300" : "bg-white hover:bg-gray-100";

          return (
            <button
              key={name}
              onClick={() => handleClick(name)}
              className={`${baseClass} ${activeClass}`}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1">
        <label className="text-sm">🎨</label>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className="w-8 h-8 border rounded"
        />
      </div>

      {/* Stroke Width Slider */}
      <div className="flex items-center gap-1">
        <label className="text-sm">🖌️</label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={strokeWidth}
          onChange={handleStrokeChange}
          className="w-24"
        />
      </div>
    </div>
  );
}
