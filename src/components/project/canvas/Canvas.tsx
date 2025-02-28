"use client";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { currentCanvasAtom } from "~/store/atoms";
import { Stage } from "react-konva";

const Canvas: React.FC = () => {
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!currentCanvas || !isMounted) {
    return null;
  }

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  return (
    <div className="relative">
      {/* 투명 배경일 경우 체커보드 패턴 표시 */}
      {isTransparent && (
        <div
          className="bg-checkerboard absolute left-0 top-0"
          style={{
            width: currentCanvas.width,
            height: currentCanvas.height,
          }}
        />
      )}

      {/* Stage 컴포넌트 */}
      <Stage
        width={currentCanvas.width}
        height={currentCanvas.height}
        style={{
          background: isTransparent ? "transparent" : currentCanvas.background,
        }}
      ></Stage>
    </div>
  );
};

export default Canvas;
