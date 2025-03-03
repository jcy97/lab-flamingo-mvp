"use client";
import { useRef, useEffect, useState } from "react";
import { Line, Group } from "react-konva";
import { Layer, LayerContent } from "@prisma/mongodb-client";
import {
  currentToolbarItemAtom,
  brushPropertiesAtom,
  currentLayerAtom,
} from "~/store/atoms";
import { useAtomValue } from "jotai";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import Konva from "konva";
import { LineData } from "~/types/types";
import { useSession } from "next-auth/react";

// 레이어 컨텐츠
export interface LayerWithContents extends Layer {
  layer_content: LayerContent | null;
}

interface BrushComponentProps {
  layer: LayerWithContents;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  stageRef: React.RefObject<Konva.Stage>;
  scale: number;
  onUpdate?: (layerId: string, data: LayerContent) => void;
  isSpacePressed?: boolean;
  listening?: boolean;
}

const Brush: React.FC<BrushComponentProps> = ({
  layer,
  isSelected,
  scale,
  stageRef,
  onUpdate,
  isSpacePressed = false,
}) => {
  const { data: user, status } = useSession();
  // 그려진 라인들을 저장할 상태
  const [lines, setLines] = useState<LineData[]>([]);
  // 현재 그리는 중인 라인
  const [currentLine, setCurrentLine] = useState<LineData | null>(null);
  // 그리기 모드 상태
  const isDrawingRef = useRef(false);
  const currentLayer = useAtomValue(currentLayerAtom);

  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const brushProps = useAtomValue(brushPropertiesAtom);

  // 레이어 데이터 초기화 및 복원
  useEffect(() => {
    if (status !== "authenticated") return;
    if (
      layer.layer_content?.normal_data &&
      typeof layer.layer_content.normal_data === "object"
    ) {
      const normalData = layer.layer_content.normal_data as Record<
        string,
        unknown
      >;
      if (normalData.lines && Array.isArray(normalData.lines)) {
        setLines(normalData.lines as LineData[]);
      }
    }
  }, [layer.id, layer.layer_content, status]);

  // Brush.tsx의 useEffect 부분 수정

  // 이벤트 핸들러 설정 (수정된 코드)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    // Brush.tsx 파일 내 handleMouseDown 함수 수정
    const handleMouseDown = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      // 이벤트 버블링 중지
      e.cancelBubble = true;

      isDrawingRef.current = true;
      const pos = stage.getPointerPosition();
      if (!pos) {
        return;
      }

      // 스테이지의 변환 매트릭스를 사용한 정확한 위치 계산
      const transform = stage.getAbsoluteTransform().copy().invert();
      const point = transform.point(pos);

      // 지우개 모드인지 확인
      const isEraser = currentToolbarItem === ToolbarItemIDs.ERASER;

      // 새 라인 생성
      const newLine: LineData = {
        points: [point.x, point.y],
        stroke: isEraser ? "#000000" : brushProps.color,
        strokeWidth: brushProps.size,
        tension: brushProps.smoothing * 0.5,
        lineCap: brushProps.type === "square" ? "square" : "round",
        lineJoin: brushProps.type === "square" ? "miter" : "round",
        opacity: isEraser ? 1 : brushProps.opacity * (layer.opacity || 1),
        bezier: brushProps.smoothing > 0.3,
        globalCompositeOperation: isEraser ? "destination-out" : "source-over",
      };

      setCurrentLine(newLine);
    };

    const handleMouseMove = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      if (isSpacePressed) {
        if (isDrawingRef.current) {
          completeDrawing();
        }
        return;
      }

      if (!isDrawingRef.current || !currentLine) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // 스테이지의 변환 매트릭스를 사용한 정확한 위치 계산
      const transform = stage.getAbsoluteTransform().copy().invert();
      const point = transform.point(pos);

      // 같은 위치에 점을 계속 추가하는 것을 방지 (성능 개선)
      const lastX = currentLine.points[currentLine.points.length - 2];
      const lastY = currentLine.points[currentLine.points.length - 1];

      // 마지막 점과 현재 점 사이의 거리가 너무 작으면 점 추가하지 않음
      const minDistance = 1; // 최소 거리 설정 (픽셀 단위)
      const dx = point.x - lastX!;
      const dy = point.y - lastY!;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        return;
      }

      // 현재 라인에 포인트 추가
      const newPoints = [...currentLine.points, point.x, point.y];

      setCurrentLine({
        ...currentLine,
        points: newPoints,
      });
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return;
      completeDrawing();
    };

    const completeDrawing = () => {
      isDrawingRef.current = false;

      if (currentLine) {
        // 점이 너무 적으면 드로잉 무시 (클릭만 했을 때)
        if (currentLine.points.length <= 2) {
          setCurrentLine(null);
          return;
        }

        // 현재 라인을 lines 배열에 추가
        const updatedLines = [...lines, currentLine];
        setLines(updatedLines);
        setCurrentLine(null);

        if (!layer.layer_content) {
          return;
        }

        if (onUpdate) {
          const updatedLayerContent = {
            id: layer.layer_content.id,
            layer_id: layer.layer_content.layer_id,
            position_x: layer.layer_content.position_x,
            position_y: layer.layer_content.position_y,
            rotation: layer.layer_content.rotation,
            normal_data: {
              lines: updatedLines, // 업데이트된 라인으로 교체
            } as Record<string, any>,
            shape_data: layer.layer_content.shape_data,
            text_data: layer.layer_content.text_data,
            image_data: layer.layer_content.image_data,
          };

          onUpdate(layer.id, updatedLayerContent);
        }
      }
    };

    //이벤트 리스너 등록
    if (
      (currentToolbarItem === ToolbarItemIDs.BRUSH ||
        currentToolbarItem === ToolbarItemIDs.ERASER) &&
      isSelected
    ) {
      // 먼저 이전 이벤트 리스너 모두 제거
      stage.off("mousedown touchstart", handleMouseDown);
      stage.off("mousemove touchmove", handleMouseMove);
      stage.off("mouseup touchend", handleMouseUp);

      // 새 이벤트 리스너 등록
      stage.on("mousedown touchstart", handleMouseDown);
      stage.on("mousemove touchmove", handleMouseMove);
      stage.on("mouseup touchend", handleMouseUp);

      // 문서 레벨 이벤트 리스너 (마우스가 캔버스 밖으로 나갔을 때도 작동하도록)
      document.removeEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseup", handleMouseUp);
    }

    // 컴포넌트 언마운트 또는 의존성 변경 시 이벤트 리스너 제거 (명확한 제거)
    return () => {
      if (stage) {
        stage.off("mousedown touchstart", handleMouseDown);
        stage.off("mousemove touchmove", handleMouseMove);
        stage.off("mouseup touchend", handleMouseUp);
      }
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    currentLayer,
    currentToolbarItem,
    isSelected,
    layer,
    isSpacePressed,
    brushProps,
    scale,
    lines,
    currentLine,
    onUpdate,
  ]);
  // visible이 false인 경우 렌더링하지 않음
  if (!layer.visible) return null;

  return (
    <Group>
      {/* 저장된 모든 라인 렌더링 */}
      {lines.map((line, i) => (
        <Line
          key={`line-${i}`}
          points={line.points}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          tension={line.tension}
          lineCap={line.lineCap}
          lineJoin={line.lineJoin}
          opacity={line.opacity}
          bezier={line.bezier}
          perfectDrawEnabled={false}
          listening={false}
          globalCompositeOperation={
            line.globalCompositeOperation || "source-over"
          }
        />
      ))}

      {/* 현재 그리는 중인 라인 */}
      {currentLine && (
        <Line
          points={currentLine.points}
          stroke={currentLine.stroke}
          strokeWidth={currentLine.strokeWidth}
          tension={currentLine.tension}
          lineCap={currentLine.lineCap}
          lineJoin={currentLine.lineJoin}
          opacity={currentLine.opacity}
          perfectDrawEnabled={false}
          listening={false}
          bezier={currentLine.bezier}
          strokeScaleEnabled={true}
          globalCompositeOperation={
            currentLine.globalCompositeOperation || "source-over"
          }
        />
      )}
    </Group>
  );
};

export default Brush;
