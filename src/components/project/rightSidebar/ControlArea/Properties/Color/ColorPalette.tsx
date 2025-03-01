"use client";
import React, { useState, useRef } from "react";
import { useAtom } from "jotai";
import { brushPropertiesAtom } from "~/store/atoms";
import { DEFAULT_COLORS } from "~/constants/color";

const ColorPalette: React.FC = () => {
  const [brushProps, setBrushProps] = useAtom(brushPropertiesAtom);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState(brushProps.color);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // 마지막으로 추가된 색상을 추적하기 위한 ref
  const lastAddedColorRef = useRef<string>(brushProps.color);

  // 색상 선택 핸들러 (색상 버튼 클릭 시 사용)
  const handleColorSelect = (color: string) => {
    setBrushProps({ ...brushProps, color });
    setCustomColor(color);

    // 최근 사용 색상에 추가
    addToRecentColors(color);
  };

  // 최근 사용 색상에 추가하는 함수
  const addToRecentColors = (color: string) => {
    // 이미 같은 색상이 있는 경우 추가하지 않음
    if (!recentColors.includes(color) && color !== lastAddedColorRef.current) {
      lastAddedColorRef.current = color;
      const newRecentColors = [color, ...recentColors.slice(0, 7)]; // 사이드바 디자인에 맞게 최대 8개로 제한
      setRecentColors(newRecentColors);
    }
  };

  // 헥스 색상 입력 핸들러
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);

    // 유효한 헥스 색상인 경우에만 적용
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setBrushProps({ ...brushProps, color: value });
    }
  };

  // 컬러 피커 핸들러
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);
    setBrushProps({ ...brushProps, color: value });
  };

  // 컬러 피커 변경 완료 시 핸들러 (마우스 업)
  const handleColorPickerComplete = () => {
    // 컬러 피커 사용 완료 시에만 최근 색상에 추가
    addToRecentColors(customColor);
  };

  // 컬러 피커 열기 버튼 클릭
  const handleOpenColorPicker = () => {
    if (colorPickerRef.current) {
      colorPickerRef.current.click();
    }
  };

  return (
    <div className="mb-4 ml-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">색상</h3>

        {/* 현재 선택된 색상 표시 */}
        <div className="flex items-center">
          <div
            className="mr-2 h-5 w-5 rounded-sm border border-neutral-600"
            style={{ backgroundColor: brushProps.color }}
          ></div>
          <span className="text-xs text-gray-200">{brushProps.color}</span>
        </div>
      </div>

      {/* 기본 색상 팔레트 */}
      <div className="mb-3 grid grid-cols-8 gap-1.5">
        {DEFAULT_COLORS.map((color) => (
          <button
            key={color}
            className={`aspect-square rounded-sm transition-all ${
              brushProps.color === color
                ? "scale-110 transform ring-1 ring-white"
                : "border border-neutral-700 hover:border-neutral-500"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
            aria-label={`Select color ${color}`}
          ></button>
        ))}
      </div>

      {/* 최근 사용 색상 */}
      {recentColors.length > 0 && (
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-medium text-white">최근 사용</h4>
            <button
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setRecentColors([])}
            >
              지우기
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {recentColors.slice(0, 8).map((color) => (
              <button
                key={color}
                className={`aspect-square rounded-sm transition-all ${
                  brushProps.color === color
                    ? "scale-110 transform ring-1 ring-white"
                    : "border border-neutral-700 hover:border-neutral-500"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Select color ${color}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* 커스텀 색상 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-white">커스텀 색상</h4>
        </div>

        <div className="rounded-md border border-neutral-700 bg-neutral-800 p-2">
          {/* 숨겨진 실제 컬러 피커 */}
          <input
            ref={colorPickerRef}
            type="color"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            value={customColor}
            onChange={handleColorPickerChange}
            onBlur={handleColorPickerComplete}
          />

          <div className="flex items-center gap-1">
            <div
              className="h-8 w-8 cursor-pointer rounded border border-neutral-600 transition hover:border-white"
              style={{ backgroundColor: customColor }}
              onClick={handleOpenColorPicker}
            ></div>
            <input
              type="text"
              className="h-8 rounded border border-neutral-600 bg-neutral-800 text-center text-sm text-neutral-100 outline-none"
              value={customColor}
              onChange={handleHexInputChange}
              onBlur={() => addToRecentColors(customColor)}
              pattern="^#[0-9A-F]{6}$"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;
