import { useState } from "react";
import { IoMdSettings } from "react-icons/io";
const DUMMY = [
  {
    index: 0,
    canvas_name: "캔버스1",
    canvas_id: "abcd-efgf-qqqq",
  },
  {
    index: 1,
    canvas_name: "캔버스2",
    canvas_id: "abcd-1112-qqqq",
  },
  {
    index: 2,
    canvas_name: "캔버스3",
    canvas_id: "abcd-asdf-qqqq",
  },
  {
    index: 3,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqqq",
  },
  {
    index: 4,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq7",
  },
  {
    index: 5,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq6",
  },
  {
    index: 6,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq5",
  },
  {
    index: 7,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq4",
  },
  {
    index: 8,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq3",
  },
  {
    index: 9,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq2",
  },
  {
    index: 10,
    canvas_name: "캔버스4",
    canvas_id: "avsvs-egd-qqq1",
  },
  {
    index: 11,
    canvas_name: "캔버스9",
    canvas_id: "avsvs-egd-sadasd",
  },
  {
    index: 12,
    canvas_name: "캔버스10",
    canvas_id: "avsvs-egd-qasd",
  },
  {
    index: 13,
    canvas_name: "캔버스11",
    canvas_id: "avsvs-egd-qasd123",
  },
];

const CanvasList: React.FC = () => {
  const [canvases, setCanvases] = useState(DUMMY);
  const [selectedCanvas, setSelectedCanvas] = useState<string>(
    DUMMY[0]!.canvas_id,
  );
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

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
    if (draggedItem === null || dragOverItem === null) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newCanvases = [...canvases];
    const draggedCanvas = newCanvases[draggedItem];

    const tempIndex = draggedCanvas!.index;
    draggedCanvas!.index = newCanvases[dragOverItem]!.index;
    newCanvases[dragOverItem]!.index = tempIndex;

    newCanvases.splice(draggedItem, 1);
    newCanvases.splice(dragOverItem, 0, draggedCanvas!);

    setCanvases(newCanvases);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="h-[90%] overflow-y-auto">
      <div className="flex flex-col items-center gap-4 py-2">
        {canvases
          .sort((a, b) => a.index - b.index)
          .map((canvas, index) => (
            <div
              key={canvas.canvas_id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedCanvas(canvas.canvas_id)}
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
                  selectedCanvas === canvas.canvas_id
                    ? "bg-primary-500"
                    : "bg-neutral-800 hover:bg-neutral-700"
                }`}
              >
                {/* 캔버스 타이틀 */}
                <div className="flex justify-between px-3 py-1">
                  <span className="text-sm font-medium text-neutral-100">
                    {canvas.canvas_name}
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
