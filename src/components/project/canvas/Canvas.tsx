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

const Canvas: React.FC = () => {
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [isMounted, setIsMounted] = useState(false);
  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const [scaleFactor, setScaleFactor] = useAtom(scaleFactorAtom);
  const [isScaleFactorVisible, setIsScaleFactorVisible] = useState(false);

  // Stage와 컨테이너에 대한 참조
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 스케일 값 변경처리
  useEffect(() => {
    // scaleFactor가 변경될 때마다 표시
    setIsScaleFactorVisible(true);

    // 3초 후에 숨김
    const timer = setTimeout(() => {
      setIsScaleFactorVisible(false);
    }, 3000);

    // 컴포넌트 언마운트 시 또는 scaleFactor 변경 시 타이머 정리
    return () => clearTimeout(timer);
  }, [scaleFactor]); // scaleFactor가 변경될 때마다 실행

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
  };

  // 클릭 이벤트 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // ZOOM_IN이 선택된 경우
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) {
      // 새 스케일 계산 (20% 증가)
      const newScale = Math.min(scaleFactor * ZOOM_IN_FACTOR, MAX_SCALE);
      setScaleFactor(newScale);
    }
    // ZOOM_OUT이 선택된 경우
    else if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) {
      // 새 스케일 계산 (20% 감소)
      const newScale = Math.max(scaleFactor * ZOOM_OUT_FACTOR, MIN_SCALE);
      setScaleFactor(newScale);
    }
  };

  // 휠 이벤트 핸들러
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    // 휠 방향에 따라 스케일 조정
    if (e.deltaY < 0) {
      // 휠 업 (줌 인)
      const newScale = Math.min(scaleFactor * ZOOM_IN_FACTOR, MAX_SCALE);
      setScaleFactor(newScale);
    } else {
      // 휠 다운 (줌 아웃)
      const newScale = Math.max(scaleFactor * ZOOM_OUT_FACTOR, MIN_SCALE);
      setScaleFactor(newScale);
    }
  };

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

  if (!currentCanvas || !isMounted) {
    return null;
  }

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  // 마우스 커서 스타일 결정
  const cursorStyle =
    currentToolbarItem === ToolbarItemIDs.ZOOM_IN
      ? "zoom-in"
      : currentToolbarItem === ToolbarItemIDs.ZOOM_OUT
        ? "zoom-out"
        : "default";

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      style={{
        overflow: "hidden",
        minHeight: "100%",
        minWidth: "100%",
        cursor: cursorStyle,
      }}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
    >
      <div
        style={{
          width: currentCanvas.width * scaleFactor,
          height: currentCanvas.height * scaleFactor,
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
          {/* 현재 스케일 표시: 3초 동안 조정 안했으면 사라짐 */}
          {isScaleFactorVisible && (
            <div className="absolute bottom-2 right-2 z-10 rounded bg-white bg-opacity-70 px-2 py-1 text-xs text-gray-700">
              {Math.round(scaleFactor * 100)}%
            </div>
          )}
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
