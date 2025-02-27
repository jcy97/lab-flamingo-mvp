import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  currentCanvasAtom,
  currentCanvasesAtom,
  currentPageAtom,
  pageCanvasesAtom,
  pagesAtom,
  pageSelectedCanvasMapAtom,
  pagesUpdatedAtom,
} from "~/store/atoms";
import {
  reorderPages,
  deletePage,
  renamePage,
} from "~/app/actions/yjs/pageYjs";
import { useSession } from "next-auth/react";
import { initCanvasesMap } from "~/app/actions/yjs/canvasYjs";

const PageList: React.FC = () => {
  const [pages, setPages] = useAtom(pagesAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const pagesUpdated = useAtomValue(pagesUpdatedAtom);
  const [currentCanvasMap, setCurrentCanvasMap] = useAtom(
    pageSelectedCanvasMapAtom,
  );
  const setCurrentCanvases = useSetAtom(currentCanvasesAtom);
  const [currentCanvas, setCurrentCanvas] = useAtom(currentCanvasAtom);
  const pageCanvases = useAtomValue(pageCanvasesAtom);

  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const { data: session } = useSession();

  // 페이지 변경 시 캔버스 업데이트
  useEffect(() => {
    if (currentPage) {
      // 현재 페이지의 캔버스 목록 설정
      setCurrentCanvases(pageCanvases[currentPage.id]!);
      initCanvasesMap(pageCanvases[currentPage.id]!);

      // 이전에 이 페이지에서 선택한 캔버스가 있는지 확인
      const previouslySelectedCanvasId = currentCanvasMap[currentPage.id];

      if (previouslySelectedCanvasId) {
        // 이전에 선택한 캔버스를 찾아 설정
        const previousCanvas = pageCanvases[currentPage.id]!.find(
          (canvas) => canvas.id === previouslySelectedCanvasId,
        );

        if (previousCanvas) {
          setCurrentCanvas(previousCanvas);
        } else {
          // 이전 캔버스를 찾을 수 없는 경우 (삭제되었을 수 있음)
          // 첫 번째 캔버스를 기본값으로 설정
          if (pageCanvases[currentPage.id]!.length > 0) {
            setCurrentCanvas(pageCanvases[currentPage.id]![0]);
          }
        }
      } else {
        // 이전에 선택한 캔버스가 없는 경우 첫 번째 캔버스를 기본값으로 설정
        if (pageCanvases[currentPage.id]!.length > 0) {
          setCurrentCanvas(pageCanvases[currentPage.id]![0]);
        }
      }
    }
  }, [currentPage]);

  // 캔버스 선택 상태가 변경될 때마다 맵 업데이트
  useEffect(() => {
    if (currentPage && currentCanvas) {
      setCurrentCanvasMap((prev) => ({
        ...prev,
        [currentPage.id]: currentCanvas.id,
      }));
    }
  }, [currentCanvas, currentPage, setCurrentCanvasMap]);

  // YJS 변경사항에 대한 반응
  useEffect(() => {
    if (pagesUpdated) {
      // YJS에서 업데이트된 페이지가 있으면, 현재 선택된 페이지를
      // 업데이트된 데이터로 갱신
      if (currentPage) {
        const updatedPage = pages.find((p) => p.id === currentPage.id);
        if (updatedPage && updatedPage !== currentPage) {
          setCurrentPage(updatedPage);
        }
      }
    }
  }, [pagesUpdated, pages, currentPage, setCurrentPage]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    // 드래그 이미지를 숨김 (선택 사항)
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // 현재 드래그된 아이템과 다른 경우에만 드래그 오버 상태 업데이트
    if (draggedItem !== null && draggedItem !== index) {
      setDragOverItem(index);
    }
  };

  const handleDragEnd = () => {
    if (
      draggedItem === null ||
      dragOverItem === null ||
      draggedItem === dragOverItem
    ) {
      // 유효하지 않은 드래그 또는 같은 위치로 드래그
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // YJS를 통해 페이지 재정렬
    reorderPages(draggedItem, dragOverItem);

    // 상태 초기화
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 페이지 선택 이벤트 방지

    if (pages.length <= 1) {
      alert("최소 1개 이상의 페이지가 필요합니다.");
      return;
    }

    if (confirm("정말 이 페이지를 삭제하시겠습니까?")) {
      deletePage(pageId);
    }
  };

  // 더블클릭으로 이름 편집 시작
  const handleDoubleClick = (
    pageId: string,
    currentName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // 페이지 선택 이벤트 방지
    setEditingPageId(pageId);
    setEditingName(currentName);
  };

  const handleSavePageName = () => {
    if (!editingPageId || !session || !editingName.trim()) return;
    renamePage(editingPageId, editingName, session);
    setEditingPageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSavePageName();
    } else if (e.key === "Escape") {
      setEditingPageId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="h-full overflow-y-auto">
        <div className="flex w-full flex-col gap-2 overflow-y-auto">
          {pages
            .sort((a: any, b: any) => a.index - b.index)
            .map((page: any, index: any) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setCurrentPage(page)}
                className={`flex h-[25px] min-w-[210px] cursor-pointer items-center rounded px-2 text-xs text-neutral-100 ${
                  currentPage?.id === page.id
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
                {editingPageId === page.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSavePageName}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-neutral-100 outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div
                      className="flex-grow truncate"
                      onDoubleClick={(e) =>
                        handleDoubleClick(page.id, page.name, e)
                      }
                    >
                      {page.name}
                    </div>
                    <div className="ml-2 flex items-center space-x-1">
                      <button
                        onClick={(e) => handleDeletePage(page.id, e)}
                        className="text-xs opacity-50 hover:opacity-100"
                        title="페이지 삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PageList;
