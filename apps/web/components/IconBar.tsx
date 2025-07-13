import { RefObject, useState } from "react";
import {
  ArrowUpRight,
  RectangleHorizontal,
  Circle,
  Pencil,
  MousePointer2,
} from "lucide-react";

const tools = [
  { name: "rect", Icon: RectangleHorizontal },
  { name: "circle", Icon: Circle },
  { name: "line", Icon: ArrowUpRight },
  { name: "pencil", Icon: Pencil },
  { name: "selectTool", Icon: MousePointer2 },
];

export default function IconBar({
  currentShape,
}: {
  currentShape: RefObject<string>;
}) {
  const [selected, setSelected] = useState("rect");

  const handleClick = (tool: string) => {
    currentShape.current = tool;
    setSelected(tool);
  };

  return (
    <div className="flex flex-row p-2 gap-2 bg-white shadow-lg rounded-2xl">
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
  );
}
