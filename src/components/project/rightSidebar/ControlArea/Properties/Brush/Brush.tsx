"use client";
import React from "react";
import { useAtom } from "jotai";
import { brushPropertiesAtom } from "~/store/atoms";
import { BLEND_MODES } from "~/constants/color";

// 브러시 속성 에디터 컴포넌트
const Brush: React.FC = () => {
  const [brushProps, setBrushProps] = useAtom(brushPropertiesAtom);

  // 브러시 속성 업데이트 핸들러
  const handlePropertyChange = (property: string, value: any) => {
    setBrushProps({ ...brushProps, [property]: value });
  };

  // 부드러움 UI 값을 실제 속성 값으로 변환 (최대 0.7)
  const convertSmoothingToProperty = (uiValue: number): number => {
    return (uiValue / 100) * 0.7;
  };

  // 실제 속성 값을 UI 표시 값으로 변환 (100% 스케일)
  const convertSmoothingToUI = (propertyValue: number): number => {
    return (propertyValue / 0.7) * 100;
  };

  // 부드러움 슬라이더 변경 핸들러
  const handleSmoothingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uiValue = Number(e.target.value);
    const propertyValue = convertSmoothingToProperty(uiValue);
    handlePropertyChange("smoothing", propertyValue);
  };

  // UI에 표시할 부드러움 값 (0-100%)
  const smoothingUIValue = convertSmoothingToUI(brushProps.smoothing);

  return (
    <div className="space-y-3 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          브러시 크기
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-200 outline-none"
            min="1"
            max="100"
            value={brushProps.size}
            onChange={(e) =>
              handlePropertyChange("size", Number(e.target.value))
            }
          />
          <span className="w-10 text-right text-xs text-neutral-300">
            {brushProps.size}px
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          불투명도
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-200 outline-none"
            min="0"
            max="1"
            step="0.01"
            value={brushProps.opacity}
            onChange={(e) =>
              handlePropertyChange("opacity", Number(e.target.value))
            }
          />
          <span className="w-10 text-right text-xs text-neutral-300">
            {Math.round(brushProps.opacity * 100)}%
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          부드러움
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-200 outline-none"
            min="0"
            max="100"
            step="1"
            value={smoothingUIValue}
            onChange={handleSmoothingChange}
          />
          <span className="w-10 text-right text-xs text-neutral-300">
            {Math.round(smoothingUIValue)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-300">
          압력 감지
        </label>
        <div className="relative mr-2 inline-block h-5 w-10">
          <input
            type="checkbox"
            className="h-0 w-0 opacity-0 outline-none"
            id="pressure-switch"
            checked={brushProps.pressure}
            onChange={(e) => handlePropertyChange("pressure", e.target.checked)}
          />
          <label
            htmlFor="pressure-switch"
            className={`absolute bottom-0 left-0 right-0 top-0 cursor-pointer rounded-full transition-colors ${
              brushProps.pressure ? "bg-primary-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                brushProps.pressure ? "translate-x-5 transform" : ""
              }`}
            ></span>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          혼합 모드
        </label>
        <select
          className="w-full rounded border border-gray-300 bg-white p-1.5 text-sm"
          value={brushProps.blendMode}
          onChange={(e) => handlePropertyChange("blendMode", e.target.value)}
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode} value={mode} className="capitalize">
              {mode}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Brush;
