"use client";
import { useAtomValue, useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import {
  currentCanvasAtom,
  currentToolbarItemAtom,
  scaleFactorAtom,
} from "~/store/atoms";
import { Stage, Layer, Text, Rect } from "react-konva";
import { ToolbarItemIDs } from "~/constants/toolbarItems";

// 최소 및 최대 스케일 값 정의
const MIN_SCALE = 0.1; // 최소 스케일 (10%)
const MAX_SCALE = 5; // 최대 스케일 (500%)
const ZOOM_IN_FACTOR = 1.2; // 줌 인 시 20% 증가
const ZOOM_OUT_FACTOR = 0.8; // 줌 아웃 시 20% 감소

const WHEEL_ZOOM_SENSITIVITY = 0.05;

const Canvas: React.FC = () => {
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [isMounted, setIsMounted] = useState(false);
  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const [scaleFactor, setScaleFactor] = useAtom(scaleFactorAtom);

  // 캔버스 위치 상태 추가
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [recentlyFinishedSpacebarDrag, setRecentlyFinishedSpacebarDrag] =
    useState(false);

  // Stage와 컨테이너에 대한 참조
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 윈도우 크기에 맞게 초기 스케일 조정하는 함수
  const adjustInitialScale = () => {
    if (!currentCanvas || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // 화면 가장자리에 여백을 주기 위한 패딩 값
    const padding = 40;
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
  const changeScale = (newScale: number) => {
    // MIN_SCALE과 MAX_SCALE 사이로 제한
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    setScaleFactor(clampedScale);
  };

  // 클릭 이벤트 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

  //휠 이벤트
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // 스페이스바 쿨다운 기간 중 휠 이벤트 무시
    if (recentlyFinishedSpacebarDrag) {
      e.preventDefault();
      return;
    }

    // 브라우저의 기본 줌 동작 방지
    e.preventDefault();

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

    // 현재 스케일에 조정 값 적용
    changeScale(scaleFactor * zoomFactor);
  };

  // 마우스 다운 이벤트 핸들러 - 드래그 시작
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 마우스가 컨테이너를 벗어났을 때 드래그 종료
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 임시 모드 상태 추가
  const [temporaryZoomIn, setTemporaryZoomIn] = useState(false);
  const [temporaryZoomOut, setTemporaryZoomOut] = useState(false);

  // 키보드 이벤트 핸들러 - 스페이스 키 감지 및 단축키 처리
  useEffect(() => {
    // 현재 활성화된 키의 상태를 관리하기 위한 객체
    const activeKeys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      // 키 상태 업데이트
      activeKeys[e.code] = true;

      // 스페이스 키 처리
      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
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

    const handleKeyUp = (e: KeyboardEvent) => {
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

  useEffect(() => {
    setIsMounted(true);
    adjustInitialScale();
  }, [currentCanvas]);

  // 윈도우 크기가 변경될 때 스케일 업데이트
  useEffect(() => {
    const handleResize = () => {
      adjustInitialScale();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentCanvas]);

  // meta 태그 추가를 위한 useEffect
  useEffect(() => {
    // 기존 meta 태그 찾기
    let metaTag = document.querySelector(
      'meta[name="viewport"]',
    ) as HTMLMetaElement;

    // 기존 태그가 없으면 생성
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "viewport");
      document.head.appendChild(metaTag);
    }

    // maximum-scale과 user-scalable 속성 설정
    metaTag.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    );

    // 컴포넌트 언마운트 시 원래 상태로 복원
    return () => {
      metaTag.setAttribute("content", "width=device-width, initial-scale=1.0");
    };
  }, []);

  if (!currentCanvas || !isMounted) {
    return null;
  }

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  // 마우스 커서 스타일 결정
  const getCursorStyle = () => {
    // 임시 확대/축소 모드 우선 처리
    if (temporaryZoomIn) return "zoom-in";
    if (temporaryZoomOut) return "zoom-out";

    // 기존 커서 스타일 처리
    if (isDragging) return "grabbing";
    if (isSpacePressed || currentToolbarItem === ToolbarItemIDs.HAND)
      return "grab";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) return "zoom-in";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) return "zoom-out";
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
        cursor: getCursorStyle(),
        touchAction: "none", // 브라우저 기본 터치 액션 비활성화
      }}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          width: currentCanvas.width * scaleFactor,
          height: currentCanvas.height * scaleFactor,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        {/* 배경 컨테이너 */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: isTransparent ? "" : currentCanvas.background,
            position: "relative",
          }}
          className={isTransparent ? "bg-checkerboard" : ""}
        >
          {/* Konva 스테이지 */}
          <Stage
            ref={stageRef}
            width={currentCanvas.width}
            height={currentCanvas.height}
            scaleX={scaleFactor}
            scaleY={scaleFactor}
            attrs={{
              originalWidth: currentCanvas.width,
              originalHeight: currentCanvas.height,
            }}
          >
            <Layer>
              <Text text="콘바콘바테스트" fontSize={100} x={300} y={300} />
              <Rect
                x={300}
                y={300}
                width={100}
                height={100}
                fill="red"
                shadowBlur={10}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
