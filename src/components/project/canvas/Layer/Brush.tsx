"use client";
import { useRef, useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";
import { Layer, LayerContent } from "@prisma/mongodb-client";
import { currentToolbarItemAtom, brushPropertiesAtom } from "~/store/atoms"; // brushPropertiesAtom import 추가
import { useAtomValue } from "jotai";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import Konva from "konva";

// 레이어 컨텐츠
export interface LayerWithContents extends Layer {
  layer_content: LayerContent | null;
}

// 레이어 업데이트
interface LayerUpdatePayload {
  layerId: string;
  normalData: {
    brushData: string;
  };
}

interface BrushComponentProps {
  layer: LayerWithContents;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  stageRef: React.RefObject<Konva.Stage>;
  scale: number;
  onUpdate?: (payload: LayerUpdatePayload) => void;
  isSpacePressed?: boolean; // 새로운 prop 추가: 스페이스바 상태
}

const Brush: React.FC<BrushComponentProps> = ({
  layer,
  isSelected,
  canvasWidth,
  canvasHeight,
  scale,
  stageRef,
  onUpdate,
  isSpacePressed = false, // 기본값 false로 설정
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // lastPosition을 useState 대신 useRef로 변경
  const lastPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);

  // brushPropertiesAtom 사용
  const brushProps = useAtomValue(brushPropertiesAtom);

  //브러쉬 상태
  let isDrawingRef = useRef(false);

  // 초기화 및 이미지 데이터 복원
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");

    // 기존 데이터가 있다면 복원
    if (
      layer.layer_content?.normal_data &&
      typeof layer.layer_content.normal_data === "object"
    ) {
      const normalData = layer.layer_content.normal_data as Record<
        string,
        unknown
      >;
      if (normalData.brushData && typeof normalData.brushData === "string") {
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            updateKonvaImage(canvas);
          }
        };
        img.src = normalData.brushData;
      } else {
        updateKonvaImage(canvas);
      }
    } else {
      updateKonvaImage(canvas);
    }

    canvasRef.current = canvas;
  }, [layer.id, canvasWidth, canvasHeight]);

  // 스케일이 변경될 때 캔버스 크기 조정
  useEffect(() => {
    if (canvasRef.current) {
      // 이미지를 새 스케일로 업데이트
      updateKonvaImage(canvasRef.current);
    }
  }, [scale]);

  // 이벤트 핸들러 추가
  useEffect(() => {
    // 직접 stageRef 사용
    const stage = stageRef.current;
    if (!stage) {
      console.log("Stage is not available yet");
      return;
    }

    console.log("Stage found, setting up event handlers");

    // 이벤트 핸들러 함수
    const handleMouseDownEvent = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      console.log("Mouse down event triggered");
      // 스페이스바가 눌려있으면 그리기 시작하지 않음
      if (!isSpacePressed) {
        handleMouseDown(e);
      }
    };

    const handleMouseMoveEvent = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      console.log("Mouse move event", isDrawing);
      // 스페이스바가 눌려있는데 그리기 중이었다면 그리기 중단
      if (isSpacePressed && isDrawingRef.current) {
        isDrawingRef.current = false;
        setIsDrawing(false);
        handleMouseUp(); // 강제로 마우스업 처리
      } else if (!isSpacePressed) {
        handleMouseMove(e);
      }
    };

    const handleMouseUpEvent = () => {
      console.log("Mouse up event");
      handleMouseUp();
    };

    // 브러시 선택 시에만 이벤트 리스너 활성화
    // 스페이스바 상태와 상관없이 항상 이벤트 리스너는 활성화하되
    // 핸들러 내부에서 스페이스바 상태에 따라 동작을 제어
    if (currentToolbarItem === ToolbarItemIDs.BRUSH && isSelected) {
      console.log("Activating brush event listeners");
      stage.on("mousedown touchstart", handleMouseDownEvent);
      stage.on("mousemove touchmove", handleMouseMoveEvent);
      stage.on("mouseup touchend", handleMouseUpEvent);

      // 스테이지 밖으로 마우스가 나가도 드로잉이 끝나도록 처리
      document.addEventListener("mouseup", handleMouseUpEvent);
    } else {
      // 이벤트 리스너 제거
      console.log("Removing brush event listeners");
      stage.off("mousedown touchstart");
      stage.off("mousemove touchmove");
      stage.off("mouseup touchend");
      document.removeEventListener("mouseup", handleMouseUpEvent);
    }

    // 클린업 함수
    return () => {
      if (stage) {
        console.log("Cleanup: Removing event listeners");
        stage.off("mousedown touchstart");
        stage.off("mousemove touchmove");
        stage.off("mouseup touchend");
      }
      document.removeEventListener("mouseup", handleMouseUpEvent);
    };
  }, [currentToolbarItem, isSelected, layer.id, isSpacePressed, brushProps]); // brushProps 의존성 추가

  //이미지 업데이트
  const updateKonvaImage = (canvas: HTMLCanvasElement): void => {
    const dataUrl = canvas.toDataURL();

    if (imageRef.current) {
      const img = new window.Image();
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current.image(img);
          // 성능 최적화: batchDraw 사용
          imageRef.current.getLayer()?.batchDraw();
        }
      };
      img.src = dataUrl;
    } else {
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = dataUrl;
    }
  };

  const handleMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void => {
    // 스페이스바가 눌렸거나, 다른 조건이 맞지 않으면 그리기 막기
    if (
      isSpacePressed || // 스페이스바가 눌렸는지 확인
      currentToolbarItem !== ToolbarItemIDs.BRUSH ||
      !isSelected ||
      layer.locked ||
      !layer.visible
    ) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) {
      return;
    }

    const point = stage.getPointerPosition();
    if (!point) {
      return;
    }

    // 두 상태 모두 설정 (useState와 useRef)
    isDrawingRef.current = true;
    setIsDrawing(true);

    const scaledPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    lastPositionRef.current = scaledPoint;

    // 시작점 그리기
    drawOnCanvas(scaledPoint, scaledPoint);
  };

  const handleMouseMove = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void => {
    // 스페이스바가 눌렸으면 그리기 중지
    if (isSpacePressed) {
      // 그리기 중이었다면 상태 초기화하고 완전히 종료 처리
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setIsDrawing(false);

        // 스페이스바가 눌렸을 때 그리기 중이었다면 그리기 완료 처리
        if (canvasRef.current && onUpdate) {
          const brushData = canvasRef.current.toDataURL();
          onUpdate({
            layerId: layer.id,
            normalData: {
              brushData,
            },
          });
          console.log("Spacebar pressed: Forced drawing completion");
        }
      }
      return;
    }

    // isDrawingRef로 체크 (useState보다 즉시 반영됨)
    if (!isDrawingRef.current) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getPointerPosition();
    if (!point) return;

    const scaledPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    // 마지막 위치와 현재 위치 사이를 그림
    drawOnCanvas(lastPositionRef.current, scaledPoint);

    // 마지막 위치 업데이트
    lastPositionRef.current = scaledPoint;
  };

  const handleMouseUp = (): void => {
    if (!isDrawingRef.current) return;
    console.log("Mouse up handler", isDrawing);

    isDrawingRef.current = false;
    if (!isDrawing) return;

    // 드로잉 상태 종료
    console.log("그리기 완료");
    setIsDrawing(false);

    // 그리기 완료 후 데이터 저장
    if (canvasRef.current && onUpdate) {
      const brushData = canvasRef.current.toDataURL();
      onUpdate({
        layerId: layer.id,
        normalData: {
          brushData,
        },
      });
      console.log("Updated layer data");
    }
  };

  const drawOnCanvas = (
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // 브러시 설정을 brushPropertiesAtom에서 가져온 값으로 설정
    ctx.globalAlpha = brushProps.opacity * (layer.opacity || 1);
    ctx.strokeStyle = brushProps.color;
    ctx.lineWidth = brushProps.size;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 브러시 타입에 따른 설정
    if (brushProps.type === "square") {
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";
    }

    // 압력 감지가 활성화된 경우 처리
    // e 매개변수가 없으므로 현재는 압력 감지 기능을 사용할 수 없음
    // 나중에 이벤트 객체를 전달하도록 수정 필요
    if (brushProps.pressure) {
      // 기본 압력값으로 0.5 사용
      const pressure = 0.5;
      ctx.lineWidth = brushProps.size * pressure;
    }

    // 실제 그리기
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    // 선 부드럽게 (기존과 동일)
    if (brushProps.smoothing > 0) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;

      ctx.bezierCurveTo(
        from.x + dx * brushProps.smoothing,
        from.y + dy * brushProps.smoothing,
        to.x - dx * brushProps.smoothing,
        to.y - dy * brushProps.smoothing,
        to.x,
        to.y,
      );
    } else {
      ctx.lineTo(to.x, to.y);
    }

    ctx.stroke();

    // 중요: requestAnimationFrame을 사용하여 화면 갱신 최적화
    requestAnimationFrame(() => {
      updateKonvaImage(canvasRef.current!);
    });
  };

  // visible이 false인 경우 렌더링하지 않음
  if (!layer.visible) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={image!}
      width={canvasWidth}
      height={canvasHeight}
      opacity={layer.opacity}
      listening={currentToolbarItem === ToolbarItemIDs.BRUSH && isSelected} // 항상 이벤트는 듣되, 핸들러에서 스페이스바 상태 확인
      perfectDrawEnabled={false}
      transformsEnabled="position"
    />
  );
};

export default Brush;
