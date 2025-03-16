"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import {
  currentLayerAtom,
  currentLayersAtom,
  editingTextLayerIdAtom,
  textPropertiesAtom,
  currentCanvasAtom,
} from "~/store/atoms";
import { TextObject } from "~/types/types";
import { saveLayerContent } from "~/app/actions/yjs/layerYjs";
import { useSession } from "next-auth/react";
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

const TextProperties: React.FC = () => {
  const [textProps, setTextProps] = useAtom(textPropertiesAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const [editingTextLayerId] = useAtom(editingTextLayerIdAtom);
  const [layers, setLayers] = useAtom(currentLayersAtom);
  const [currentCanvas] = useAtom(currentCanvasAtom);
  const { data: user } = useSession();

  // 변경 추적을 위한 상태들
  const [isChanging, setIsChanging] = useState(false);
  const [currentProp, setCurrentProp] = useState<string | null>(null);
  const [initialValue, setInitialValue] = useState<any>(null);

  // 색상 관련 상태 - colorPickerOpen 상태 추가
  const [localColor, setLocalColor] = useState(textProps.fill || "#000000");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // 콜러피커 변경 완료 후 서버에 저장했는지 확인하는 플래그
  const colorSavedRef = useRef(false);

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
        const newFill = textData.fill || "#000000";
        setTextProps({
          fontFamily: textData.fontFamily || "Arial",
          fontSize: textData.fontSize || 16,
          fill: newFill,
          align: textData.align || "left",
          fontWeight: textData.fontWeight || "normal",
          fontStyle: textData.fontStyle || "normal",
          lineHeight: textData.lineHeight || 1.2,
          width: textData.width,
        });

        // 로컬 색상 상태도 업데이트
        setLocalColor(newFill);
        // 저장 플래그 초기화
        colorSavedRef.current = true;
      }
    }
  }, [currentLayer, editingTextLayerId, setTextProps]);

  // 프로퍼티 변경 시작 (마우스 다운)
  const handleChangeStart = (property: string, value: any) => {
    setIsChanging(true);
    setCurrentProp(property);
    setInitialValue(value); // 초기값 저장
  };

  // 프로퍼티 변경 중 (로컬 상태만 업데이트)
  const handlePropertyChange = (property: string, value: any) => {
    // 첫 변경 시작인 경우 초기값 저장
    if (!isChanging && property === currentProp) {
      handleChangeStart(
        property,
        textProps[property as keyof typeof textProps],
      );
    }

    // 텍스트 속성 상태 업데이트
    setTextProps({ ...textProps, [property]: value });

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

      // 업데이트된 콘텐츠 생성
      const updatedContent = {
        ...currentLayer.layer_content,
        text_data: {
          textObject: textData,
        },
      };

      // 로컬 상태 업데이트
      const updatedLayer = {
        ...currentLayer,
        layer_content: updatedContent,
      };
      setCurrentLayer(updatedLayer);

      // 레이어 목록 업데이트
      const updatedLayers = layers.map((layer) =>
        layer.id === currentLayer.id ? updatedLayer : layer,
      );
      setLayers(updatedLayers);

      // 즉시 적용이 필요한 컨트롤(드롭다운, 버튼 등)의 경우
      if (!isChanging) {
        // 값이 실제로 변경되었는지 확인 후 저장
        const oldValue =
          textData[property] !== value
            ? textProps[property as keyof typeof textProps]
            : null;

        if (oldValue !== value) {
          saveChanges(currentLayer.id, updatedContent);
        }
      }
    }
  };

  // 프로퍼티 변경 완료 (마우스 업)
  const handleChangeEnd = () => {
    if (isChanging && currentLayer && currentProp) {
      // 현재 값 가져오기
      const currentValue = textProps[currentProp as keyof typeof textProps];

      // 값이 실제로 변경되었는지 확인
      if (initialValue !== currentValue) {
        // 현재 레이어 콘텐츠 가져오기
        const updatedContent = currentLayer.layer_content;
        if (updatedContent) {
          saveChanges(currentLayer.id, updatedContent);
        }
      }

      // 변경 상태 초기화
      setIsChanging(false);
      setCurrentProp(null);
      setInitialValue(null);
    }
  };

  // 색상 피커 열기 처리
  const handleColorPickerOpen = () => {
    setColorPickerOpen(true);
    colorSavedRef.current = false; // 저장 플래그 초기화
    console.log("컬러피커 열림");
  };

  // 색상 변경 처리
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);

    // 로컬 UI만 업데이트
    setTextProps({ ...textProps, fill: newColor });

    if (
      currentLayer &&
      currentLayer.type === "TEXT" &&
      currentLayer.layer_content?.text_data
    ) {
      // 현재 텍스트 객체 복사 및 업데이트
      const textData = {
        ...(currentLayer.layer_content.text_data as Record<string, any>)
          .textObject,
      };
      textData.fill = newColor;

      // 콘텐츠 업데이트
      const updatedContent = {
        ...currentLayer.layer_content,
        text_data: {
          textObject: textData,
        },
      };

      // 레이어 상태 업데이트
      const updatedLayer = {
        ...currentLayer,
        layer_content: updatedContent,
      };
      setCurrentLayer(updatedLayer);

      // 레이어 목록 업데이트
      const updatedLayers = layers.map((layer) =>
        layer.id === currentLayer.id ? updatedLayer : layer,
      );
      setLayers(updatedLayers);
    }
  };

  // 색상 변경 완료 및 저장 처리
  const saveColorChange = () => {
    // 이미 저장된 경우 중복 실행 방지
    if (colorSavedRef.current) return;

    if (
      currentLayer &&
      currentLayer.type === "TEXT" &&
      currentLayer.layer_content?.text_data
    ) {
      console.log("색상 변경 저장 실행");

      // 현재 텍스트 객체 데이터 가져오기
      const textData = {
        ...(currentLayer.layer_content.text_data as Record<string, any>)
          .textObject,
      };

      // 현재 색상 적용
      textData.fill = localColor;

      // 콘텐츠 업데이트
      const updatedContent = {
        ...currentLayer.layer_content,
        text_data: {
          textObject: textData,
        },
      };

      // 서버에 저장
      if (currentCanvas && user) {
        console.log("YJS를 통해 색상 저장:", localColor);
        saveLayerContent(
          currentCanvas.id,
          currentLayer.id,
          updatedContent,
          user,
        );

        // 저장 완료 플래그 설정
        colorSavedRef.current = true;

        // 1초 후에 강제 재렌더링을 위한 더미 상태 업데이트
        // (동기화가 제대로 되었는지 UI에 반영하기 위함)
        setTimeout(() => {
          setTextProps((prev) => ({ ...prev }));
        }, 1000);
      }
    }

    // 색상 피커 상태 초기화
    setColorPickerOpen(false);
  };

  // 색상 입력 필드 포커스 아웃 처리
  const handleColorInputBlur = () => {
    console.log("색상 입력 필드 blur");
    saveColorChange();
  };

  // 색상 피커 닫힘 처리 (클릭 이벤트보다 먼저 발생할 수 있음)
  const handleColorPickerBlur = (e: React.FocusEvent) => {
    // 다른 요소로 포커스 이동 시 지연 처리
    setTimeout(() => {
      // 색상 입력 필드로 포커스 이동한 경우 무시
      if (document.activeElement === colorInputRef.current) return;

      console.log("컬러피커 blur");
      saveColorChange();
    }, 200);
  };

  // 실제 저장 함수
  const saveChanges = (layerId: string, content: any) => {
    if (currentCanvas && user) {
      console.log("변경된 속성 저장:", currentProp ? currentProp : "색상"); // 디버깅용
      saveLayerContent(currentCanvas.id, layerId, content, user);
    }
  };

  // 전역 클릭 이벤트로 컬러피커 외부 클릭 감지
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 컬러피커가 열려있고, 피커나 입력 필드 외부 클릭 시
      if (
        colorPickerOpen &&
        colorPickerRef.current &&
        colorInputRef.current &&
        !colorPickerRef.current.contains(e.target as Node) &&
        !colorInputRef.current.contains(e.target as Node)
      ) {
        console.log("컬러피커 외부 클릭");
        saveColorChange();
      }
    };

    // 이벤트 등록 및 정리
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [colorPickerOpen, currentLayer, localColor, currentCanvas, user]);

  // 페이지 언로드 감지하여 변경사항 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (colorPickerOpen && !colorSavedRef.current) {
        saveColorChange();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [colorPickerOpen, colorSavedRef.current]);

  // 글로벌 마우스 업 이벤트 핸들러
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isChanging) {
        handleChangeEnd();
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isChanging, currentProp, initialValue, textProps, currentLayer]);

  // 폰트 스타일 토글 (버튼 클릭)
  const toggleFontStyle = (style: string) => {
    if (style === "bold") {
      const currentValue = textProps.fontWeight;
      const newValue = currentValue === "bold" ? "normal" : "bold";

      // 값이 변경될 때만 처리
      if (currentValue !== newValue) {
        handlePropertyChange("fontWeight", newValue);
      }
    } else if (style === "italic") {
      const currentValue = textProps.fontStyle;
      const newValue = currentValue === "italic" ? "normal" : "italic";

      // 값이 변경될 때만 처리
      if (currentValue !== newValue) {
        handlePropertyChange("fontStyle", newValue);
      }
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
          onChange={(e) => {
            // 값이 변경된 경우에만 처리
            if (e.target.value !== textProps.fontFamily) {
              handlePropertyChange("fontFamily", e.target.value);
            }
          }}
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
            onMouseDown={() =>
              handleChangeStart("fontSize", textProps.fontSize)
            }
            onChange={(e) =>
              handlePropertyChange("fontSize", Number(e.target.value))
            }
            onMouseUp={handleChangeEnd}
          />
          <span className="w-10 text-right text-xs text-white">
            {textProps.fontSize}px
          </span>
        </div>
      </div>

      {/* 텍스트 색상 선택 - 이벤트 핸들러 개선 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white">
          색상
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={colorPickerRef}
            type="color"
            className="h-8 w-8 rounded border-0 outline-none"
            value={localColor}
            onClick={handleColorPickerOpen}
            onChange={handleColorChange}
            onBlur={handleColorPickerBlur}
          />
          <input
            ref={colorInputRef}
            type="text"
            className="flex-1 rounded border-0 bg-gray-800 p-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            value={localColor}
            onChange={handleColorChange}
            onBlur={handleColorInputBlur}
          />
        </div>
      </div>

      {/* 텍스트 정렬 버튼 그룹 */}
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

      {/* 텍스트 스타일 버튼 그룹 (굵게, 기울임) */}
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
            onMouseDown={() =>
              handleChangeStart("lineHeight", textProps.lineHeight)
            }
            onChange={(e) =>
              handlePropertyChange("lineHeight", Number(e.target.value))
            }
            onMouseUp={handleChangeEnd}
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
