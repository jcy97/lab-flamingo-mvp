import { useEffect, useState, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { IoMdSettings } from "react-icons/io";
import { BiRename, BiTrash, BiEdit } from "react-icons/bi";
import { IoDuplicateOutline } from "react-icons/io5";
import {
  canvasLayersAtom,
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayerAtom,
  currentLayersAtom,
  currentPageAtom,
  canvasSelectedLayerMapAtom,
  selectedLayersAtom,
} from "~/store/atoms";
import { useSession } from "next-auth/react";
import {
  deleteCanvas,
  renameCanvas,
  reorderCanvases,
  updateCanvas,
  duplicateCanvas,
} from "~/app/actions/yjs/canvasYjs";
import CanvasEditPopup from "./CanvasEditPopup";
import PopupPortal from "~/components/common/PopupPotal";

const CanvasList: React.FC = () => {
  const { data: session } = useSession();
  const [canvases, setCanvases] = useAtom(currentCanvasesAtom);
  const [currentCanvas, setCurrentCanvas] = useAtom(currentCanvasAtom);
  const [currentPage] = useAtom(currentPageAtom);
  const setCurrentLayers = useSetAtom(currentLayersAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const canvasLayers = useAtomValue(canvasLayersAtom);
  const setSelectedLayers = useSetAtom(selectedLayersAtom);
  const [canvasSelectedLayerMap, setCanvasSelectedLayerMap] = useAtom(
    canvasSelectedLayerMapAtom,
  );
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 캔버스 편집 팝업 상태
  const [isEditPopupOpen, setIsEditPopupOpen] = useState<boolean>(false);
  const [editingCanvas, setEditingCanvas] = useState<any>(null);

  // Ctrl+D / Command+D 단축키 이벤트 처리 추가
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D 또는 Command+D가 눌렸을 때
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault(); // 브라우저 기본 동작 방지 (북마크 등)

        // 현재 선택된 캔버스가 있을 때만 복제 기능 수행
        if (currentCanvas && currentPage && session) {
          handleDuplicateCanvas(currentCanvas);
        }
      }
    };

    // 최상위 div에 이벤트 리스너 추가
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener("keydown", handleKeyDown);
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (containerElement) {
        containerElement.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [currentCanvas, currentPage, session]);

  // 캔버스가 변경될 때 레이어 관련 처리
  useEffect(() => {
    if (currentCanvas && canvasLayers[currentCanvas.id]) {
      // 현재 캔버스의 레이어 목록 설정 - 항상 최신 상태를 사용
      const layers = canvasLayers[currentCanvas.id] || [];
      setCurrentLayers(layers);
      setSelectedLayers([]);

      // 이미 선택된 레이어가 있고 해당 레이어가 현재 캔버스의 레이어 중 하나인지 확인
      if (
        currentLayer &&
        currentLayer.canvas_id === currentCanvas.id &&
        layers.some((layer) => layer.id === currentLayer.id)
      ) {
        // 현재 레이어가 업데이트되었는지 확인하고, 업데이트되었다면 최신 버전으로 갱신
        const updatedCurrentLayer = layers.find(
          (layer) => layer.id === currentLayer.id,
        );
        if (
          updatedCurrentLayer &&
          JSON.stringify(currentLayer) !== JSON.stringify(updatedCurrentLayer)
        ) {
          setCurrentLayer(updatedCurrentLayer);
        }
        return;
      }

      // 이전에 이 캔버스에서 선택한 레이어가 있는지 확인
      const previouslySelectedLayerId =
        canvasSelectedLayerMap[currentCanvas.id];

      if (previouslySelectedLayerId) {
        // 이전에 선택한 레이어를 찾아 설정
        const previousLayer = layers.find(
          (layer) => layer.id === previouslySelectedLayerId,
        );

        if (previousLayer) {
          // 이전에 선택한 레이어가 존재하면 현재 레이어로 설정
          setCurrentLayer(previousLayer);
        } else if (layers.length > 0) {
          // 이전 레이어를 찾을 수 없는 경우 첫 번째 레이어를 기본값으로 설정
          setCurrentLayer(layers[0]);
        }
      } else if (layers.length > 0) {
        // 이전에 선택한 레이어가 없는 경우 첫 번째 레이어를 기본값으로 설정
        setCurrentLayer(layers[0]);
      }
    }
  }, [currentCanvas, canvasLayers]);

  // 레이어 선택 상태가 변경될 때 맵 업데이트
  useEffect(() => {
    if (
      currentCanvas &&
      currentLayer &&
      currentLayer.canvas_id === currentCanvas.id
    ) {
      // 맵 업데이트 전에 현재 값과 비교
      if (canvasSelectedLayerMap[currentCanvas.id] !== currentLayer.id) {
        setCanvasSelectedLayerMap((prev) => ({
          ...prev,
          [currentCanvas.id]: currentLayer.id,
        }));
      }
    }
  }, [currentLayer, currentCanvas]);

  useEffect(() => {
    if (editingCanvasId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCanvasId]);

  // 외부 클릭 시 메뉴 닫기
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
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (
      !canvases ||
      draggedItem === null ||
      dragOverItem === null ||
      draggedItem === dragOverItem ||
      !currentPage
    ) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const pageId = currentPage.id;

    // YJS를 통해 캔버스 재정렬
    reorderCanvases(pageId, draggedItem, dragOverItem);

    // 드래그 상태 초기화
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleNameDoubleClick = (canvasId: string, currentName: string) => {
    setEditingCanvasId(canvasId);
    setEditingName(currentName);
  };

  const handleNameEditComplete = () => {
    if (editingCanvasId && session) {
      const canvas = canvases.find((c) => c.id === editingCanvasId);
      if (canvas && editingName !== canvas.name && editingName.trim() !== "") {
        const pageId = canvas.page_id;
        renameCanvas(pageId, editingCanvasId, editingName, session);
      }
    }
    setEditingCanvasId(null);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameEditComplete();
    } else if (e.key === "Escape") {
      setEditingCanvasId(null);
    }
  };

  // 설정 메뉴 토글 - 수정된 버전
  const toggleMenu = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation(); // 캔버스 선택 이벤트 방지

    // 이미 열린 메뉴를 닫는 경우
    if (menuOpen === canvasId) {
      setMenuOpen(null);
      return;
    }

    // 메뉴 위치 계산
    const settingsIcon = settingsRefs.current[canvasId];
    if (settingsIcon) {
      const rect = settingsIcon.getBoundingClientRect();
      // 팝업 메뉴가 뷰포트 바깥으로 나가지 않도록 위치 조정
      const left = Math.min(rect.right - 144, window.innerWidth - 150);
      const top = rect.bottom + 5;
      setMenuPosition({ top, left });
    }

    setMenuOpen(canvasId);
  };

  // 메뉴에서 이름 변경 시작
  const handleRenameClick = (
    e: React.MouseEvent,
    canvasId: string,
    name: string,
  ) => {
    e.stopPropagation();
    setMenuOpen(null);
    setEditingCanvasId(canvasId);
    setEditingName(name);
  };

  // 캔버스 수정 버튼 클릭 시
  const handleEditClick = (e: React.MouseEvent, canvas: any) => {
    e.stopPropagation();
    setMenuOpen(null);
    setEditingCanvas(canvas);
    setIsEditPopupOpen(true);
  };

  // 캔버스 편집 팝업 확인 처리
  const handleEditConfirm = (
    width: number,
    height: number,
    background: string,
  ) => {
    // 편집 팝업은 자체적으로 updateCanvas를 호출하므로 여기서는 팝업을 닫기만 함
    setIsEditPopupOpen(false);
    setEditingCanvas(null);
  };

  // 캔버스 수정 처리 함수
  const handleUpdateCanvas = (
    pageId: string,
    canvasId: string,
    width: number,
    height: number,
    background: string,
  ) => {
    if (session) {
      updateCanvas(pageId, canvasId, width, height, background, session);
    }
  };

  // 캔버스 복제 기능 추가
  const handleDuplicateClick = (e: React.MouseEvent, canvas: any) => {
    e.stopPropagation();
    handleDuplicateCanvas(canvas);
  };

  // 캔버스 복제 함수
  const handleDuplicateCanvas = (canvas: any) => {
    if (!currentPage || !session) return;

    // YJS를 통해 캔버스 복제 함수 호출
    duplicateCanvas(currentPage.id, canvas.id, session).then((newCanvasId) => {
      if (newCanvasId) {
        console.log(`캔버스 복제 성공: ${newCanvasId}`);
      } else {
        console.error("캔버스 복제 실패");
      }
    });

    setMenuOpen(null);
  };

  // 캔버스 삭제 처리
  const handleDeleteClick = (
    e: React.MouseEvent,
    canvasId: string,
    pageId: string,
  ) => {
    e.stopPropagation();

    if (!session) return;

    // 삭제 전 확인
    if (
      window.confirm("캔버스를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.")
    ) {
      deleteCanvas(pageId, canvasId);
      setMenuOpen(null);
    }
  };

  if (!canvases || canvases.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        캔버스가 존재하지 않습니다
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[90%] overflow-y-auto"
      tabIndex={0} // 키보드 이벤트를 받기 위해 tabIndex 추가
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {canvases
          .sort((a, b) => a.index - b.index)
          .map((canvas, index) => (
            <div
              key={canvas.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setCurrentCanvas(canvas)}
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
                  currentCanvas && currentCanvas.id === canvas.id
                    ? "bg-primary-300"
                    : "bg-neutral-800 hover:bg-neutral-700"
                }`}
              >
                {/* 캔버스 타이틀 */}
                <div className="flex justify-between px-3 py-1">
                  {editingCanvasId === canvas.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleNameEditComplete}
                      onKeyDown={handleNameKeyDown}
                      className="w-36 rounded bg-neutral-700 px-1 text-sm font-medium text-neutral-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="overflow-hidden text-ellipsis text-sm font-medium text-neutral-100"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleNameDoubleClick(canvas.id, canvas.name);
                      }}
                    >
                      {canvas.name}
                    </span>
                  )}

                  {/* 설정 아이콘과 메뉴 */}
                  <div
                    className="relative"
                    ref={(el) => {
                      settingsRefs.current[canvas.id] = el;
                    }}
                  >
                    <IoMdSettings
                      className="text-neutral-100 duration-150 hover:scale-105 hover:cursor-pointer"
                      size={18}
                      onClick={(e) => toggleMenu(e, canvas.id)}
                    />
                  </div>
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
              {/* 현재 열린 메뉴에 해당하는 캔버스 찾기 */}
              {(() => {
                const canvas = canvases.find((c) => c.id === menuOpen);
                if (!canvas) return null;

                return (
                  <>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleEditClick(e, canvas)}
                    >
                      <BiEdit size={16} />
                      <span>수정</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) =>
                        handleRenameClick(e, canvas.id, canvas.name)
                      }
                    >
                      <BiRename size={16} />
                      <span>이름 변경</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleDuplicateClick(e, canvas)}
                    >
                      <IoDuplicateOutline size={16} />
                      <span>복제</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-700"
                      onClick={(e) =>
                        handleDeleteClick(e, canvas.id, canvas.page_id)
                      }
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

      {/* 캔버스 편집 팝업 */}
      <PopupPortal isOpen={isEditPopupOpen}>
        {editingCanvas && (
          <CanvasEditPopup
            isOpen={isEditPopupOpen}
            onClose={() => {
              setIsEditPopupOpen(false);
              setEditingCanvas(null);
            }}
            onConfirm={handleEditConfirm}
            mode="edit"
            canvasData={{
              id: editingCanvas.id,
              name: editingCanvas.name,
              width: editingCanvas.width,
              height: editingCanvas.height,
              background: editingCanvas.background,
              page_id: editingCanvas.page_id,
            }}
            updateCanvas={handleUpdateCanvas}
          />
        )}
      </PopupPortal>
    </div>
  );
};

export default CanvasList;
