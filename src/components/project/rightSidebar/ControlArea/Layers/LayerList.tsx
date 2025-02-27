"use client";
import { useEffect, useState, useRef } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { HiOutlineAdjustments } from "react-icons/hi";
import { useAtom, useAtomValue } from "jotai";
import {
  currentCanvasAtom,
  currentLayerAtom,
  currentLayersAtom,
} from "~/store/atoms";
import { renameLayer } from "~/app/actions/yjs/layerYjs";
import { useSession } from "next-auth/react";

const LayerList: React.FC = () => {
  const { data: session } = useSession();
  const [layers, setLayers] = useAtom(currentLayersAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLayerId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingLayerId]);

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

  const handleNameDoubleClick = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingName(currentName);
  };

  const handleNameEditComplete = () => {
    if (editingLayerId) {
      renameLayer(currentCanvas!.id, currentLayer!.id, editingName, session!);
    }
    setEditingLayerId(null);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameEditComplete();
    } else if (e.key === "Escape") {
      setEditingLayerId(null);
    }
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
            onClick={() => setCurrentLayer(layer)}
            className={`flex h-[55px] w-full items-center justify-between rounded-lg transition-all duration-150 hover:cursor-pointer ${
              draggedItem === index
                ? "opacity-50"
                : dragOverItem === index
                  ? "border-2 border-primary-500"
                  : ""
            } ${
              currentLayer!.id === layer.id
                ? "bg-neutral-500"
                : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            <div className="flex h-full w-[40px] items-center justify-center border-r border-neutral-100 p-2">
              <IoMdEye className="text-neutral-100" size={22} />
            </div>
            <div className="flex flex-1 items-center gap-2 overflow-hidden px-3 py-2">
              <div className="h-[40px] w-[45px] flex-shrink-0 bg-neutral-100"></div>
              {editingLayerId === layer.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleNameEditComplete}
                  onKeyDown={handleNameKeyDown}
                  className="w-full truncate rounded bg-neutral-700 px-1 text-sm text-neutral-100 outline-none"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    minWidth: "0",
                    height: "22px",
                    minHeight: "22px",
                    maxHeight: "22px",
                    lineHeight: "22px",
                    resize: "none",
                  }}
                />
              ) : (
                <span
                  className="w-full truncate text-sm text-neutral-100"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleNameDoubleClick(layer.id, layer.name);
                  }}
                  style={{ minWidth: "0" }}
                >
                  {layer.name}
                </span>
              )}
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
