import { useEffect, useState, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { IoMdSettings } from "react-icons/io";
import { BiRename, BiTrash } from "react-icons/bi";
import {
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayersAtom,
  currentPageAtom,
} from "~/store/atoms";
import { useSession } from "next-auth/react";
import {
  deleteCanvas,
  renameCanvas,
  reorderCanvases,
} from "~/app/actions/canvasYjs";

const CanvasList: React.FC = () => {
  const { data: session } = useSession();
  const [canvases, setCanvases] = useAtom(currentCanvasesAtom);
  const [selectedCanvas, setSelectedCanvas] = useAtom(currentCanvasAtom);
  const [currentPage] = useAtom(currentPageAtom);
  const setCurrentLayers = useSetAtom(currentLayersAtom);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCanvas) {
      setCurrentLayers(selectedCanvas.canvas_layers);
    }
  }, [selectedCanvas, setCurrentLayers]);

  useEffect(() => {
    if (editingCanvasId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCanvasId]);

  // Close menu when clicking outside
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

    // Call reorderCanvases to persist the change through YJS and server
    reorderCanvases(pageId, draggedItem, dragOverItem);

    // Note: We no longer need to manually update the UI state here as the YJS observation will handle it

    // Reset drag state
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

  // Toggle settings menu
  const toggleMenu = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation(); // Prevent canvas selection
    setMenuOpen(menuOpen === canvasId ? null : canvasId);
  };

  // Start rename from menu
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

  // Handle canvas deletion
  const handleDeleteClick = (
    e: React.MouseEvent,
    canvasId: string,
    pageId: string,
  ) => {
    e.stopPropagation();

    if (!session) return;

    // Confirm before deletion
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
    <div className="h-[90%] overflow-y-auto">
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
              onClick={() => setSelectedCanvas(canvas)}
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
                  selectedCanvas && selectedCanvas.id === canvas.id
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

                  {/* Settings Icon with Menu */}
                  <div className="relative">
                    <IoMdSettings
                      className="text-neutral-100 duration-150 hover:scale-105 hover:cursor-pointer"
                      size={18}
                      onClick={(e) => toggleMenu(e, canvas.id)}
                    />

                    {/* Settings Popup Menu */}
                    {menuOpen === canvas.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-6 z-50 w-36 rounded bg-neutral-800 shadow-lg"
                        onClick={(e) => e.stopPropagation()} // Prevent canvas selection
                      >
                        <div className="flex flex-col py-1">
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
                            className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-700"
                            onClick={(e) =>
                              handleDeleteClick(e, canvas.id, canvas.page_id)
                            }
                          >
                            <BiTrash size={16} />
                            <span>삭제</span>
                          </button>
                        </div>
                      </div>
                    )}
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
    </div>
  );
};

export default CanvasList;
