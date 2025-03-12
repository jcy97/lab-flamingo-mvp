"use client";
import { useEffect, useState, useRef } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { HiOutlineAdjustments } from "react-icons/hi";
import { BiRename, BiTrash } from "react-icons/bi";
import { IoDuplicateOutline } from "react-icons/io5";
import { MdOutlinePhotoSizeSelectLarge } from "react-icons/md";
import { useAtom, useAtomValue } from "jotai";
import {
  currentCanvasAtom,
  currentLayerAtom,
  currentLayersAtom,
  LayerWithContents,
  selectedLayersAtom,
  showTransformerAtom,
} from "~/store/atoms";
import {
  deleteLayer,
  duplicateLayer,
  renameLayer,
  reorderLayer,
  toggleLayerVisibility,
} from "~/app/actions/yjs/layerYjs";
import { useSession } from "next-auth/react";

const LayerList: React.FC = () => {
  const { data: session } = useSession();
  const [layers, setLayers] = useAtom(currentLayersAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const [selectedLayers, setSelectedLayers] = useAtom(selectedLayersAtom);
  const [showTransformer, setShowTransformer] = useAtom(showTransformerAtom);
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingLayerId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingLayerId]);

  // 레이어 팝업 닫기 (외부영역 클릭 시)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };

    // 다중 선택 해제를 위한 이벤트 리스너 (캔버스 영역 클릭 시)
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 레이어 리스트 영역 밖을 클릭했을 때 다중 선택 해제
      if (!target.closest(".layer-list-container")) {
        setSelectedLayers([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [setSelectedLayers]);

  // Ctrl+D / Command+D 단축키 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D 또는 Command+D가 눌렸을 때
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault(); // 브라우저 기본 동작 방지 (북마크 등)
        console.log("123");
        // 현재 선택된 레이어가 있을 때만 복제 기능 수행
        if (currentLayer && currentCanvas && session) {
          duplicateLayer(currentCanvas.id, currentLayer.id, session);
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
  }, [currentLayer, currentCanvas, session, selectedLayers, duplicateLayer]);

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
    if (draggedItem === null || dragOverItem === null || !currentCanvas) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }
    // 레이어 순서 변경 함수 호출
    reorderLayer(currentCanvas.id, draggedItem, dragOverItem);

    // 드래그 상태 초기화
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleNameDoubleClick = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingName(currentName);
  };

  const handleNameEditComplete = () => {
    if (editingLayerId && currentCanvas && session) {
      renameLayer(currentCanvas.id, editingLayerId, editingName, session);
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

  // 레이어 가시성 토글 처리
  const handleVisibilityToggle = (
    e: React.MouseEvent,
    layerId: string,
    isVisible: boolean,
  ) => {
    e.stopPropagation();
    if (currentCanvas && session) {
      toggleLayerVisibility(currentCanvas.id, layerId, isVisible, session);
    }
  };

  // 설정 메뉴 토글
  const toggleMenu = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === layerId ? null : layerId);
  };

  // 메뉴에서 이름 변경 시작
  const handleRenameClick = (
    e: React.MouseEvent,
    layerId: string,
    name: string,
  ) => {
    e.stopPropagation();
    setMenuOpen(null);
    setEditingLayerId(layerId);
    setEditingName(name);
  };

  // 레이어 삭제 처리
  const handleDeleteClick = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();

    if (!currentCanvas) return;

    // 삭제 전 확인
    if (
      window.confirm("레이어를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.")
    ) {
      deleteLayer(currentCanvas.id, layerId);
      setMenuOpen(null);
    }
  };

  // 크기 조정 처리
  const handleResizeClick = (e: React.MouseEvent, layer: LayerWithContents) => {
    e.stopPropagation();
    // 현재 레이어로 설정
    setCurrentLayer(layer);
    // 트랜스포머 표시
    setShowTransformer(true);
    // 메뉴 닫기
    setMenuOpen(null);
  };

  // 레이어 복제
  const handleDuplicateClick = (
    e: React.MouseEvent,
    layer: LayerWithContents,
  ) => {
    e.stopPropagation();
    if (!currentCanvas || !session) return;

    // 레이어 복제 함수 호출
    duplicateLayer(currentCanvas.id, layer.id, session).then((newLayerId) => {
      if (newLayerId) {
        console.log(`레이어 복제 성공: ${newLayerId}`);
      } else {
        console.error("레이어 복제 실패");
      }
    });

    setMenuOpen(null);
  };
  // 레이어 선택 처리 (다중 선택 기능 추가)
  const handleLayerSelect = (e: React.MouseEvent, layer: LayerWithContents) => {
    // Command(Mac) 또는 Control(Windows) 키가 눌려있는지 확인
    const isMultiSelectKeyPressed = e.metaKey || e.ctrlKey;

    if (isMultiSelectKeyPressed) {
      // 이미 선택된 레이어인지 확인
      const isAlreadySelected = selectedLayers.some(
        (selected) => selected.id === layer.id,
      );

      if (isAlreadySelected) {
        // 이미 선택된 레이어면 선택 해제 (제거)
        setSelectedLayers(
          selectedLayers.filter((selected) => selected.id !== layer.id),
        );
      } else {
        // 선택되지 않은 레이어면 다중 선택 목록에 추가
        setSelectedLayers([...selectedLayers, layer]);
      }

      // 현재 레이어로도 설정 (편집 작업을 위해)
      setCurrentLayer(layer);
    } else {
      // 일반 클릭 시 다중 선택 해제하고 현재 레이어만 선택
      setSelectedLayers([layer]);
      setCurrentLayer(layer);
    }
  };

  // 레이어가 선택되었는지 확인하는 함수
  const isLayerSelected = (layerId: string) => {
    // 다중 선택이 있는 경우 selectedLayers
    // 배열에서 확인
    if (selectedLayers.length > 0) {
      return selectedLayers.some((layer) => layer.id === layerId);
    }
    // 다중 선택이 없는 경우 currentLayer와 비교
    return currentLayer?.id === layerId;
  };

  if (!layers || layers.length === 0 || !currentCanvas || !currentLayer) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        레이어가 없습니다
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="layer-list-container flex h-full w-full flex-col gap-1 overflow-y-auto"
      tabIndex={0} // 키보드 이벤트를 받기 위해 tabIndex 추가
    >
      {layers
        .sort((a, b) => b.index - a.index)
        .map((layer, index) => (
          <section
            key={layer.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={(e) => handleLayerSelect(e, layer)}
            className={`flex h-[55px] w-full items-center justify-between rounded-lg transition-all duration-150 hover:cursor-pointer ${
              draggedItem === index
                ? "opacity-50"
                : dragOverItem === index
                  ? "border-2 border-primary-500"
                  : ""
            } ${
              isLayerSelected(layer.id)
                ? "bg-neutral-500"
                : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            <div className="flex h-full w-[40px] items-center justify-center border-r border-neutral-100 p-2">
              {layer.visible !== false ? (
                <IoMdEye
                  className="text-neutral-100 hover:cursor-pointer"
                  size={22}
                  onClick={(e) => handleVisibilityToggle(e, layer.id, false)}
                />
              ) : (
                <IoMdEyeOff
                  className="text-neutral-100 hover:cursor-pointer"
                  size={22}
                  onClick={(e) => handleVisibilityToggle(e, layer.id, true)}
                />
              )}
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
            <div className="relative flex h-full w-[40px] items-center justify-center pr-4">
              <HiOutlineAdjustments
                className="text-neutral-100 hover:cursor-pointer"
                size={22}
                onClick={(e) => toggleMenu(e, layer.id)}
              />

              {/* 설정 팝업 메뉴 */}
              {menuOpen === layer.id && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-10 z-50 w-36 rounded bg-neutral-800 shadow-lg"
                  onClick={(e) => e.stopPropagation()} // 레이어 선택 방지
                >
                  <div className="flex flex-col py-1">
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) =>
                        handleRenameClick(e, layer.id, layer.name)
                      }
                    >
                      <BiRename size={16} />
                      <span>이름 변경</span>
                    </button>
                    {/* 크기 조정 옵션 추가 */}
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleResizeClick(e, layer)}
                    >
                      <MdOutlinePhotoSizeSelectLarge size={16} />
                      <span>크기 조정</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                      onClick={(e) => handleDuplicateClick(e, layer)}
                    >
                      <IoDuplicateOutline size={16} />
                      <span>복제</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-700"
                      onClick={(e) => handleDeleteClick(e, layer.id)}
                    >
                      <BiTrash size={16} />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}
    </div>
  );
};

export default LayerList;
