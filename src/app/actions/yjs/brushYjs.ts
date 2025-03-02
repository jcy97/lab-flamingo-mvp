import * as Y from "yjs";

import { LineData, RealtimeBrushState } from "~/types/types";
import { getDefaultStore } from "jotai";
import { projectSocketAtom } from "~/store/yjsAtoms";
import { LayerWithContents } from "~/store/atoms";

import { Prisma } from "@prisma/mongodb-client";
import { getCanvasYdoc } from "./canvasYjs";
import { getLayersMap } from "./layerYjs";

// MongoDB에 저장될 normal_data 구조
export interface NormalLayerData {
  lines?: Prisma.JsonValue;
  [key: string]: Prisma.JsonValue | undefined;
}

// Y.js 브러시 관련 객체들을 저장하는 인터페이스
export interface BrushYjsObjects {
  realtimeBrushMap: Y.Map<RealtimeBrushState> | null;
}

/**
 * LineData 배열을 Prisma.JsonValue로 변환 (MongoDB 저장용)
 * @param lines LineData 배열
 * @returns Prisma.JsonValue로 변환된 데이터
 */
export const linesToJsonValue = (lines: LineData[]): Prisma.JsonValue => {
  // LineData 객체들을 일반 객체로 변환
  return lines.map((line) => ({
    points: line.points,
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    tension: line.tension,
    lineCap: line.lineCap,
    lineJoin: line.lineJoin,
    opacity: line.opacity,
  })) as Prisma.JsonValue;
};

/**
 * Prisma.JsonValue를 LineData 배열로 변환 (MongoDB에서 로드 후)
 * @param jsonValue Prisma.JsonValue 형태의 라인 데이터
 * @returns LineData 배열
 */
export const jsonValueToLines = (
  jsonValue: Prisma.JsonValue | undefined,
): LineData[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) {
    return [];
  }

  return jsonValue.map((item) => {
    // 타입 가드: item이 객체인지 확인
    if (typeof item !== "object" || item === null) {
      // 기본 LineData 객체 반환
      return {
        points: [],
        stroke: "#000000",
        strokeWidth: 1,
        tension: 0.5,
        lineCap: "round",
        lineJoin: "round",
        opacity: 1,
      };
    }

    // item을 Record<string, any>로 타입 단언
    const lineItem = item as Record<string, any>;

    return {
      points: Array.isArray(lineItem.points) ? lineItem.points : [],
      stroke: typeof lineItem.stroke === "string" ? lineItem.stroke : "#000000",
      strokeWidth:
        typeof lineItem.strokeWidth === "number" ? lineItem.strokeWidth : 1,
      tension: typeof lineItem.tension === "number" ? lineItem.tension : 0.5,
      lineCap:
        typeof lineItem.lineCap === "string" ? lineItem.lineCap : "round",
      lineJoin:
        typeof lineItem.lineJoin === "string" ? lineItem.lineJoin : "round",
      opacity: typeof lineItem.opacity === "number" ? lineItem.opacity : 1,
    } as LineData;
  });
};
/**
 * 레이어에 대한 Y.js 브러시 맵을 초기화하고 반환
 * @param layerId 레이어 ID
 * @returns Y.js 맵 객체들을 포함한 객체, 또는 null (Y.js 문서가 없는 경우)
 */
export const initBrushYjsMaps = (layerId: string): BrushYjsObjects | null => {
  const ydoc = getCanvasYdoc();
  if (!ydoc) return null;

  // 실시간 브러시 상태를 위한 맵
  const realtimeBrushMap = ydoc.getMap<RealtimeBrushState>(
    `realtime-brush-${layerId}`,
  );

  return {
    realtimeBrushMap,
  };
};

/**
 * 다른 사용자들의 실시간 브러시 상태를 구독
 * @param realtimeBrushMap Y.js 실시간 브러시 맵
 * @param userId 현재 사용자 ID
 * @param callback 상태 변경 시 호출될 콜백 함수
 * @returns 구독 취소 함수
 */
export const subscribeToRealtimeBrushes = (
  realtimeBrushMap: Y.Map<RealtimeBrushState>,
  userId: string,
  callback: (otherUsersLines: Record<string, LineData>) => void,
): (() => void) => {
  const handleBrushStateChange = () => {
    const updatedOtherUsersLines: Record<string, LineData> = {};

    // 맵의 모든 키를 순회하며 다른 사용자들의 브러시 상태 수집
    realtimeBrushMap.forEach((brushState, key) => {
      // 자신의 브러시 상태는 제외
      if (key !== userId && brushState.currentLine) {
        updatedOtherUsersLines[key] = brushState.currentLine;
      }
    });

    callback(updatedOtherUsersLines);
  };

  // 초기 상태 설정
  handleBrushStateChange();

  // 변경 이벤트 구독
  realtimeBrushMap.observe(handleBrushStateChange);

  // 구독 취소 함수 반환
  return () => {
    realtimeBrushMap.unobserve(handleBrushStateChange);
  };
};

/**
 * 현재 그리는 중인 라인 업데이트
 * @param realtimeBrushMap Y.js 실시간 브러시 맵
 * @param userId 사용자 ID
 * @param currentLine 현재 라인 데이터
 */
export const updateCurrentLine = (
  realtimeBrushMap: Y.Map<RealtimeBrushState> | null,
  userId: string,
  currentLine: LineData | null,
): void => {
  if (!realtimeBrushMap) return;

  if (currentLine) {
    realtimeBrushMap.set(userId, {
      userId,
      currentLine,
    });
  } else {
    // currentLine이 null이면 사용자 상태 제거
    realtimeBrushMap.delete(userId);
  }
};

/**
 * 완성된 라인을 레이어 컨텐츠에 저장
 * @param canvasId 캔버스 ID
 * @param layerId 레이어 ID
 * @param lines 모든 라인 데이터 배열
 * @param userId 사용자 ID
 */
export const saveCompletedLine = (
  canvasId: string,
  layerId: string,
  lines: LineData[],
  userId: string,
): void => {
  const doc = getCanvasYdoc();
  if (!doc) return;

  const layersMap = getLayersMap(canvasId);
  if (!layersMap) return;

  // 현재 레이어 객체 가져오기
  const layer = layersMap.get(layerId) as LayerWithContents | undefined;
  if (!layer) return;

  // 트랜잭션으로 레이어 컨텐츠 업데이트
  doc.transact(() => {
    // 레이어 컨텐츠 초기화 (없는 경우)
    const layerContent = layer.layer_content || { normal_data: {} };

    // normal_data를 객체로 확인
    const normalData =
      typeof layerContent.normal_data === "object" && layerContent.normal_data
        ? (layerContent.normal_data as Record<string, Prisma.JsonValue>)
        : {};

    // 라인 데이터를 Prisma.JsonValue로 변환
    const jsonLines = linesToJsonValue(lines);

    // 업데이트된 레이어 객체 생성
    const updatedLayer = {
      ...layer,
      layer_content: {
        ...layerContent,
        normal_data: {
          ...normalData,
          lines: jsonLines,
        },
      },
      updated_user_id: userId,
      updated_at: new Date(),
    };

    // 레이어 맵에 업데이트된 레이어 저장
    layersMap.set(layerId, updatedLayer);
  });

  // 서버 동기화 (옵션)
  const store = getDefaultStore();
  const socket = store.get(projectSocketAtom);

  if (socket) {
    socket.emit("updateLayerContent", {
      canvasId,
      layerId,
      normalData: {
        lines: linesToJsonValue(lines),
      },
      updatedBy: userId,
    });
  }
};

/**
 * 초기 라인 데이터 로드
 * @param layer 레이어 객체
 * @returns 초기 라인 데이터 배열
 */
export const loadInitialLines = (layer: LayerWithContents): LineData[] => {
  if (
    layer.layer_content?.normal_data &&
    typeof layer.layer_content.normal_data === "object"
  ) {
    const normalData = layer.layer_content.normal_data as Record<
      string,
      Prisma.JsonValue
    >;
    if (normalData.lines) {
      // JSON 데이터를 LineData 배열로 변환
      return jsonValueToLines(normalData.lines);
    }
  }

  return []; // 데이터가 없으면 빈 배열 반환
};

/**
 * 사용자 브러시 세션 정리 (컴포넌트 언마운트 시 호출)
 * @param realtimeBrushMap Y.js 실시간 브러시 맵
 * @param userId 사용자 ID
 */
export const cleanupUserBrushSession = (
  realtimeBrushMap: Y.Map<RealtimeBrushState> | null,
  userId: string,
): void => {
  if (realtimeBrushMap && realtimeBrushMap.has(userId)) {
    realtimeBrushMap.delete(userId);
  }
};
