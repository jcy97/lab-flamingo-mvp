"use client";
import { useAtomValue } from "jotai";
import Brush from "./Brush/Brush";
import ColorPalette from "./Color/ColorPalette";
import { currentLayerAtom } from "~/store/atoms";
import Text from "./Text/Text";
const Properties: React.FC = () => {
  const currentLayer = useAtomValue(currentLayerAtom);
  return (
    <div className="flex h-full flex-col border-b border-neutral-700 px-3 py-2">
      <div className="h-full overflow-y-auto pr-1">
        {currentLayer?.type === "TEXT" ? (
          <Text />
        ) : (
          <>
            <ColorPalette />
            <Brush />
          </>
        )}
      </div>
    </div>
  );
};

export default Properties;
