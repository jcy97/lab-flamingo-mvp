import { getCanvasYdoc } from "./canvasYjs";
import { getDefaultStore } from "jotai";
import { yjsProviderAtom } from "~/store/yjsAtoms";
import { LineData } from "~/types/types";

const store = getDefaultStore();

// 레이어별로 다른 사용자들의 그리기 라인 추적
const otherUsersDrawingLinesMap = new Map<
  string,
  { [userId: string]: LineData }
>();

/**
 * 특정 레이어에 대한 브러쉬 인식 기능 초기화
 * @param layerId 추적할 레이어 ID
 * @returns 현재 레이어의 그리기 라인을 가져오는 함수
 */
export const initBrushAwareness = (layerId: string) => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return { getOtherUsersDrawingLines: () => ({}) };

  const ydoc = getCanvasYdoc();
  if (!ydoc) return { getOtherUsersDrawingLines: () => ({}) };

  const awareness = yjsProvider.awareness;

  // 아직 존재하지 않는 경우 이 레이어에 대한 빈 그리기 라인 초기화
  if (!otherUsersDrawingLinesMap.has(layerId)) {
    otherUsersDrawingLinesMap.set(layerId, {});
  }

  // 이 레이어에 대한 인식 변경 핸들러 설정
  const awarenessChangeHandler = () => {
    const drawingUsers: { [userId: string]: LineData } = {};

    awareness.getStates().forEach((state, clientId) => {
      // 자신은 건너뛰기
      if (clientId === ydoc.clientID) return;

      // 사용자가 이 레이어에 그리고 있는지 확인
      if (state.drawing && state.drawing.layerId === layerId) {
        drawingUsers[clientId] = state.drawing.line;
      }
    });

    // 이 레이어에 대한 그리기 라인 업데이트
    otherUsersDrawingLinesMap.set(layerId, drawingUsers);
  };

  // 인식 변경 구독
  awareness.on("change", awarenessChangeHandler);

  // 현재 레이어의 그리기 라인을 가져오는 함수 반환
  return {
    getOtherUsersDrawingLines: () =>
      otherUsersDrawingLinesMap.get(layerId) || {},
    cleanup: () => {
      awareness.off("change", awarenessChangeHandler);
      otherUsersDrawingLinesMap.delete(layerId);
    },
  };
};

/**
 * 현재 사용자의 그리기 라인을 인식 객체에 업데이트
 * @param layerId 그리는 중인 레이어
 * @param line 현재 그리는 중인 라인
 * @param userId 현재 사용자 ID
 */
export const updateDrawingAwareness = (
  layerId: string,
  line: LineData | null,
  userId: string,
) => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return;

  const awareness = yjsProvider.awareness;

  if (line) {
    // 현재 그리기 상태로 인식 객체 업데이트
    awareness.setLocalStateField("drawing", {
      userId,
      layerId,
      line,
    });
  } else {
    // 그리기 완료 시 상태 초기화
    awareness.setLocalStateField("drawing", null);
  }
};

/**
 * 컴포넌트 언마운트 시 그리기 인식 정리
 */
export const cleanupDrawingAwareness = () => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return;

  const awareness = yjsProvider.awareness;
  awareness.setLocalStateField("drawing", null);
};
