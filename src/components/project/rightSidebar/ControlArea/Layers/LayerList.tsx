import { useState } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { HiOutlineAdjustments } from "react-icons/hi";

const DUMMY_LAYERS = [
  {
    layer_index: 0,
    layer_id: "1",
    layer_name: "레이어1",
    visible: true,
  },
  {
    layer_index: 0,
    layer_id: "15",
    layer_name: "레이어2",
    visible: true,
  },
  {
    layer_index: 1,
    layer_id: "2",
    layer_name: "레이어3",
    visible: true,
  },
  {
    layer_index: 2,
    layer_id: "3",
    layer_name: "레이어4",
    visible: true,
  },
  {
    layer_index: 3,
    layer_id: "4",
    layer_name: "레이어5",
    visible: true,
  },
  {
    layer_index: 4,
    layer_id: "5",
    layer_name: "레이어6",
    visible: true,
  },
  {
    layer_index: 5,
    layer_id: "6",
    layer_name: "레이어7",
    visible: true,
  },
  {
    layer_index: 6,
    layer_id: "7",
    layer_name: "레이어7",
    visible: true,
  },
  {
    layer_index: 7,
    layer_id: "8",
    layer_name: "레이어7",
    visible: true,
  },
  {
    layer_index: 8,
    layer_id: "9",
    layer_name: "레이어7",
    visible: true,
  },
  {
    layer_index: 9,
    layer_id: "10",
    layer_name: "레이어7",
    visible: true,
  },
  {
    layer_index: 9,
    layer_id: "11",
    layer_name: "레이어10",
    visible: true,
  },
  {
    layer_index: 10,
    layer_id: "12",
    layer_name: "레이어11",
    visible: true,
  },
];

const LayerList: React.FC = () => {
  const [layers, setLayers] = useState(DUMMY_LAYERS);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(
    DUMMY_LAYERS[0]!.layer_id,
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

    const newLayers = [...layers];
    const draggedLayers = newLayers[draggedItem];

    const tempIndex = draggedLayers!.layer_index;
    draggedLayers!.layer_index = newLayers[dragOverItem]!.layer_index;
    newLayers[dragOverItem]!.layer_index = tempIndex;

    newLayers.splice(draggedItem, 1);
    newLayers.splice(dragOverItem, 0, draggedLayers!);

    setLayers(newLayers);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="flex h-full w-full flex-col gap-1 overflow-y-auto">
      {layers
        .sort((a, b) => a.layer_index - b.layer_index)
        .map((layer, index) => (
          <section
            key={layer.layer_id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedLayer(layer.layer_id)}
            className={`flex min-h-[55px] w-full items-center justify-between rounded-lg transition-all duration-150 hover:cursor-pointer ${
              draggedItem === index
                ? "opacity-50"
                : dragOverItem === index
                  ? "border-2 border-primary-500"
                  : ""
            } ${
              selectedLayer === layer.layer_id
                ? "bg-neutral-500"
                : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            <div className="flex h-full w-[40px] items-center justify-center border-r border-neutral-100 p-2">
              <IoMdEye className="text-neutral-100" size={22} />
            </div>
            <div className="flex flex-1 items-center gap-2 px-3 py-2">
              <div className="h-[40px] w-[45px] bg-neutral-100"></div>
              <input
                type="text"
                value={layer.layer_name}
                className="max-w-[100px] bg-transparent text-sm text-neutral-100 outline-none hover:cursor-pointer"
                style={{ minWidth: "0" }}
              />
            </div>
            <div className="flex h-full w-[40px] items-center justify-center pr-4">
              <HiOutlineAdjustments className="text-neutral-100" size={22} />
            </div>
          </section>
        ))}
    </div>
  );
};

export default LayerList;
