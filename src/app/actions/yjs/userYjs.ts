import { getDefaultStore } from "jotai";
import { yjsProviderAtom } from "~/store/yjsAtoms";
import { getCanvasYdoc } from "./canvasYjs";
import { getColorForUser } from "~/utils/color";

// 더 안정적인 고유 식별자 생성
const browserSessionId = Math.random().toString(36).substring(2, 15);

// 마우스 포인터 위치 정보 인터페이스
export interface MousePointerPosition {
  x: number;
  y: number;
  userId: string;
  clientId: number;
  browserSessionId: string; // 브라우저 세션마다 고유한 ID 추가
  nickname: string;
  color: string;
}

// 캔버스별 다른 사용자들의 마우스 포인터 위치 추적
const otherUsersPointerMap = new Map<
  string,
  { [key: string]: MousePointerPosition }
>();

const store = getDefaultStore();

/**
 * 특정 캔버스에 대한 마우스 포인터 인식 기능 초기화
 * @param canvasId 추적할 캔버스 ID
 * @returns 현재 캔버스의 마우스 포인터 위치를 가져오는 함수
 */
export const initMousePointerAwareness = (canvasId: string) => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return { getOtherUsersPointers: () => ({}) };

  const ydoc = getCanvasYdoc();
  if (!ydoc) return { getOtherUsersPointers: () => ({}) };

  const awareness = yjsProvider.awareness;

  // 아직 존재하지 않는 경우 이 캔버스에 대한 빈 포인터 맵 초기화
  if (!otherUsersPointerMap.has(canvasId)) {
    otherUsersPointerMap.set(canvasId, {});
  }

  // 이 캔버스에 대한 인식 변경 핸들러 설정
  const awarenessChangeHandler = () => {
    const pointerUsers: { [key: string]: MousePointerPosition } = {};

    awareness.getStates().forEach((state, clientId) => {
      // 마우스 포인터 데이터가 있고 현재 캔버스에 해당하는지 확인
      if (state.mousePointer && state.mousePointer.canvasId === canvasId) {
        // 브라우저 세션 ID로 필터링 - 자신의 포인터는 제외
        if (state.mousePointer.browserSessionId !== browserSessionId) {
          // 고유 식별자로 복합 키 생성 (userId + clientId)
          const uniqueKey = `${state.mousePointer.userId}-${clientId}`;

          pointerUsers[uniqueKey] = {
            ...state.mousePointer,
            clientId,
          };
        }
      }
    });

    // 이 캔버스에 대한 마우스 포인터 맵 업데이트
    otherUsersPointerMap.set(canvasId, pointerUsers);
  };

  // 인식 변경 구독
  awareness.on("change", awarenessChangeHandler);

  // 초기 상태 처리
  awarenessChangeHandler();

  // 현재 캔버스의 마우스 포인터 위치를 가져오는 함수 반환
  return {
    getOtherUsersPointers: () => otherUsersPointerMap.get(canvasId) || {},
    cleanup: () => {
      awareness.off("change", awarenessChangeHandler);
      otherUsersPointerMap.delete(canvasId);
    },
  };
};

/**
 * 현재 사용자의 마우스 포인터 위치를 인식 객체에 업데이트
 * @param canvasId 현재 캔버스 ID
 * @param position 현재 마우스 포인터 위치
 * @param userId 현재 사용자 ID
 * @param nickname 현재 사용자 닉네임
 * @param color 사용자 색상 (없으면 닉네임 기반으로 생성)
 */
export const updateMousePointerAwareness = (
  canvasId: string,
  position: { x: number; y: number } | null,
  userId: string,
  nickname: string,
  color?: string,
) => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return;

  const awareness = yjsProvider.awareness;
  const ydoc = getCanvasYdoc();
  if (!ydoc) return;

  if (position) {
    // 색상 생성 또는 사용
    const pointerColor = color || getColorForUser(nickname);

    // 브라우저 세션 ID 추가 - 같은 사용자지만 다른 브라우저 창을 구분하기 위함
    awareness.setLocalStateField("mousePointer", {
      userId,
      nickname,
      canvasId,
      x: position.x,
      y: position.y,
      color: pointerColor,
      clientId: ydoc.clientID,
      browserSessionId, // 현재 브라우저 세션의 고유 ID
    });
  } else {
    // 상태 초기화
    awareness.setLocalStateField("mousePointer", null);
  }
};

/**
 * 컴포넌트 언마운트 시 마우스 포인터 인식 정리
 */
export const cleanupMousePointerAwareness = () => {
  const yjsProvider = store.get(yjsProviderAtom);
  if (!yjsProvider) return;

  const awareness = yjsProvider.awareness;
  awareness.setLocalStateField("mousePointer", null);
};
