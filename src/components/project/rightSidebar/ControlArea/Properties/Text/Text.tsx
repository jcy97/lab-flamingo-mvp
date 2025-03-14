"use client";
import React, { useEffect } from "react";
import { useAtom } from "jotai";
import {
  currentLayerAtom,
  currentLayersAtom,
  editingTextLayerIdAtom,
  textPropertiesAtom,
} from "~/store/atoms";
import { TextObject } from "~/types/types";
// react-icons 임포트
import {
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatBold,
  MdFormatItalic,
} from "react-icons/md";

// 사용 가능한 폰트 목록
const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Impact",
];

// 텍스트 정렬 옵션 - react-icons 컴포넌트 사용
const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "왼쪽", icon: MdFormatAlignLeft },
  { value: "center", label: "가운데", icon: MdFormatAlignCenter },
  { value: "right", label: "오른쪽", icon: MdFormatAlignRight },
];

// 텍스트 스타일 옵션 (굵게, 기울임 등)
const TEXT_STYLE_OPTIONS = [
  { value: "bold", label: "굵게", icon: MdFormatBold },
  { value: "italic", label: "기울임", icon: MdFormatItalic },
];

// 텍스트 속성 에디터 컴포넌트
const TextProperties: React.FC = () => {
  const [textProps, setTextProps] = useAtom(textPropertiesAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const [editingTextLayerId] = useAtom(editingTextLayerIdAtom);
  const [layers, setLayers] = useAtom(currentLayersAtom); // 레이어 목록 상태 가져오기

  // 현재 레이어가 변경되거나 편집 중인 텍스트 레이어 ID가 변경될 때 속성 업데이트
  useEffect(() => {
    if (
      currentLayer &&
      currentLayer.type === "TEXT" &&
      currentLayer.layer_content?.text_data
    ) {
      const textData = (
        currentLayer.layer_content.text_data as Record<string, any>
      ).textObject as TextObject;
      if (textData) {
        // 현재 레이어의 텍스트 속성으로 상태 업데이트
        setTextProps({
          fontFamily: textData.fontFamily || "Arial",
          fontSize: textData.fontSize || 16,
          fill: textData.fill || "#000000",
          align: textData.align || "left",
          fontWeight: textData.fontWeight || "normal",
          fontStyle: textData.fontStyle || "normal",
          lineHeight: textData.lineHeight || 1.2,
          width: textData.width,
        });
      }
    }
  }, [currentLayer, editingTextLayerId, setTextProps]);

  // 텍스트 속성 업데이트 핸들러
  const handlePropertyChange = (property: string, value: any) => {
    // 프로퍼티 상태 업데이트
    setTextProps({ ...textProps, [property]: value });

    // 현재 레이어가 텍스트 레이어이고, 변경 사항을 레이어에 적용
    if (
      currentLayer &&
      currentLayer.type === "TEXT" &&
      currentLayer.layer_content?.text_data
    ) {
      // 현재 텍스트 객체 데이터 복사
      const textData = {
        ...(currentLayer.layer_content.text_data as Record<string, any>)
          .textObject,
      };

      // 해당 속성 업데이트
      textData[property] = value;

      // 레이어 컨텐츠 업데이트
      const updatedLayer = {
        ...currentLayer,
        layer_content: {
          ...currentLayer.layer_content,
          text_data: {
            textObject: textData,
          },
        },
      };

      // 현재 레이어 상태 업데이트
      setCurrentLayer(updatedLayer);

      // 전체 레이어 목록에서 현재 레이어 업데이트
      const updatedLayers = layers.map((layer: any) =>
        layer.id === currentLayer.id ? updatedLayer : layer,
      );

      // 레이어 목록 상태 업데이트
      setLayers(updatedLayers);
    }
  };

  // 폰트 스타일 토글 (굵게, 기울임)
  const toggleFontStyle = (style: string) => {
    if (style === "bold") {
      const newWeight = textProps.fontWeight === "bold" ? "normal" : "bold";
      handlePropertyChange("fontWeight", newWeight);
    } else if (style === "italic") {
      const newStyle = textProps.fontStyle === "italic" ? "normal" : "italic";
      handlePropertyChange("fontStyle", newStyle);
    }
  };

  // 텍스트 레이어가 아닌 경우 안내 메시지 표시
  if (!currentLayer || currentLayer.type !== "TEXT") {
    return (
      <div className="flex h-full items-center justify-center p-3 text-center text-sm text-neutral-400">
        텍스트 레이어를 선택하거나 생성하세요
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* 폰트 패밀리 선택 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          글꼴
        </label>
        <select
          className="w-full rounded border-0 bg-gray-800 p-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
          value={textProps.fontFamily}
          onChange={(e) => handlePropertyChange("fontFamily", e.target.value)}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* 폰트 크기 슬라이더 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          글꼴 크기
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-600 outline-none"
            min="8"
            max="72"
            value={textProps.fontSize}
            onChange={(e) =>
              handlePropertyChange("fontSize", Number(e.target.value))
            }
          />
          <span className="w-10 text-right text-xs text-white">
            {textProps.fontSize}px
          </span>
        </div>
      </div>

      {/* 텍스트 색상 선택 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          색상
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-8 rounded border-0 outline-none"
            value={textProps.fill}
            onChange={(e) => handlePropertyChange("fill", e.target.value)}
          />
          <input
            type="text"
            className="flex-1 rounded border-0 bg-gray-800 p-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            value={textProps.fill}
            onChange={(e) => handlePropertyChange("fill", e.target.value)}
          />
        </div>
      </div>

      {/* 텍스트 정렬 버튼 그룹 - react-icons 컴포넌트 사용 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          정렬
        </label>
        <div className="flex rounded border-0 bg-gray-800">
          {TEXT_ALIGN_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                className={`flex flex-1 items-center justify-center p-2 text-sm text-white ${
                  textProps.align === option.value
                    ? "bg-primary-500 font-medium"
                    : ""
                }`}
                onClick={() => handlePropertyChange("align", option.value)}
                title={option.label}
              >
                <IconComponent className="text-lg" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 텍스트 스타일 버튼 그룹 (굵게, 기울임) - react-icons 컴포넌트 사용 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          스타일
        </label>
        <div className="flex rounded border border-gray-300 bg-neutral-700">
          {TEXT_STYLE_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                className={`flex flex-1 items-center justify-center p-2 text-sm text-white ${
                  (option.value === "bold" &&
                    textProps.fontWeight === "bold") ||
                  (option.value === "italic" &&
                    textProps.fontStyle === "italic")
                    ? "bg-primary-500 font-medium"
                    : ""
                }`}
                onClick={() => toggleFontStyle(option.value)}
                title={option.label}
              >
                <IconComponent className="text-lg" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 줄 간격 슬라이더 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          줄 간격
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-200 outline-none"
            min="1"
            max="3"
            step="0.1"
            value={textProps.lineHeight}
            onChange={(e) =>
              handlePropertyChange("lineHeight", Number(e.target.value))
            }
          />
          <span className="w-10 text-right text-xs text-white">
            {textProps.lineHeight.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TextProperties;
