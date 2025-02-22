import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  currentCanvasesAtom,
  currentPageAtom,
  pageCanvasInformationAtom,
} from "~/store/atoms";

const PageList: React.FC = () => {
  const [pages, setPages] = useAtom(pageCanvasInformationAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const setCurrentCanvases = useSetAtom(currentCanvasesAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  useEffect(() => {
    setCurrentCanvases(currentPage!.page_canvases);
  }, [currentPage]);
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

    const newPages = [...pages!];
    const draggedPage = newPages[draggedItem]!;

    // Update index values
    const tempIndex = draggedPage.index;
    draggedPage.index = newPages[dragOverItem]!.index;
    newPages[dragOverItem]!.index = tempIndex;

    // Reorder array
    newPages.splice(draggedItem, 1);
    newPages.splice(dragOverItem, 0, draggedPage);

    setPages(newPages);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="h-[90%] overflow-y-auto">
      <div className="flex w-full flex-col gap-2 overflow-y-auto">
        {pages
          .sort((a, b) => a.index - b.index)
          .map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setCurrentPage(page)}
              className={`flex h-[25px] min-w-[210px] cursor-pointer items-center rounded px-2 text-xs text-neutral-100 ${
                currentPage!.id === page.id
                  ? "bg-primary-500 hover:bg-primary-500"
                  : "bg-neutral-900"
              } ${
                draggedItem === index
                  ? "opacity-50"
                  : dragOverItem === index
                    ? "border-2 border-primary-500"
                    : ""
              } transition-colors duration-100 hover:bg-neutral-700`}
            >
              {page.name}
            </div>
          ))}
      </div>
    </div>
  );
};

export default PageList;
