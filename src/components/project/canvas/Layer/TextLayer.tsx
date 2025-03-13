import Konva from "konva";
import { useEffect, useState } from "react";
import { Text } from "react-konva";
import { LayerWithContents, editingTextLayerIdAtom } from "~/store/atoms"; // editingTextLayerIdAtom 추가 필요
import { TextObject } from "~/types/types";
import { useAtomValue } from "jotai"; // jotai에서 useAtomValue 추가

interface TextLayerProps {
  layer: LayerWithContents;
  stageRef: React.RefObject<Konva.Stage>;
  isSelected: boolean;
}

const TextLayer: React.FC<TextLayerProps> = ({
  layer,
  stageRef,
  isSelected,
}) => {
  const [textData, setTextData] = useState<TextObject | null>(null);

  // 현재 편집 중인 텍스트 레이어 ID 가져오기
  const editingTextLayerId = useAtomValue(editingTextLayerIdAtom);

  // 현재 레이어가 편집 중인지 확인
  const isEditing = editingTextLayerId === layer.id;

  // 텍스트 데이터 초기화
  useEffect(() => {
    if (layer.layer_content?.text_data) {
      const textObjectData = (
        layer.layer_content.text_data as Record<string, any>
      ).textObject;

      if (textObjectData) {
        setTextData(textObjectData as TextObject);
      }
    }

    const transform = layer.layer_content?.transform as any;
  }, [layer.layer_content?.text_data]);

  // 텍스트 없거나 편집 중이면 렌더링하지 않음
  if (!textData || isEditing) return null;

  // 변형 정보 가져오기
  const transform = layer.layer_content?.transform as any;
  const x = transform?.x || textData.x;
  const y = transform?.y || textData.y;

  return (
    <>
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
      />
    </>
  );
};

export default TextLayer;
