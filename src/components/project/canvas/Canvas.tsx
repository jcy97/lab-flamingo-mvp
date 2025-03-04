"use client";
import { useAtomValue, useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import {
  currentCanvasAtom,
  currentToolbarItemAtom,
  scaleFactorAtom,
  currentLayersAtom,
  currentLayerAtom,
  canvasSelectedLayerMapAtom,
  LayerWithContents,
} from "~/store/atoms";
import { Stage, Layer } from "react-konva";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import { Canvas as CanvasType, LayerContent } from "@prisma/mongodb-client";
import Konva from "konva";
import Brush from "./Layer/Brush";
import { brushPropertiesAtom } from "~/store/atoms";
import BrushCursor from "./Layer/BurshCurosr";
import { saveLayerContent } from "~/app/actions/yjs/layerYjs";
import { useSession } from "next-auth/react";
import UserMousePointers from "~/components/common/user/UserMousePointers";

// Define Canvas with Layers type
export interface CanvasWithLayers extends CanvasType {
  canvas_layers: LayerWithContents[];
}

// 레이어 업데이트 인터페이스 수정 (lines 배열로 변경)
interface LayerUpdatePayload {
  layerId: string;
  normalData: {
    lines: LineData[];
  };
}

// LineData 인터페이스 추가
interface LineData {
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: "round" | "square";
  lineJoin: "round" | "miter";
  opacity: number;
}

// 최소 및 최대 스케일 값 정의
const MIN_SCALE = 0.1; // 최소 스케일 (10%)
const MAX_SCALE = 2; // 최대 스케일 (200%)
const ZOOM_IN_FACTOR = 1.2; // 줌 인 시 20% 증가
const ZOOM_OUT_FACTOR = 0.8; // 줌 아웃 시 20% 감소

const WHEEL_ZOOM_SENSITIVITY = 0.05;

const Canvas: React.FC = () => {
  const { data: user } = useSession();

  const currentCanvas = useAtomValue(currentCanvasAtom) as
    | CanvasWithLayers
    | undefined;
  const currentLayers = useAtomValue(currentLayersAtom) as LayerWithContents[];
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [currentToolbarItem, setCurrentToolbarItem] = useAtom(
    currentToolbarItemAtom,
  );
  const [scaleFactor, setScaleFactor] = useAtom(scaleFactorAtom);
  const [canvasSelectedLayerMap, setCanvasSelectedLayerMap] = useAtom(
    canvasSelectedLayerMapAtom,
  );

  // 캔버스 위치 상태
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [recentlyFinishedSpacebarDrag, setRecentlyFinishedSpacebarDrag] =
    useState<boolean>(false);

  // 임시 모드 상태
  const [temporaryZoomIn, setTemporaryZoomIn] = useState<boolean>(false);
  const [temporaryZoomOut, setTemporaryZoomOut] = useState<boolean>(false);

  // Stage와 컨테이너에 대한 참조
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 윈도우 크기에 맞게 초기 스케일 조정하는 함수
  const adjustInitialScale = (): void => {
    if (!currentCanvas || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // 화면 가장자리에 여백을 주기 위한 패딩 값
    const padding = 120;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    // 너비와 높이에 대한 스케일 팩터 계산
    const widthScale = availableWidth / currentCanvas.width;
    const heightScale = availableHeight / currentCanvas.height;

    // 캔버스가 완전히 화면에 들어갈 수 있도록 더 작은 스케일 값 사용
    const newScale = Math.min(widthScale, heightScale, 1);

    // 스케일이 1보다 작을 때만 적용 (축소만 적용, 확대는 안 함)
    if (newScale < 1) {
      setScaleFactor(newScale);
    } else {
      setScaleFactor(1);
    }

    // 초기 위치도 중앙으로 설정
    setPosition({ x: 0, y: 0 });
  };

  // 스케일 변경 함수 - 모든 줌 작업에 사용
  const changeScale = (newScale: number): void => {
    // MIN_SCALE과 MAX_SCALE 사이로 제한
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    setScaleFactor(clampedScale);
  };

  // 레이어 업데이트 핸들러
  const handleLayerUpdate = (layerId: string, data: LayerContent): void => {
    // 서버에 데이터 저장하기 전에 브러시 업데이트가 현재 레이어에 제대로 적용되도록 확인
    if (currentLayer?.id === layerId || selectedLayerId === layerId) {
      // 브러시 업데이트가 현재 레이어에 적용되었음을 확인 (상태 갱신)
      const updatedLayers = currentLayers.map((layer) => {
        if (layer.id === layerId) {
          return {
            ...layer,
            layer_content: data,
          };
        }
        return layer;
      });

      // 필요한 경우 레이어 상태 업데이트 로직 추가
    }

    // 서버에 데이터 저장
    saveLayerContent(currentCanvas!.id, layerId, data, user!);
  };

  // 클릭 이벤트 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    // 임시 확대 모드가 활성화된 경우
    if (temporaryZoomIn) {
      // 새 스케일 계산 (20% 증가)
      changeScale(scaleFactor * ZOOM_IN_FACTOR);
      return;
    }

    // 임시 축소 모드가 활성화된 경우
    if (temporaryZoomOut) {
      // 새 스케일 계산 (20% 감소)
      changeScale(scaleFactor * ZOOM_OUT_FACTOR);
      return;
    }

    // 기존 줌 툴바 기능
    // ZOOM_IN이 선택된 경우
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) {
      // 새 스케일 계산 (20% 증가)
      changeScale(scaleFactor * ZOOM_IN_FACTOR);
    }
    // ZOOM_OUT이 선택된 경우
    else if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) {
      // 새 스케일 계산 (20% 감소)
      changeScale(scaleFactor * ZOOM_OUT_FACTOR);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    // 스페이스바 쿨다운 기간 중 휠 이벤트 무시
    if (recentlyFinishedSpacebarDrag) {
      e.preventDefault();
      return;
    }

    // 브라우저의 기본 줌 동작 방지
    e.preventDefault();

    // 스테이지 참조가 없으면 리턴
    if (!stageRef.current) return;

    // ctrl 키와 함께 사용되는 경우 핀치 제스처로 간주 (맥북)
    const isPinchGesture = e.ctrlKey || e.metaKey;

    // 기본 감도 설정
    let sensitivity = WHEEL_ZOOM_SENSITIVITY;

    // 핀치 제스처인 경우 더 낮은 감도 사용
    if (isPinchGesture) {
      sensitivity = sensitivity * 0.5; // 핀치 제스처에 대해 감도 줄임
    }

    // deltaY 값에 따라 스케일 조정 (부드러운 변화를 위해 작은 값 사용)
    // 음수 deltaY는 확대, 양수 deltaY는 축소
    const zoomFactor = 1 - e.deltaY * sensitivity;

    // 현재 스케일에 조정 값 적용 (MIN_SCALE과 MAX_SCALE 사이로 제한)
    const newScale = Math.min(
      Math.max(scaleFactor * zoomFactor, MIN_SCALE),
      MAX_SCALE,
    );

    // 스케일 변경
    setScaleFactor(newScale);
  };

  // 마우스 다운 이벤트 핸들러 - 드래그 시작
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    // 임시 확대/축소 모드일 경우 드래그 방지
    if (temporaryZoomIn || temporaryZoomOut) {
      return;
    }

    // 핸드 툴이 선택되었거나 스페이스 키가 눌렸을 때만 드래그 가능
    if (currentToolbarItem === ToolbarItemIDs.HAND || isSpacePressed) {
      setIsDragging(true);
      setLastPointerPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  // 마우스 이동 이벤트 핸들러 - 드래그 중
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isDragging) return;

    const newPosition = {
      x: position.x + (e.clientX - lastPointerPosition.x),
      y: position.y + (e.clientY - lastPointerPosition.y),
    };

    setPosition(newPosition);
    setLastPointerPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // 마우스 업 이벤트 핸들러 - 드래그 종료
  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  // 마우스가 컨테이너를 벗어났을 때 드래그 종료
  const handleMouseLeave = (): void => {
    setIsDragging(false);
  };

  // 키보드 이벤트 핸들러 - 스페이스 키 감지 및 단축키 처리
  useEffect(() => {
    // 현재 활성화된 키의 상태를 관리하기 위한 객체
    const activeKeys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent): void => {
      // 키 상태 업데이트
      activeKeys[e.code] = true;

      // 스페이스 키 처리
      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
      }
      // B 키를 눌렀을 때 브러시 도구 선택
      if (e.code === "KeyB" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.BRUSH);
      }
      // V 키를 눌렀을 때 선택 도구 선택
      if (e.code === "KeyV" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.SELECT);
      }
      // V 키를 눌렀을 때 선택 도구 선택
      if (e.code === "KeyE" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.ERASER);
      }

      // Windows: Ctrl+Space, macOS: 스포트라이트 충돌 방지를 위해 Ctrl+Space로 통일
      // 임시 확대 모드 활성화
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault(); // 기본 브라우저 동작 방지
        setTemporaryZoomIn(true);
        setTemporaryZoomOut(false);
      }

      // Windows/macOS 모두: Alt/Option + Space: 임시 축소 모드 활성화
      if (e.altKey && e.code === "Space") {
        e.preventDefault(); // 기본 브라우저 동작 방지
        setTemporaryZoomOut(true);
        setTemporaryZoomIn(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      // 키 상태 업데이트
      activeKeys[e.code] = false;

      // 키를 뗐을 때 임시 모드 해제
      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        setTemporaryZoomIn(false);
      }

      if (e.code === "AltLeft" || e.code === "AltRight") {
        setTemporaryZoomOut(false);
      }

      if (e.code === "Space") {
        setIsSpacePressed(false);
        setTemporaryZoomIn(false);
        setTemporaryZoomOut(false);

        // 스페이스바 뗀 후 쿨다운 활성화
        setRecentlyFinishedSpacebarDrag(true);

        // 짧은 지연 후 쿨다운 해제 (300ms)
        setTimeout(() => {
          setRecentlyFinishedSpacebarDrag(false);
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    setIsMounted(true);
    adjustInitialScale();
  }, [currentCanvas, containerRef]);

  // 윈도우 크기가 변경될 때 스케일 업데이트
  useEffect(() => {
    const handleResize = (): void => {
      adjustInitialScale();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentCanvas]);

  if (!currentCanvas || !isMounted) {
    return null;
  }

  // 현재 선택된 레이어 ID
  const selectedLayerId =
    currentLayer?.id ||
    (currentCanvas && canvasSelectedLayerMap[currentCanvas.id]);

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  // 마우스 커서 스타일 결정
  const getCursorStyle = (): string => {
    // 임시 확대/축소 모드 우선 처리
    if (temporaryZoomIn) return "zoom-in";
    if (temporaryZoomOut) return "zoom-out";

    // 기존 커서 스타일 처리
    if (isDragging) return "grabbing";
    if (isSpacePressed || currentToolbarItem === ToolbarItemIDs.HAND)
      return "grab";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) return "zoom-in";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) return "zoom-out";

    // 브러시 도구 선택 시
    if (currentToolbarItem === ToolbarItemIDs.BRUSH) return "crosshair";
    return "default";
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      style={{
        overflow: "hidden",
        minHeight: "100%",
        minWidth: "100%",
        cursor: isSpacePressed
          ? isDragging
            ? "grabbing"
            : "grab"
          : currentToolbarItem === ToolbarItemIDs.BRUSH ||
              currentToolbarItem === ToolbarItemIDs.ERASER
            ? "none"
            : getCursorStyle(),
      }}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* 브러쉬 모드용 커서 */}
      <BrushCursor
        containerRef={containerRef}
        isSpacePressed={isSpacePressed}
      />

      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transformOrigin: "top left",
        }}
      >
        {/* 다른 사용자들의 마우스 포인터 - 스테이지와 같은 레벨에 배치 */}
        {currentCanvas && stageRef.current && (
          <UserMousePointers stageRef={stageRef} canvasId={currentCanvas.id} />
        )}

        {/* 배경 컨테이너 */}
        <div
          style={{
            width: currentCanvas.width * scaleFactor,
            height: currentCanvas.height * scaleFactor,
            background: isTransparent ? "" : currentCanvas.background,
            position: "relative",
          }}
          className={isTransparent ? "bg-checkerboard" : ""}
        >
          <Stage
            ref={stageRef}
            width={currentCanvas.width * scaleFactor}
            height={currentCanvas.height * scaleFactor}
            scaleX={scaleFactor}
            scaleY={scaleFactor}
            onMouseDown={(e) => e.evt.preventDefault()}
            onTouchStart={(e) => e.evt.preventDefault()}
          >
            {/* 레이어 순서대로 렌더링 (인덱스 낮은 것부터) */}
            {currentLayers &&
              currentLayers.length > 0 &&
              [...currentLayers]
                .sort((a, b) => a.index - b.index)
                .map((layer) => {
                  // 각 레이어를 별도의 Konva Layer로 렌더링
                  if (layer.type === "NORMAL" && layer.layer_content) {
                    return (
                      <Layer
                        key={`layer-${layer.id}`}
                        visible={layer.visible}
                        imageSmoothingEnabled={true}
                        opacity={layer.opacity || 1}
                      >
                        <Brush
                          layer={layer}
                          isSelected={layer.id === selectedLayerId}
                          canvasWidth={currentCanvas.width}
                          canvasHeight={currentCanvas.height}
                          scale={scaleFactor}
                          onUpdate={handleLayerUpdate}
                          stageRef={stageRef}
                          isSpacePressed={isSpacePressed}
                          listening={layer.id === selectedLayerId}
                        />
                      </Layer>
                    );
                  }
                  return null;
                })}
          </Stage>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
