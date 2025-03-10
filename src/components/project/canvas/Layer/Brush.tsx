import { useRef, useEffect, useState } from "react";
import { Path, Group } from "react-konva";
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
import { getStroke } from "perfect-freehand";

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

/**
 * perfect-freehand에서 생성된 포인트 배열을 SVG 경로 문자열로 변환하는 함수
 */
const getSvgPathFromStroke = (stroke: number[][]): string => {
  if (!stroke.length) return "";

  // 배열이 비어있지 않은지 확인
  if (stroke.length === 1) {
    // 하나의 점만 있으면 작은 원을 그립니다
    const point = stroke[0];
    if (!point || point.length < 2) return "";

    const [x, y] = point;
    return `M ${x},${y} a 1,1 0 1,0 1,0 a 1,1 0 1,0 -1,0`;
  }

  // 안전하게 첫 번째 점 확인
  const firstPoint = stroke[0];
  if (!firstPoint || firstPoint.length < 2) return "";

  const d: (string | number)[] = ["M", firstPoint[0]!, firstPoint[1]!, "Q"];

  for (let i = 0; i < stroke.length - 1; i++) {
    const current = stroke[i];
    const next = stroke[i + 1];

    if (!current || !next || current.length < 2 || next.length < 2) continue;

    const [x0, y0] = current;
    const [x1, y1] = next;

    d.push(x0!, y0!, (x0! + x1!) / 2, (y0! + y1!) / 2);
  }

  // 마지막 점 처리 (닫힌 경로를 위해)
  if (stroke.length > 2) {
    const lastPoint = stroke[stroke.length - 1];
    const firstPoint = stroke[0];
    if (
      lastPoint &&
      firstPoint &&
      lastPoint.length >= 2 &&
      firstPoint.length >= 2
    ) {
      const [x0, y0] = lastPoint;
      const [x1, y1] = firstPoint;

      d.push(x0!, y0!, (x0! + x1!) / 2, (y0! + y1!) / 2, "Z");
    }
  }

  return d.join(" ");
};

/**
 * 필압을 계산하는 유틸리티 함수
 */
const calculatePressure = (velocity: number): number => {
  // 속도를 필압으로 변환 (빠를수록 필압이 낮아짐)
  // 속도 범위: 0.1~10 픽셀/ms를 필압 범위: 1.2~0.3으로 매핑
  return Math.max(0.3, Math.min(1.2, 1.2 - velocity * 0.09));
};

/**
 * perfect-freehand 옵션을 생성하는 함수
 */
const getPerfectFreehandOptions = (
  strokeWidth: number,
  smoothing: number,
  simulatePressure: boolean = false,
) => {
  return {
    size: strokeWidth,
    thinning: 0.6,
    smoothing: smoothing,
    streamline: 0.5,
    simulatePressure: simulatePressure,
    easing: (t: number) => Math.sin(t * Math.PI * 0.5), // 압력에 따른 사이즈 변화 정도
  };
};

/**
 * 점 배열을 perfect-freehand를 통해 처리하고 SVG 경로로 변환하는 함수
 */
const getPathDataFromPoints = (
  points: number[],
  options: {
    size: number;
    thinning: number;
    smoothing: number;
    streamline: number;
    easing?: (t: number) => number;
    start?: { taper: number; easing?: (t: number) => number; cap?: boolean };
    end?: { taper: number; easing?: (t: number) => number; cap?: boolean };
    simulatePressure?: boolean;
  },
  pressures: number[], // 필압 정보 인자 추가
): string => {
  if (points.length < 4) return "";

  // 포인트와 필압 정보 매핑
  const inputPoints: Array<{ x: number; y: number; pressure?: number }> = [];

  for (let i = 0; i < points.length; i += 2) {
    const pressureIndex = Math.floor(i / 2);
    const pressure =
      pressures && pressureIndex < pressures.length
        ? pressures[pressureIndex]
        : 1;

    if (i + 1 < points.length) {
      inputPoints.push({
        x: points[i]!,
        y: points[i + 1]!,
        pressure: options.simulatePressure ? undefined : pressure,
      });
    }
  }

  // inputPoints가 비어있으면 빈 문자열 반환
  if (inputPoints.length === 0) return "";

  // perfect-freehand로 스트로크 생성
  const stroke = getStroke(inputPoints, options);

  // SVG 경로 데이터 반환
  return getSvgPathFromStroke(stroke);
};

/**
 * 그림자 효과 계산 함수
 */
const getShadowBlur = (smoothing: number): number => {
  // smoothing이 0.3 미만이면 그림자 없음
  if (smoothing < 0.3) return 0;

  // smoothing 값에 따라 그림자 강도 조절 (0.3~1.0 => 0~10)
  return Math.floor(((smoothing - 0.3) / 0.7) * 10);
};

const Brush: React.FC<BrushComponentProps> = ({
  layer,
  isSelected,
  scale,
  stageRef,
  onUpdate,
  isSpacePressed = false,
}) => {
  const { data: user, status } = useSession();
  // 그려진 패스들을 저장할 상태
  const [paths, setPaths] = useState<LineData[]>([]);
  // 현재 그리는 중인 패스
  const [currentPath, setCurrentPath] = useState<LineData | null>(null);
  // 현재 경로를 위한 임시 포인트 배열 (경로 데이터 생성에 사용)
  const pointsRef = useRef<number[]>([]);
  // 필압 정보를 위한 pressures 배열
  const pressuresRef = useRef<number[]>([]);
  // 마지막 포인트 위치와 타임스탬프 (속도 계산용)
  const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  // 다른 사용자들이 그리는 중인 패스들
  const [otherUsersDrawingPaths, setOtherUsersDrawingPaths] = useState<{
    [userId: string]: LineData;
  }>({});

  // 그리기 모드 상태
  const isDrawingRef = useRef(false);
  const currentLayer = useAtomValue(currentLayerAtom);

  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const brushProps = useAtomValue(brushPropertiesAtom);

  const groupRef = useRef<Konva.Group>(null);

  const prevDrawingLinesRef = useRef<Record<string, LineData | undefined>>({});

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

  useEffect(() => {
    if (status !== "authenticated") return;

    // 해당 레이어의 브러쉬 인식 초기화
    const { getOtherUsersDrawingLines, cleanup } = initBrushAwareness(layer.id);

    let animationFrameId: number;
    const updateFrame = () => {
      // 반환값은 빈 객체({})일 수 있음
      const drawingLines = getOtherUsersDrawingLines();

      if (
        JSON.stringify(drawingLines) !== JSON.stringify(otherUsersDrawingPaths)
      ) {
        // 기존 코드...
      }
      animationFrameId = requestAnimationFrame(updateFrame);
    };

    // 애니메이션 프레임 시작
    animationFrameId = requestAnimationFrame(updateFrame);

    // 정리 함수
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (cleanup) cleanup();
    };
  }, [layer.id, status, otherUsersDrawingPaths]);

  // 위 코드를 아래 코드로 대체하세요:

  // YJS awareness 설정
  useEffect(() => {
    if (status !== "authenticated") return;

    // 해당 레이어의 브러쉬 인식 초기화
    const { getOtherUsersDrawingLines, cleanup } = initBrushAwareness(layer.id);

    let animationFrameId: number;
    const updateFrame = () => {
      // 반환값의 타입을 명시적으로 지정
      const drawingLines: Record<string, LineData | undefined> =
        getOtherUsersDrawingLines();

      // 깊은 비교 대신 간단한 체크로 변경하여 성능 개선
      let hasChanges = false;

      // Object.keys 대신 타입 안전한 방식으로 순회
      for (const userId in drawingLines) {
        if (Object.prototype.hasOwnProperty.call(drawingLines, userId)) {
          const currentLine = drawingLines[userId];
          const prevLine = prevDrawingLinesRef.current[userId];

          if (
            !prevLine ||
            (currentLine &&
              prevLine &&
              currentLine.points?.length !== prevLine.points?.length)
          ) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        // 다른 사용자 라인 데이터 -> 패스 데이터로 변환
        const drawingPaths: Record<string, LineData> = {};

        // 객체의 각 항목에 대해 안전하게 접근 (for...in 루프 사용)
        for (const userId in drawingLines) {
          if (Object.prototype.hasOwnProperty.call(drawingLines, userId)) {
            const lineData = drawingLines[userId];

            // lineData가 유효하고 points 속성이 있는지 확인
            if (
              lineData &&
              typeof lineData === "object" &&
              "points" in lineData &&
              Array.isArray(lineData.points) &&
              lineData.points.length >= 4
            ) {
              // 타입을 LineData로 단언하여 사용
              const typedLineData = lineData as LineData;

              // pressures 정보 가져오기
              const pressures =
                typedLineData.pressures ||
                Array(typedLineData.points.length / 2).fill(1);

              // perfect-freehand 옵션 설정
              const options = getPerfectFreehandOptions(
                typedLineData.strokeWidth,
                typedLineData.smoothing || 0.5,
                !typedLineData.pressures, // pressures가 없으면 simulatePressure=true
              );

              const pathData = getPathDataFromPoints(
                typedLineData.points,
                options,
                pressures,
              );

              drawingPaths[userId] = {
                ...typedLineData,
                data: pathData,
              };
            }
          }
        }

        // 업데이트된 드로잉 라인 저장
        prevDrawingLinesRef.current = { ...drawingLines };

        // 상태 업데이트
        setOtherUsersDrawingPaths(drawingPaths);
      }

      // 다음 프레임 요청 (항상 반복)
      animationFrameId = requestAnimationFrame(updateFrame);
    };

    // 애니메이션 프레임 시작
    animationFrameId = requestAnimationFrame(updateFrame);

    // 정리 함수
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (cleanup) cleanup();
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
        // 모든 라인에 대해 그림자 효과 재계산 및 패스 데이터 변환
        const processedPaths = (normalData.lines as LineData[]).map((line) => {
          // 지우개인지 확인
          const isEraser = line.globalCompositeOperation === "destination-out";

          // 원본 smoothing 값 사용
          const smoothingValue = line.smoothing || 0.5;
          // 그림자 효과 재계산
          const shadowBlur = isEraser ? 0 : getShadowBlur(smoothingValue);
          const shadowOpacity = isEraser ? 0 : smoothingValue * 0.5;

          // 이미 data 속성이 있으면 그것을 사용, 없으면 points 배열로 새로 생성
          let pathData = line.data || "";
          if (
            !pathData &&
            Array.isArray(line.points) &&
            line.points.length >= 4
          ) {
            // 필압 정보 가져오기 (없으면 기본값으로 설정)
            const pressures =
              line.pressures || Array(line.points.length / 2).fill(1);

            // perfect-freehand 옵션 설정
            const options = getPerfectFreehandOptions(
              line.strokeWidth,
              smoothingValue,
              !line.pressures, // pressures가 없으면 simulatePressure=true
            );

            pathData = getPathDataFromPoints(line.points, options, pressures);
          }

          // 새 패스 객체 생성 (모든 속성 복사 + 그림자 효과 재계산 + 패스 데이터)
          return {
            ...line,
            data: pathData,
            shadowBlur: shadowBlur,
            shadowColor: isEraser ? "#000000" : line.stroke,
            shadowOpacity: shadowOpacity,
          };
        });

        setPaths(processedPaths);
      }
    }
  }, [layer.id, layer.layer_content, status]);

  // 그룹의 변환을 라인 포인트에 적용하는 함수 (안전하게 개선)
  const applyGroupTransformToPoint = (x: number, y: number) => {
    if (!groupRef.current) return { x, y };

    try {
      // Konva의 변환 매트릭스 활용
      const transform = groupRef.current.getTransform().copy().invert();
      const transformedPoint = transform.point({ x, y });

      return transformedPoint;
    } catch (e) {
      // 변환 매트릭스에 문제가 있는 경우 원본 좌표 반환
      console.error("변환 적용 중 오류:", e);

      // 수동으로 변환 적용
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
    }
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

      // 현재 smoothing 값 가져오기
      const smoothingValue = brushProps.smoothing || 0.5;

      // 그림자 효과 계산
      const shadowBlur = isEraser ? 0 : getShadowBlur(smoothingValue);
      const shadowOpacity = isEraser ? 0 : smoothingValue * 0.5;

      // 포인트 배열 및 압력 배열 초기화
      pointsRef.current = [transformedPoint.x, transformedPoint.y];
      pressuresRef.current = [1]; // 초기 필압 값

      // 마지막 포인트 정보 저장 (속도 계산용)
      lastPointRef.current = {
        x: transformedPoint.x,
        y: transformedPoint.y,
        time: Date.now(),
      };

      // perfect-freehand 옵션 설정
      const freehandOptions = getPerfectFreehandOptions(
        brushProps.size,
        smoothingValue,
        !brushProps.pressure,
      );

      // 초기 패스 데이터 생성 (최소 2개 점 필요)
      // 초기에는 같은 점을 두 번 사용하여 시작점 생성
      const initialPoints = [...pointsRef.current, ...pointsRef.current];
      const initialPathData = getPathDataFromPoints(
        initialPoints,
        freehandOptions,
        [1, 1], // 초기 필압 값
      );

      // 새 패스 생성
      const newPath: LineData = {
        points: [...pointsRef.current], // 포인트 배열 복사본 저장
        pressures: [...pressuresRef.current], // 필압 배열 저장
        data: initialPathData, // SVG 경로 문자열
        stroke: isEraser ? "#000000" : brushProps.color,
        strokeWidth: brushProps.size,
        tension: brushProps.smoothing * 0.5,
        smoothing: brushProps.smoothing,
        lineCap: brushProps.type === "square" ? "square" : "round",
        lineJoin: brushProps.type === "square" ? "miter" : "round",
        opacity: isEraser ? 1 : brushProps.opacity * (layer.opacity || 1),
        bezier: brushProps.smoothing > 0.3,
        globalCompositeOperation: isEraser ? "destination-out" : "source-over",
        shadowBlur: shadowBlur,
        shadowColor: isEraser ? "#000000" : brushProps.color,
        shadowOpacity: shadowOpacity,
        fill: isEraser ? "transparent" : brushProps.color, // perfect-freehand에서 필요
      };

      setCurrentPath(newPath);

      // YJS awareness로 현재 그리기 상태 공유
      if (user) {
        updateDrawingAwareness(layer.id, newPath, user.user.id);
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

      if (!isDrawingRef.current || !currentPath) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // 스테이지의 변환 매트릭스를 사용한 정확한 위치 계산
      const transform = stage.getAbsoluteTransform().copy().invert();
      const point = transform.point(pos);

      // 그룹 변환 적용
      const transformedPoint = applyGroupTransformToPoint(point.x, point.y);

      // 포인트 배열에 최소 2개의 점이 있는지 확인
      if (pointsRef.current.length < 2) {
        // 첫 번째 포인트만 있는 경우, 두 번째 포인트 추가
        pointsRef.current.push(transformedPoint.x, transformedPoint.y);
        pressuresRef.current.push(1); // 기본 필압
      } else {
        // 마지막 점과 현재 점 사이의 거리 계산
        const lastX = pointsRef.current[pointsRef.current.length - 2];
        const lastY = pointsRef.current[pointsRef.current.length - 1];

        if (lastX !== undefined && lastY !== undefined) {
          const dx = transformedPoint.x - lastX;
          const dy = transformedPoint.y - lastY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 최소 거리 체크
          const minDistance = 0.5; // 최소 거리 설정 (픽셀 단위)
          if (distance < minDistance) {
            return;
          }

          // 시간 계산을 통한 속도 기반 필압 계산
          let pressure = 1;
          if (lastPointRef.current && brushProps.pressure) {
            const now = Date.now();
            const timeDelta = now - lastPointRef.current.time;
            if (timeDelta > 0) {
              // 속도 계산 (픽셀/밀리초)
              const velocity = distance / timeDelta;
              // 속도를 필압으로 변환
              pressure = calculatePressure(velocity);
            }

            // 마지막 포인트 업데이트
            lastPointRef.current = {
              x: transformedPoint.x,
              y: transformedPoint.y,
              time: now,
            };
          }

          // 포인트 배열에 새 포인트 추가
          pointsRef.current.push(transformedPoint.x, transformedPoint.y);
          pressuresRef.current.push(pressure);
        }
      }

      // perfect-freehand 옵션 설정
      const freehandOptions = getPerfectFreehandOptions(
        brushProps.size,
        brushProps.smoothing,
        !brushProps.pressure,
      );

      // 업데이트된 패스 데이터 생성
      const updatedPathData = getPathDataFromPoints(
        pointsRef.current,
        freehandOptions,
        pressuresRef.current,
      );

      // 현재 패스 업데이트
      const updatedPath = {
        ...currentPath,
        points: [...pointsRef.current], // 최신 포인트 배열 복사본
        pressures: [...pressuresRef.current], // 최신 필압 배열 복사본
        data: updatedPathData, // 업데이트된 SVG 경로 문자열
      };

      setCurrentPath(updatedPath);

      // YJS awareness로 현재 그리기 상태 공유
      if (user) {
        updateDrawingAwareness(layer.id, updatedPath, user.user.id);
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

      if (currentPath) {
        // 점이 너무 적으면 드로잉 무시 (클릭만 했을 때)
        if (pointsRef.current.length <= 4) {
          setCurrentPath(null);
          pointsRef.current = [];
          pressuresRef.current = [];
          lastPointRef.current = null;

          // 그리기 인식 상태 초기화
          if (user) {
            updateDrawingAwareness(layer.id, null, user.user.id);
          }
          return;
        }

        // 완료된 패스
        const completePath = { ...currentPath };

        // 현재 패스를 paths 배열에 추가
        const updatedPaths = [...paths, completePath];
        setPaths(updatedPaths);
        setCurrentPath(null);
        pointsRef.current = [];
        pressuresRef.current = [];
        lastPointRef.current = null;

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
              lines: updatedPaths,
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
    paths,
    currentPath,
    onUpdate,
    user,
    groupTransform,
  ]);

  // visible이 false인 경우 렌더링하지 않음
  if (!layer.visible) return null;

  // 패스 렌더링 함수
  const renderPath = (pathData: LineData, key: string) => {
    return (
      <Path
        key={key}
        data={pathData.data}
        fill={
          pathData.globalCompositeOperation === "destination-out"
            ? undefined
            : pathData.fill || pathData.stroke
        }
        stroke={
          pathData.globalCompositeOperation === "destination-out"
            ? "#000000"
            : undefined
        }
        strokeWidth={
          pathData.globalCompositeOperation === "destination-out" ? 1 : 0
        }
        opacity={pathData.opacity}
        perfectDrawEnabled={false}
        globalCompositeOperation={
          pathData.globalCompositeOperation || "source-over"
        }
        // 그림자 속성을 그대로 사용
        shadowColor={pathData.shadowColor}
        shadowBlur={pathData.shadowBlur}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={pathData.shadowOpacity}
        listening={false}
      />
    );
  };

  return (
    <Group ref={groupRef} id={layer.id}>
      {/* 저장된 모든 패스 렌더링 */}
      {paths.map((path, i) => renderPath(path, `path-${i}`))}

      {/* 현재 그리는 중인 패스 */}
      {currentPath && renderPath(currentPath, "current-path")}

      {/* 다른 사용자들이 그리는 중인 패스 (실시간) */}
      {Object.values(otherUsersDrawingPaths).map((path, i) =>
        renderPath(path, `temp-path-${i}`),
      )}
    </Group>
  );
};

export default Brush;
