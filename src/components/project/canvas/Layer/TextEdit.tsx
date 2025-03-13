import React, { useEffect, useRef, useState } from "react";
import { LayerWithContents } from "~/store/atoms";
import { TextObject } from "~/types/types";
import Konva from "konva";

interface TextEditProps {
  layer: LayerWithContents;
  stageRef: React.RefObject<Konva.Stage>;
  scale: number;
  isActive: boolean;
  position: { x: number; y: number }; // 캔버스 위치
  onTextChange: (newText: string) => void;
  onFinishEditing: () => void;
}

const TextEdit: React.FC<TextEditProps> = ({
  layer,
  stageRef,
  scale,
  isActive,
  position,
  onTextChange,
  onFinishEditing,
}) => {
  const [textValue, setTextValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputPosition, setInputPosition] = useState({ top: 0, left: 0 });
  const [inputWidth, setInputWidth] = useState<number>(100);

  // 텍스트 객체 데이터 가져오기
  const textObject = (layer.layer_content.text_data as Record<string, any>)
    .textObject;

  // 텍스트 너비 계산 함수
  const calculateTextWidth = (
    text: string,
    fontSize: number,
    fontFamily: string,
  ): number => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      context.font = `${fontSize}px ${fontFamily}`;
      return context.measureText(text).width;
    }
    return text.length * fontSize * 0.6; // 대략적인 너비 계산
  };

  // 텍스트 값이 변경될 때마다 너비 업데이트
  useEffect(() => {
    if (textObject) {
      const fontSize = textObject.fontSize || 16;
      const fontFamily = textObject.fontFamily || "Arial";

      // 텍스트 길이에 따른 너비 계산 (최소 100px)
      const calculatedWidth = Math.max(
        100,
        calculateTextWidth(textValue, fontSize, fontFamily) + 20, // 약간의 여유 공간 추가
      );

      setInputWidth(calculatedWidth);
    }
  }, [textValue, textObject]);

  // 텍스트 레이어가 활성화되면 해당 위치에 input 배치
  useEffect(() => {
    if (isActive && textObject && stageRef.current) {
      const stage = stageRef.current;

      // 텍스트 객체의 위치 정보 가져오기
      const transform = layer.layer_content?.transform as any;

      if (transform) {
        try {
          // 방법 1: Konva의 변환 매트릭스 활용
          // 스테이지의 절대 변환 매트릭스 얻기
          const stageTransform = stage.getAbsoluteTransform().copy();

          // 절대 좌표로 텍스트 위치 계산
          const textPos = {
            x: transform.x || textObject.x || 0,
            y: transform.y || textObject.y || 0,
          };

          // 스테이지 내 로컬 좌표를 절대(화면) 좌표로 변환
          const absolutePos = stageTransform.point(textPos);

          // DOM 위치 설정
          setInputPosition({
            left: absolutePos.x,
            top: absolutePos.y - 10,
          });
        } catch (e) {
          console.error("변환 중 오류:", e);

          // 방법 2: 수동 계산 (폴백 방법)
          // 상대적인 위치 계산
          const x = transform.x || textObject.x || 0;
          const y = transform.y || textObject.y || 0;

          // 스케일 및 위치 적용
          const scaledX = x * scale;
          const scaledY = y * scale;

          // 최종 위치
          setInputPosition({
            left: scaledX + position.x,
            top: scaledY + position.y - 4,
          });
        }

        // 텍스트 값 설정
        if (textObject) {
          setTextValue(textObject.text);

          // 초기 너비 설정
          const fontSize = textObject.fontSize || 16;
          const fontFamily = textObject.fontFamily || "Arial";
          const initialWidth = Math.max(
            100,
            calculateTextWidth(textObject.text, fontSize, fontFamily) + 20,
          );
          setInputWidth(initialWidth);
        }

        // 입력 포커싱
        if (inputRef.current) {
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
            }
          }, 10);
        }
      }
    }
  }, [isActive, layer, stageRef, textObject, scale, position]);

  // 입력 처리 함수
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    onTextChange(newValue);
  };

  // 입력 완료 처리 (Enter 키나 포커스 잃을 때)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFinishEditing();
    }
    if (e.key === "Escape") {
      onFinishEditing();
    }
  };

  // 컴포넌트가 마운트될 때와 isActive가 바뀔 때 포커스 설정
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className="absolute"
      style={{
        left: `${inputPosition.left}px`,
        top: `${inputPosition.top}px`,
        zIndex: 1000,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={textValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={onFinishEditing}
        className="border-none bg-transparent outline-none"
        style={{
          fontFamily: textObject?.fontFamily || "Arial",
          fontSize: `${(textObject?.fontSize || 16) * scale}px`, // 스케일 적용
          color: textObject?.fill || "#000000",
          width: `${inputWidth * scale}px`, // 스케일 적용
          minWidth: `${100 * scale}px`, // 스케일 적용
          transformOrigin: "top left",
        }}
      />
    </div>
  );
};

export default TextEdit;
