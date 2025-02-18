import React, { useState } from "react";

const DUMMY_PAGE = [
  {
    page_index: 0,
    page_id: "aaaa-fff-bbb-cccc",
    page_name: "페이지1",
    current_canvas_id: "bbbb-ffff-dddd-aaaa",
  },
  {
    page_index: 1,
    page_id: "aaaa-fff-bbb-dddd",
    page_name: "페이지2",
    current_canvas_id: "bbbb-ffff-dddd-aaaa",
  },
  {
    page_index: 2,
    page_id: "aaaa-fff-bbb-ffff",
    page_name: "페이지3",
    current_canvas_id: "bbbb-ffff-dddd-aaaa",
  },
  {
    page_index: 3,
    page_id: "aaaa-fff-bbb-gggg",
    page_name: "페이지4",
    current_canvas_id: "bbbb-ffff-dddd-aaaa",
  },
];

const PageList: React.FC = () => {
  const [pages, setPages] = useState(DUMMY_PAGE);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    // 브라우저 기본 드래그 아이콘 제거
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

    const newPages = [...pages];
    const draggedPage = newPages[draggedItem]!;

    // 드래그가 끝났을 때만 위치 교환
    const tempIndex = draggedPage.page_index;
    draggedPage.page_index = newPages[dragOverItem]!.page_index;
    newPages[dragOverItem]!.page_index = tempIndex;

    // 재정렬
    newPages.splice(draggedItem, 1);
    newPages.splice(dragOverItem, 0, draggedPage);

    setPages(newPages);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {pages
        .sort((a, b) => a.page_index - b.page_index)
        .map((page, index) => (
          <div
            key={page.page_id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedPage(page.page_id)}
            className={`flex h-[25px] min-w-[210px] cursor-pointer items-center rounded px-2 text-xs text-neutral-100 ${
              selectedPage === page.page_id
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
            {page.page_name}
          </div>
        ))}
    </div>
  );
};

export default PageList;
