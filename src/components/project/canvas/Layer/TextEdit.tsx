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
  onSave?: (layerId: string, textObject: TextObject) => void;
}

const TextEdit: React.FC<TextEditProps> = ({
  layer,
  stageRef,
  scale,
  isActive,
  position,
  onTextChange,
  onFinishEditing,
  onSave,
}) => {
  const [textValue, setTextValue] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputPosition, setInputPosition] = useState({ top: 0, left: 0 });
  const [inputWidth, setInputWidth] = useState<number>(100);
  const [inputHeight, setInputHeight] = useState<number>(20);

  // 텍스트 객체 데이터 가져오기
  const textObject = layer.layer_content?.text_data
    ? (layer.layer_content.text_data as Record<string, any>).textObject
    : null;
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

      // 줄바꿈이 있는 경우 각 줄의 최대 너비 계산
      const lines = text.split("\n");
      let maxWidth = 0;

      lines.forEach((line) => {
        const lineWidth = context.measureText(line).width;
        maxWidth = Math.max(maxWidth, lineWidth);
      });

      return maxWidth;
    }
    return text.length * fontSize * 0.6; // 대략적인 너비 계산
  };

  // 텍스트 높이 계산 함수
  const calculateTextHeight = (
    text: string,
    fontSize: number,
    lineHeight: number = 1.2,
  ): number => {
    // 줄 수 계산
    const lines = text.split("\n").length;
    // 줄 높이 (폰트 크기 * 줄 높이 비율)
    const lineHeightPx = fontSize * lineHeight;

    return Math.max(fontSize, lines * lineHeightPx);
  };

  // 레이어 변경 시 텍스트값 업데이트
  useEffect(() => {
    if (textObject && isActive) {
      setTextValue(textObject.text || "");
    }
  }, [textObject, isActive, layer]); // layer 의존성 추가

  // 텍스트값이 변경될 때마다 너비와 높이 업데이트
  useEffect(() => {
    if (textObject) {
      const fontSize = textObject.fontSize || 16;
      const fontFamily = textObject.fontFamily || "Arial";
      const lineHeight = textObject.lineHeight || 1.2;

      // 텍스트 길이에 따른 너비 계산 (최소 100px)
      const calculatedWidth = Math.max(
        100,
        calculateTextWidth(textValue, fontSize, fontFamily) + 20, // 약간의 여유 공간 추가
      );

      // 텍스트 높이 계산 (줄 간격 적용)
      const calculatedHeight = calculateTextHeight(
        textValue,
        fontSize,
        lineHeight,
      );

      setInputWidth(calculatedWidth);
      setInputHeight(calculatedHeight);
    }
  }, [textValue, textObject]);

  // textarea 높이 자동 조절 함수
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // 텍스트 레이어가 활성화되면 해당 위치에 textarea 배치
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
            left: absolutePos.x + 0.2,
            top: absolutePos.y - 1,
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
            top: scaledY + position.y,
          });
        }

        // 텍스트 값 설정
        if (textObject) {
          setTextValue(textObject.text || "");

          // 초기 너비와 높이 설정
          const fontSize = textObject.fontSize || 16;
          const fontFamily = textObject.fontFamily || "Arial";
          const lineHeight = textObject.lineHeight || 1.2;
          const initialWidth = Math.max(
            100,
            calculateTextWidth(textObject.text || "", fontSize, fontFamily) +
              20,
          );
          const initialHeight = calculateTextHeight(
            textObject.text || "",
            fontSize,
            lineHeight,
          );

          setInputWidth(initialWidth);
          setInputHeight(initialHeight);
        }

        // 입력 포커싱
        if (textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              adjustTextareaHeight();
            }
          }, 10);
        }
      }
    }
  }, [isActive, layer, stageRef, textObject, scale, position]);

  // 입력 처리 함수
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    onTextChange(newValue);
    adjustTextareaHeight();
  };

  // 입력 완료 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter는 줄바꿈, Enter만 누르면 편집 완료
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveAndFinish();
    }
    if (e.key === "Escape") {
      saveAndFinish();
    }
  };

  const handleBlur = () => {
    saveAndFinish();
  };

  const saveAndFinish = () => {
    if (onSave && textObject) {
      // 현재 텍스트 값으로 textObject 업데이트
      const updatedTextObject = {
        ...textObject,
        text: textValue,
      };
      // 저장 콜백 호출
      onSave(layer.id, updatedTextObject);
    }
    onFinishEditing();
  };
  // 컴포넌트가 마운트될 때와 isActive가 바뀔 때 포커스 설정
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
      adjustTextareaHeight();
    }
  }, [isActive]);

  if (!isActive || !textObject) return null;

  return (
    <div
      className="absolute"
      style={{
        left: `${inputPosition.left}px`,
        top: `${inputPosition.top}px`,
        zIndex: 1000,
      }}
    >
      <textarea
        ref={textareaRef}
        value={textValue}
        onBlur={handleBlur}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        spellCheck="false"
        className="resize-none overflow-hidden border-none bg-transparent outline-none"
        style={{
          fontFamily: textObject.fontFamily || "Arial",
          fontSize: `${(textObject.fontSize || 16) * scale}px`, // 스케일 적용
          fontWeight: textObject.fontWeight || "normal", // 폰트 굵기 적용
          fontStyle: textObject.fontStyle || "normal", // 폰트 스타일 적용
          color: textObject.fill || "#000000",
          width: `${inputWidth * scale}px`, // 스케일 적용
          minWidth: `${100 * scale}px`, // 스케일 적용
          minHeight: `${(textObject.fontSize || 16) * (textObject.lineHeight || 1.2) * scale}px`, // 줄 간격 고려한 최소 높이
          lineHeight: String(textObject.lineHeight || 1.2), // 줄 높이 비율 설정
          textAlign: textObject.align || "left", // 텍스트 정렬 적용
          transformOrigin: "top left",
          padding: "0",
        }}
      />
    </div>
  );
};

export default TextEdit;
