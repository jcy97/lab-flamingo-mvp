import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
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
  duplicatePage,
} from "~/app/actions/yjs/pageYjs";
import { useSession } from "next-auth/react";
import { initCanvasesMap } from "~/app/actions/yjs/canvasYjs";
import { IoMdSettings } from "react-icons/io";
import { BiRename, BiTrash } from "react-icons/bi";
import { IoDuplicateOutline } from "react-icons/io5";
import PopupPortal from "~/components/common/PopupPotal";

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

  // 메뉴 상태 관리 (추가)
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 페이지 변경 시 캔버스 업데이트
  useEffect(() => {
    if (currentPage) {
      // 현재 페이지의 캔버스 목록 설정
      const canvases = pageCanvases[currentPage.id] || [];
      if (canvases.length > 0) {
        setCurrentCanvases(pageCanvases[currentPage.id] ?? []);
        initCanvasesMap(canvases);

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

  // 외부 클릭 시 메뉴 닫기 (추가)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    // 드래그 이미지를 숨김
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

    setMenuOpen(null);
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

  // 설정 메뉴 토글 (추가)
  const toggleMenu = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation(); // 페이지 선택 이벤트 방지

    // 이미 열린 메뉴를 닫는 경우
    if (menuOpen === pageId) {
      setMenuOpen(null);
      return;
    }

    // 메뉴 위치 계산
    const settingsIcon = settingsRefs.current[pageId];
    if (settingsIcon) {
      const rect = settingsIcon.getBoundingClientRect();
      // 팝업 메뉴가 뷰포트 바깥으로 나가지 않도록 위치 조정
      const left = Math.min(rect.right - 144, window.innerWidth - 150);
      const top = rect.bottom + 5;
      setMenuPosition({ top, left });
    }

    setMenuOpen(pageId);
  };

  // 메뉴에서 이름 변경 시작 (추가)
  const handleRenameClick = (
    e: React.MouseEvent,
    pageId: string,
    name: string,
  ) => {
    e.stopPropagation();
    setMenuOpen(null);
    setEditingPageId(pageId);
    setEditingName(name);
  };

  // 페이지 복제 기능 (추가)
  const handleDuplicateClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();

    if (!session) return;

    // YJS를 통해 페이지 복제 함수 호출
    duplicatePage(pageId, session).then((newPageId) => {
      if (newPageId) {
        console.log(`페이지 복제 성공: ${newPageId}`);
      } else {
        console.error("페이지 복제 실패");
      }
    });

    setMenuOpen(null);
  };

  // 컨텍스트 메뉴 (우클릭 메뉴) 처리 (추가)
  const handleContextMenu = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault(); // 기본 컨텍스트 메뉴 방지
    e.stopPropagation(); // 이벤트 버블링 방지

    // 메뉴 위치 설정
    const left = Math.min(e.clientX, window.innerWidth - 150);
    const top = Math.min(e.clientY, window.innerHeight - 150);
    setMenuPosition({ top, left });

    // 메뉴 열기
    setMenuOpen(pageId);
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
                onContextMenu={(e) => handleContextMenu(e, page.id)} // 우클릭 메뉴 추가
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
                      {/* 설정 아이콘 추가 */}
                      <div
                        className="relative"
                        ref={(el) => {
                          settingsRefs.current[page.id] = el;
                        }}
                      >
                        <IoMdSettings
                          className="text-neutral-100 duration-150 hover:scale-105 hover:cursor-pointer"
                          size={16}
                          onClick={(e) => toggleMenu(e, page.id)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* 설정 팝업 메뉴 - Portal 사용하여 DOM 최상위에 렌더링 */}
      <PopupPortal isOpen={menuOpen !== null}>
        {menuOpen !== null && (
          <div
            ref={menuRef}
            className="fixed z-[1000] w-36 rounded bg-neutral-800 shadow-lg"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col py-1">
              {/* 현재 열린 메뉴에 해당하는 페이지 찾기 */}
              {(() => {
                const page = pages.find((p) => p.id === menuOpen);
                if (!page) return null;

                return (
                  <>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleRenameClick(e, page.id, page.name)}
                    >
                      <BiRename size={16} />
                      <span>이름 변경</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleDuplicateClick(e, page.id)}
                    >
                      <IoDuplicateOutline size={16} />
                      <span>복제</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-700"
                      onClick={(e) => handleDeletePage(page.id, e)}
                    >
                      <BiTrash size={16} />
                      <span>삭제</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </PopupPortal>
    </div>
  );
};

export default PageList;
