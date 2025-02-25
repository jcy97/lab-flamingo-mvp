import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  currentCanvasesAtom,
  currentPageAtom,
  pageCanvasInformationAtom,
  pagesUpdatedAtom,
} from "~/store/atoms";
import {
  getYpages,
  reorderPages,
  addPage,
  deletePage,
  renamePage,
} from "~/app/actions/pageYjs";
import { useSession } from "next-auth/react";

const PageList: React.FC = () => {
  const [pages, setPages] = useAtom(pageCanvasInformationAtom);
  const [selectedPage, setSelectedPage] = useAtom(currentPageAtom);
  const pagesUpdated = useAtomValue(pagesUpdatedAtom);
  const setCurrentCanvases = useSetAtom(currentCanvasesAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const { data: session } = useSession();

  // 페이지 변경 시 캔버스 업데이트
  useEffect(() => {
    if (selectedPage) {
      setCurrentCanvases(selectedPage.page_canvases);
    }
  }, [selectedPage, setCurrentCanvases]);

  // YJS 변경사항에 대한 반응
  useEffect(() => {
    if (pagesUpdated) {
      // YJS에서 업데이트된 페이지가 있으면, 현재 선택된 페이지를
      // 업데이트된 데이터로 갱신
      if (selectedPage) {
        const updatedPage = pages.find((p) => p.id === selectedPage.id);
        if (updatedPage && updatedPage !== selectedPage) {
          setSelectedPage(updatedPage);
        }
      }
    }
  }, [pagesUpdated, pages, selectedPage, setSelectedPage]);

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

    // YJS를 통해 페이지 재정렬
    reorderPages(draggedItem, dragOverItem);

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleAddPage = () => {
    if (!session || !pages.length) return;

    const newPageName = `새 페이지 ${pages.length + 1}`;
    const projectId = pages[0]!.project_id;

    const newPageId = addPage(newPageName, session, projectId);
    if (newPageId) {
      // 새 페이지는 YJS 관찰자를 통해 자동으로 pages 상태에 추가됨
      // 필요하면 새 페이지로 직접 이동할 수 있음
      setTimeout(() => {
        const newPages = Array.from(getYpages() || []);
        const newPage = newPages.find((p) => p.id === newPageId);
        if (newPage) {
          setSelectedPage(newPage);
        }
      }, 100); // 약간의 지연으로 YJS 동기화 시간을 고려
    }
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

  const handleStartEditing = (
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
                onClick={() => setSelectedPage(page)}
                className={`flex h-[25px] min-w-[210px] cursor-pointer items-center rounded px-2 text-xs text-neutral-100 ${
                  selectedPage?.id === page.id
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
                    <div className="flex-grow truncate">{page.name}</div>
                    <div className="ml-2 flex items-center space-x-1">
                      <button
                        onClick={(e) =>
                          handleStartEditing(page.id, page.name, e)
                        }
                        className="text-xs opacity-50 hover:opacity-100"
                        title="페이지 이름 변경"
                      >
                        ✏️
                      </button>
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

      <button
        onClick={handleAddPage}
        className="hover:bg-primary-600 mt-2 rounded bg-primary-500 px-2 py-1 text-xs text-white transition-colors"
      >
        + 새 페이지 추가
      </button>
    </div>
  );
};

export default PageList;
