"use client";
import Brush from "./Brush/Brush";
import ColorPalette from "./Color/ColorPalette";

const Properties: React.FC = () => {
  return (
    <div className="flex h-full flex-col border-b border-neutral-700 px-3 py-2">
      <div className="h-full overflow-y-auto pr-1">
        <ColorPalette />
        <Brush />
      </div>
    </div>
  );
};

export default Properties;
