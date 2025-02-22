import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { IoMdSettings } from "react-icons/io";
import { Canvas } from "@prisma/mongodb-client";
import { currentCanvasAtom, currentCanvasesAtom } from "~/store/atoms";

const CanvasList: React.FC = () => {
  const [currentCanvases, setCurrentCanvases] = useAtom(currentCanvasesAtom);
  const [selectedCanvas, setSelectedCanvas] = useAtom(currentCanvasAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  useEffect(() => {
    if (selectedCanvas === undefined) {
      setSelectedCanvas(currentCanvases[0]);
    }
  }, [currentCanvases]);
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (
      !currentCanvases ||
      draggedItem === null ||
      dragOverItem === null ||
      draggedItem === dragOverItem
    ) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newCanvases = [...currentCanvases];
    const draggedCanvas = newCanvases[draggedItem];

    // 인덱스 교체
    const tempIndex = draggedCanvas!.index;
    draggedCanvas!.index = newCanvases[dragOverItem]!.index;
    newCanvases[dragOverItem]!.index = tempIndex;

    // 배열 위치 변경
    const [removed] = newCanvases.splice(draggedItem, 1);
    newCanvases.splice(dragOverItem, 0, removed!);

    setCurrentCanvases(newCanvases);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  if (!currentCanvases || currentCanvases.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        캔버스가 존재하지 않습니다
      </div>
    );
  }

  return (
    <div className="h-[90%] overflow-y-auto">
      <div className="flex flex-col items-center gap-4 py-2">
        {currentCanvases
          .sort((a, b) => a.index - b.index)
          .map((canvas, index) => (
            <div
              key={canvas.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedCanvas(canvas)}
              className={`flex w-[210px] flex-col duration-150 hover:cursor-pointer ${
                draggedItem === index
                  ? "opacity-50"
                  : dragOverItem === index
                    ? "border-2 border-primary-500"
                    : ""
              }`}
            >
              {/* 썸네일 컨테이너 */}
              <div
                className={`overflow-hidden rounded-lg ${
                  selectedCanvas!.id === canvas.id
                    ? "bg-primary-300"
                    : "bg-neutral-800 hover:bg-neutral-700"
                }`}
              >
                {/* 캔버스 타이틀 */}
                <div className="flex justify-between px-3 py-1">
                  <span className="text-sm font-medium text-neutral-100">
                    {canvas.name}
                  </span>
                  <IoMdSettings
                    className="text-neutral-100 duration-150 hover:scale-105 hover:cursor-pointer"
                    size={18}
                  />
                </div>

                {/* 캔버스 컨텐츠 영역 */}
                <div className="aspect-[5/3] w-full bg-neutral-100 p-2">
                  <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-neutral-500">
                    <span className="text-xs text-neutral-500">
                      Canvas Content
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default CanvasList;
