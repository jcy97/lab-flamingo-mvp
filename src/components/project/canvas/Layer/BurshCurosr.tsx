import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import {
  brushPropertiesAtom,
  currentToolbarItemAtom,
  scaleFactorAtom,
} from "~/store/atoms";
import { ToolbarItemIDs } from "~/constants/toolbarItems";

interface BrushCursorProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isSpacePressed: boolean;
}

const BrushCursor: React.FC<BrushCursorProps> = ({
  containerRef,
  isSpacePressed,
}) => {
  const [brushProperties, setBrushProperties] = useAtom(brushPropertiesAtom);
  const currentToolbarItem = useAtomValue(currentToolbarItemAtom);
  const scaleFactor = useAtomValue(scaleFactorAtom);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // 스케일 팩터에 맞춰 커서 사이즈 계산
  const cursorSize = brushProperties.size * scaleFactor;

  // 브러시 커서 노출 여부 결정
  const isBrushMode =
    currentToolbarItem === ToolbarItemIDs.BRUSH && !isSpacePressed;

  // 크기에 따른 증가/감소량 계산 함수
  const getSizeIncrement = (currentSize: number): number => {
    if (currentSize < 10) return 1; // 1-10: 1px씩
    if (currentSize < 20) return 2; // 10-20: 2px씩
    if (currentSize < 40) return 4; // 20-40: 4px씩
    if (currentSize < 80) return 8; // 40-80: 8px씩
    return 16; // 80 이상: 16px씩
  };

  // '[' 및 ']' 키 이벤트 핸들러 추가
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 브러시 모드일 때만 키보드 단축키 활성화
      if (!isBrushMode) return;

      const minSize = 1; // 최소 크기
      const maxSize = 200; // 최대 크기

      if (e.key === "[") {
        // 브러시 크기 감소 (현재 크기에 맞는 증가량 적용)
        setBrushProperties((prev) => {
          const increment = getSizeIncrement(prev.size);
          return {
            ...prev,
            size: Math.max(prev.size - increment, minSize),
          };
        });
      } else if (e.key === "]") {
        // 브러시 크기 증가 (현재 크기에 맞는 증가량 적용)
        setBrushProperties((prev) => {
          const increment = getSizeIncrement(prev.size);
          return {
            ...prev,
            size: Math.min(prev.size + increment, maxSize),
          };
        });
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener("keydown", handleKeyDown);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBrushMode, setBrushProperties]);

  // 기존 마우스 이벤트 핸들러 (변경 없음)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // 컨테이너 범위 가져오기
      const rect = containerRef.current.getBoundingClientRect();

      // 거리 계산
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setPosition({ x, y });

      // 작업 영역안에 마우스가 있고, 브러시 모드일 때만 커서 표시
      const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

      setIsVisible(isInside && isBrushMode);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    // 이벤트 리스너 추가
    document.addEventListener("mousemove", handleMouseMove);

    if (containerRef.current) {
      containerRef.current.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);

      if (containerRef.current) {
        containerRef.current.removeEventListener(
          "mouseleave",
          handleMouseLeave,
        );
      }
    };
  }, [containerRef, isBrushMode]);

  if (!isBrushMode || !isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: cursorSize,
        height: cursorSize,
        borderRadius: "50%",
        boxShadow: "0 0 0 1px white, 0 0 0 2px black",
        backgroundColor: "transparent",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    />
  );
};

export default BrushCursor;
