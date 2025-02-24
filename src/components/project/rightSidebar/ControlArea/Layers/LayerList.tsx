"use client";
import { useEffect, useState } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { HiOutlineAdjustments } from "react-icons/hi";
import { useAtom } from "jotai";
import { currentLayerAtom, currentLayersAtom } from "~/store/atoms";

const LayerList: React.FC = () => {
  const [layers, setLayers] = useAtom(currentLayersAtom);
  const [selectedLayer, setSelectedLayer] = useAtom(currentLayerAtom);

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

    const tempIndex = draggedLayers!.index;
    draggedLayers!.index = newLayers[dragOverItem]!.index;
    newLayers[dragOverItem]!.index = tempIndex;

    newLayers.splice(draggedItem, 1);
    newLayers.splice(dragOverItem, 0, draggedLayers!);

    setLayers(newLayers);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="flex h-full w-full flex-col gap-1 overflow-y-auto">
      {layers
        .sort((a, b) => a.index - b.index)
        .map((layer, index) => (
          <section
            key={layer.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedLayer(layer)}
            className={`flex min-h-[55px] w-full items-center justify-between rounded-lg transition-all duration-150 hover:cursor-pointer ${
              draggedItem === index
                ? "opacity-50"
                : dragOverItem === index
                  ? "border-2 border-primary-500"
                  : ""
            } ${
              selectedLayer!.id === layer.id
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
                value={layer.name}
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
