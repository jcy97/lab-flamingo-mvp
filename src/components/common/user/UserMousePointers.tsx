"use client";
import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  initMousePointerAwareness,
  updateMousePointerAwareness,
  MousePointerPosition,
} from "~/app/actions/yjs/userYjs";
import Konva from "konva";

// 애니메이션 부드러움을 위한 상수 정의
const MAX_DISTANCE_THRESHOLD = 15; // 급격한 변화 감지 임계값
const INTERPOLATION_FACTOR = 0.5; // 50% 보간

// 화면 좌표가 추가된 확장 포인터 인터페이스
interface ExtendedPointer extends MousePointerPosition {
  screenX: number;
  screenY: number;
}

interface UserMousePointersProps {
  stageRef: React.RefObject<Konva.Stage>;
  canvasId: string;
}

const UserMousePointers: React.FC<UserMousePointersProps> = ({
  stageRef,
  canvasId,
}) => {
  const { data: user } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);

  // 다른 사용자들의 마우스 포인터 상태 관리
  const [otherUsersPointers, setOtherUsersPointers] = useState<
    ExtendedPointer[]
  >([]);

  // 애니메이션 프레임 참조
  const animationFrameRef = useRef<number | null>(null);

  // 마지막 마우스 위치
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // 이전 포인터 상태 저장용 ref
  const prevPointersRef = useRef<{ [key: string]: MousePointerPosition }>({});

  // 브라우저 세션 ID
  const browserSessionIdRef = useRef<string>(
    Math.random().toString(36).substring(2, 15),
  );

  useEffect(() => {
    if (!user || !stageRef.current) return;

    // 해당 캔버스의 마우스 포인터 인식 초기화
    const { getOtherUsersPointers, cleanup } =
      initMousePointerAwareness(canvasId);

    // 마우스 이동 이벤트 핸들러
    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!stageRef.current) return;

      // 스테이지의 변환 매트릭스를 사용한 정확한 위치 계산
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();

      if (!pointerPos) return;

      // 스테이지의 변환을 역으로 적용하여 캔버스 좌표계로 변환
      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPoint = transform.point(pointerPos);

      // 성능 최적화: 좌표가 크게 변하지 않았으면 업데이트 건너뛰기
      if (lastMousePosRef.current) {
        const dx = Math.abs(lastMousePosRef.current.x - canvasPoint.x);
        const dy = Math.abs(lastMousePosRef.current.y - canvasPoint.y);
        if (dx < 1 && dy < 1) return; // 1픽셀 미만 변화는 무시
      }

      lastMousePosRef.current = { x: canvasPoint.x, y: canvasPoint.y };

      // 마우스 포인터 위치 업데이트 (캔버스 좌표계 기준)
      updateMousePointerAwareness(
        canvasId,
        { x: canvasPoint.x, y: canvasPoint.y },
        user.user.id,
        user.user.name || "익명",
      );
    };

    // 애니메이션 프레임을 사용하여 다른 사용자의 포인터 업데이트
    const updateFrame = () => {
      const newPointers = getOtherUsersPointers();

      // 타입 안전한 보간 로직 구현
      const interpolatedPointers: { [key: string]: MousePointerPosition } = {};

      Object.entries(newPointers).forEach(([key, value]) => {
        // value가 유효한 MousePointerPosition인지 확인 (타입 가드)
        if (
          !value ||
          typeof value !== "object" ||
          !("x" in value) ||
          !("y" in value)
        ) {
          return; // 유효하지 않은 데이터 건너뛰기
        }

        // 자신의 포인터가 아닌지 확인 (타입 안전하게)
        if (
          "browserSessionId" in value &&
          value.browserSessionId === browserSessionIdRef.current
        ) {
          return; // 자신의 포인터는 표시하지 않음
        }

        // 타입스크립트 컴파일러를 위한 타입 단언
        const pointer = value as MousePointerPosition;

        // 현재 포인터를 결과에 추가 (기본값)
        interpolatedPointers[key] = pointer;

        // 이전 포인터가 있는 경우 보간 처리
        const prevPointer = prevPointersRef.current[key];
        if (prevPointer) {
          const dx = pointer.x - prevPointer.x;
          const dy = pointer.y - prevPointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 급격한 변화 감지 시 부드럽게 보간
          if (distance > MAX_DISTANCE_THRESHOLD) {
            interpolatedPointers[key] = {
              ...pointer,
              x: prevPointer.x + dx * INTERPOLATION_FACTOR,
              y: prevPointer.y + dy * INTERPOLATION_FACTOR,
            };
          }
        }
      });

      // 현재 상태를 이전 상태로 저장
      prevPointersRef.current = { ...interpolatedPointers };

      // 캔버스 좌표에서 스크린 좌표로 변환
      if (stageRef.current) {
        const stage = stageRef.current;
        const extendedPointers: ExtendedPointer[] = [];

        Object.entries(interpolatedPointers).forEach(([key, pointer]) => {
          // 캔버스 좌표를 스크린 좌표로 변환 (스테이지 변환 적용)
          const transform = stage.getAbsoluteTransform();
          const screenPoint = transform.point({ x: pointer.x, y: pointer.y });

          // 확장된 포인터 객체 생성
          extendedPointers.push({
            ...pointer,
            screenX: screenPoint.x,
            screenY: screenPoint.y,
          });
        });

        // 포인터 상태 업데이트
        setOtherUsersPointers(extendedPointers);
      }

      // 다음 프레임 예약
      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    // 이벤트 리스너 등록 - Konva 스테이지에 직접 등록
    if (stageRef.current) {
      stageRef.current.on("mousemove", handleMouseMove);
    }

    // 애니메이션 프레임 시작
    animationFrameRef.current = requestAnimationFrame(updateFrame);

    // 캔버스를 떠날 때 정리
    const handleBeforeUnload = () => {
      updateMousePointerAwareness(
        canvasId,
        null,
        user.user.id,
        user.user.name || "익명",
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 정리 함수
    return () => {
      if (stageRef.current) {
        stageRef.current.off("mousemove", handleMouseMove);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      window.removeEventListener("beforeunload", handleBeforeUnload);

      // 캔버스를 떠날 때 마우스 포인터 상태 초기화
      updateMousePointerAwareness(
        canvasId,
        null,
        user.user.id,
        user.user.name || "익명",
      );
      cleanup?.();
    };
  }, [user, canvasId, stageRef]);

  // HTML/SVG로 포인터 렌더링
  return (
    <div
      ref={containerRef}
      className="pointer-container"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {otherUsersPointers.map((pointer) => (
        <div
          key={`pointer-${pointer.userId}-${pointer.clientId}`}
          style={{
            position: "absolute",
            left: pointer.screenX,
            top: pointer.screenY,
            zIndex: 9999,
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            willChange: "transform, left, top",
          }}
        >
          {/* 사용자 마우스 포인터 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.5 3L19 13H11L9 21L5.5 3Z"
              fill={pointer.color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>

          {/* 사용자 닉네임 */}
          <div
            style={{
              position: "absolute",
              left: "15px",
              top: "15px",
              background: pointer.color,
              color: "#ffffff",
              fontSize: "12px",
              padding: "2px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            }}
          >
            {`${pointer.nickname}${pointer.clientId !== undefined ? " #" + (pointer.clientId % 1000) : ""}`}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserMousePointers;
