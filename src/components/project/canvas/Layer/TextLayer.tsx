import Konva from "konva";
import { useEffect, useState } from "react";
import { Text } from "react-konva";
import { LayerWithContents, editingTextLayerIdAtom } from "~/store/atoms";
import { TextObject } from "~/types/types";
import { useAtomValue } from "jotai";

interface TextLayerProps {
  layer: LayerWithContents;
  stageRef: React.RefObject<Konva.Stage>;
  isSelected: boolean;
}

const TextLayer: React.FC<TextLayerProps> = ({ layer }) => {
  const [textData, setTextData] = useState<TextObject | null>(null);

  // 현재 편집 중인 텍스트 레이어 ID 가져오기
  const editingTextLayerId = useAtomValue(editingTextLayerIdAtom);

  // 현재 레이어가 편집 중인지 확인
  const isEditing = editingTextLayerId === layer.id;

  // 텍스트 데이터 초기화 및 업데이트
  useEffect(() => {
    if (layer.layer_content?.text_data) {
      const textObjectData = (
        layer.layer_content.text_data as Record<string, any>
      ).textObject;

      if (textObjectData) {
        setTextData(textObjectData as TextObject);
      }
    }
  }, [layer, layer.layer_content?.text_data]); // layer를 의존성 배열에 추가하여 전체 레이어가 변경될 때도 업데이트

  // 텍스트 없거나 편집 중이면 렌더링하지 않음
  if (!textData || isEditing) return null;

  // 변형 정보 가져오기
  const transform = layer.layer_content?.transform as any;
  const x = transform?.x || textData.x;
  const y = transform?.y || textData.y;

  // fontStyle과 fontWeight를 결합하여 Konva가 이해하는 방식으로 변환
  const computeFontStyle = () => {
    let fontStyleValue = textData.fontStyle || "normal";

    // 만약 굵은 글씨체라면 'bold'를 추가
    if (textData.fontWeight === "bold") {
      // 이탤릭 스타일이면 'italic bold' 형태로, 아니면 'bold'만 반환
      return fontStyleValue === "italic" ? "italic bold" : "bold";
    }

    // 굵은 글씨체가 아니면 원래 스타일(normal 또는 italic) 반환
    return fontStyleValue;
  };

  // 계산된 fontStyle 값
  const fontStyleValue = computeFontStyle();

  return (
    <Text
      id={layer.id}
      x={x}
      y={y}
      text={textData.text}
      fontSize={textData.fontSize}
      fontFamily={textData.fontFamily}
      fill={textData.fill || "#000000"}
      perfectDrawEnabled={true}
      listening={true}
      // 여러 줄 텍스트 지원을 위한 추가 속성
      width={textData.width}
      lineHeight={textData.lineHeight || 1.2} // textData에서 줄 간격 값 가져오기
      align={textData.align || "left"} // 텍스트 정렬
      fontStyle={fontStyleValue} // 계산된 폰트 스타일 적용 (italic, bold 또는 italic bold)
    />
  );
};

export default TextLayer;
