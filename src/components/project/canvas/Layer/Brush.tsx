import { useRef, useEffect, useState } from "react";
import { Line, Group } from "react-konva";
import { Layer, LayerContent } from "@prisma/mongodb-client";
import {
  currentToolbarItemAtom,
  brushPropertiesAtom,
  currentLayerAtom,
  LayerWithContents,
  addLayerRefAtom,
  removeLayerRefAtom,
} from "~/store/atoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import Konva from "konva";
import { LineData, SizeInfo, Transform } from "~/types/types";
import { useSession } from "next-auth/react";
import {
  initBrushAwareness,
  updateDrawingAwareness,
  cleanupDrawingAwareness,
} from "~/app/actions/yjs/brushYjs";

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
  onSizeChange?: (layerId: string, newSize: SizeInfo) => void;
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

  // 다른 사용자들이 그리는 중인 라인들
  const [otherUsersDrawingLines, setOtherUsersDrawingLines] = useState<{
    [userId: string]: LineData;
  }>({});

  // 그리기 모드 상태
  const isDrawingRef = useRef(false);
  const currentLayer = useAtomValue(currentLayerAtom);

  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const brushProps = useAtomValue(brushPropertiesAtom);

  const groupRef = useRef<Konva.Group>(null);

  // 그룹의 변환 정보를 저장
  const [groupTransform, setGroupTransform] = useState<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }>({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  });

  // 레이어 ref 추가/제거 atom
  const [, addLayerRef] = useAtom(addLayerRefAtom);
  const [, removeLayerRef] = useAtom(removeLayerRefAtom);

  // 컴포넌트 마운트/언마운트 시 ref 등록/해제
  useEffect(() => {
    if (groupRef.current) {
      // ref 등록
      addLayerRef({ layerId: layer.id, node: groupRef.current });
    }

    // 컴포넌트 언마운트 시 ref 해제
    return () => {
      removeLayerRef(layer.id);
    };
  }, [layer.id, addLayerRef, removeLayerRef]);

  // layer.layer_content.transform 값 감지 및 그룹 변환 업데이트
  useEffect(() => {
    if (!layer.layer_content?.transform || !groupRef.current) return;

    const transform = layer.layer_content.transform as unknown as Transform;
    // 그룹 변환 업데이트
    setGroupTransform({
      x: transform.x || 0,
      y: transform.y || 0,
      scaleX: transform.scaleX || 1,
      scaleY: transform.scaleY || 1,
      rotation: transform.rotation || 0,
    });

    // 그룹 속성 직접 설정
    if (groupRef.current) {
      groupRef.current.x(transform.x || 0);
      groupRef.current.y(transform.y || 0);
      groupRef.current.scaleX(transform.scaleX || 1);
      groupRef.current.scaleY(transform.scaleY || 1);
      groupRef.current.rotation(transform.rotation || 0);

      // 변경사항 적용
      groupRef.current.getLayer()?.batchDraw();
    }
  }, [layer.layer_content?.transform]);

  // YJS awareness 설정
  useEffect(() => {
    if (status !== "authenticated") return;

    // 해당 레이어의 브러쉬 인식 초기화
    const { getOtherUsersDrawingLines, cleanup } = initBrushAwareness(layer.id);

    let animationFrameId: number;
    const updateFrame = () => {
      const drawingLines = getOtherUsersDrawingLines();
      if (
        JSON.stringify(drawingLines) !== JSON.stringify(otherUsersDrawingLines)
      ) {
        setOtherUsersDrawingLines(drawingLines);
      }
      animationFrameId = requestAnimationFrame(updateFrame);
    };
    // 정리 함수
    animationFrameId = requestAnimationFrame(updateFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      cleanup!();
    };
  }, [layer.id, status]);

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

  // 그룹의 변환을 라인 포인트에 적용하는 함수
  const applyGroupTransformToPoint = (x: number, y: number) => {
    // 그룹 변환 역행렬을 계산하여 포인트를 그룹 로컬 좌표계로 변환
    const rad = (groupTransform.rotation * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);

    // 그룹 위치로 이동
    let nx = x - groupTransform.x;
    let ny = y - groupTransform.y;

    // 회전 적용
    const rx = nx * cos - ny * sin;
    const ry = nx * sin + ny * cos;

    // 스케일 적용
    return {
      x: rx / groupTransform.scaleX,
      y: ry / groupTransform.scaleY,
    };
  };

  // smoothing 값에 따른 그림자 효과 계산 함수
  const getShadowBlur = (smoothing: number) => {
    // smoothing이 0.3 미만이면 그림자 없음
    if (smoothing < 0.3) return 0;

    // smoothing 값에 따라 그림자 강도 조절 (0.3~1.0 => 0~10)
    return Math.floor(((smoothing - 0.3) / 0.7) * 10);
  };

  // 이벤트 핸들러 설정
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    // 마우스 다운 핸들러
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

      // 그룹 변환 적용
      const transformedPoint = applyGroupTransformToPoint(point.x, point.y);

      // 지우개 모드인지 확인
      const isEraser = currentToolbarItem === ToolbarItemIDs.ERASER;

      // 새 라인 생성
      const newLine: LineData = {
        points: [transformedPoint.x, transformedPoint.y],
        stroke: isEraser ? "#000000" : brushProps.color,
        strokeWidth: brushProps.size,
        tension: brushProps.smoothing * 0.5,
        smoothing: brushProps.smoothing,
        lineCap: brushProps.type === "square" ? "square" : "round",
        lineJoin: brushProps.type === "square" ? "miter" : "round",
        opacity: isEraser ? 1 : brushProps.opacity * (layer.opacity || 1),
        bezier: brushProps.smoothing > 0.3,
        globalCompositeOperation: isEraser ? "destination-out" : "source-over",
        // 그림자 효과 속성은 제거
        // renderLine 함수에서 통일성 있게 계산하도록 함
      };

      setCurrentLine(newLine);

      // YJS awareness로 현재 그리기 상태 공유
      if (user) {
        updateDrawingAwareness(layer.id, newLine, user.user.id);
      }
    };

    // 마우스 이동 핸들러
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

      // 그룹 변환 적용
      const transformedPoint = applyGroupTransformToPoint(point.x, point.y);

      // 같은 위치에 점을 계속 추가하는 것을 방지 (성능 개선)
      const lastX = currentLine.points[currentLine.points.length - 2];
      const lastY = currentLine.points[currentLine.points.length - 1];

      // 마지막 점과 현재 점 사이의 거리가 너무 작으면 점 추가하지 않음
      const minDistance = 1; // 최소 거리 설정 (픽셀 단위)
      const dx = transformedPoint.x - lastX!;
      const dy = transformedPoint.y - lastY!;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        return;
      }

      // 현재 라인에 포인트 추가
      const newPoints = [
        ...currentLine.points,
        transformedPoint.x,
        transformedPoint.y,
      ];

      const updatedLine = {
        ...currentLine,
        points: newPoints,
      };

      setCurrentLine(updatedLine);

      // YJS awareness로 현재 그리기 상태 공유
      if (user) {
        updateDrawingAwareness(layer.id, updatedLine, user.user.id);
      }
    };

    // 마우스 업 핸들러
    const handleMouseUp = () => {
      if (!isDrawingRef.current) return;
      completeDrawing();
    };

    // 그리기 완료 처리
    const completeDrawing = () => {
      isDrawingRef.current = false;

      if (currentLine) {
        // 점이 너무 적으면 드로잉 무시 (클릭만 했을 때)
        if (currentLine.points.length <= 2) {
          setCurrentLine(null);

          // 그리기 인식 상태 초기화
          if (user) {
            updateDrawingAwareness(layer.id, null, user.user.id);
          }
          return;
        }

        // 현재 라인을 lines 배열에 추가
        const updatedLines = [...lines, currentLine];
        setLines(updatedLines);
        setCurrentLine(null);

        // 그리기 인식 상태 초기화
        if (user) {
          updateDrawingAwareness(layer.id, null, user.user.id);
        }

        if (!layer.layer_content) {
          return;
        }

        if (onUpdate) {
          const updatedLayerContent = {
            id: layer.layer_content.id,
            layer_id: layer.layer_content.layer_id,
            transform: groupTransform,
            position_x: layer.layer_content.position_x,
            position_y: layer.layer_content.position_y,
            rotation: layer.layer_content.rotation,
            normal_data: {
              lines: updatedLines,
            } as Record<string, any>,
            shape_data: layer.layer_content.shape_data,
            text_data: layer.layer_content.text_data,
            image_data: layer.layer_content.image_data,
          };

          onUpdate(layer.id, updatedLayerContent);
        }
      }
    };

    // 이벤트 리스너 등록
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

      // 인식 상태 정리
      cleanupDrawingAwareness();

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
    user,
    groupTransform,
  ]);

  // visible이 false인 경우 렌더링하지 않음
  if (!layer.visible) return null;

  // 선 렌더링 함수
  const renderLine = (line: LineData, key: string) => {
    // 지우개인지 확인
    const isEraser = line.globalCompositeOperation === "destination-out";

    // 저장된 브러시 속성에서 smoothing 값 가져오기
    const smoothingValue = line.smoothing || brushProps.smoothing;

    // 그림자 블러 계산 (저장 시와 그리는 중에 일관되게 적용)
    const shadowBlur = isEraser ? 0 : getShadowBlur(smoothingValue);

    return (
      <Line
        key={key}
        points={line.points}
        stroke={line.stroke}
        strokeWidth={line.strokeWidth}
        tension={line.tension}
        lineCap={line.lineCap || "round"}
        lineJoin={line.lineJoin || "round"}
        opacity={line.opacity}
        strokeScaleEnabled={true}
        bezier={line.bezier}
        perfectDrawEnabled={false}
        globalCompositeOperation={
          line.globalCompositeOperation || "source-over"
        }
        shadowColor={isEraser ? line.stroke : line.shadowColor || line.stroke}
        shadowBlur={shadowBlur}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={isEraser ? 0 : line.opacity * 0.5}
        listening={false}
      />
    );
  };

  return (
    <Group ref={groupRef} id={layer.id}>
      {/* 저장된 모든 라인 렌더링 */}
      {lines.map((line, i) => renderLine(line, `line-${i}`))}

      {/* 현재 그리는 중인 라인 */}
      {currentLine && renderLine(currentLine, "current-line")}

      {/* 다른 사용자들이 그리는 중인 라인 (실시간) */}
      {Object.values(otherUsersDrawingLines).map((line, i) =>
        renderLine(line, `temp-line-${i}`),
      )}
    </Group>
  );
};

export default Brush;
