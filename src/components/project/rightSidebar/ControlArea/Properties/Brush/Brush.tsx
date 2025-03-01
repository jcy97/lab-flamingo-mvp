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

  return (
    <div className="space-y-3 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          브러시 크기
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="h-2 flex-1 appearance-none rounded bg-gray-200"
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
            className="h-2 flex-1 appearance-none rounded bg-gray-200"
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
            className="h-2 flex-1 appearance-none rounded bg-gray-200"
            min="0"
            max="1"
            step="0.01"
            value={brushProps.smoothing}
            onChange={(e) =>
              handlePropertyChange("smoothing", Number(e.target.value))
            }
          />
          <span className="w-10 text-right text-xs text-neutral-300">
            {Math.round(brushProps.smoothing * 100)}%
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
            className="h-0 w-0 opacity-0"
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

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-300">
          브러시 유형
        </label>
        <div className="grid grid-cols-3 gap-1">
          <button
            className={`rounded border py-1.5 text-xs ${
              brushProps.type === "round"
                ? "border-gray-400 bg-gray-100 font-medium"
                : "border-gray-300 text-neutral-300"
            }`}
            onClick={() => handlePropertyChange("type", "round")}
          >
            원형
          </button>
          <button
            className={`rounded border py-1.5 text-xs ${
              brushProps.type === "square"
                ? "border-gray-400 bg-gray-100 font-medium"
                : "border-gray-300 text-neutral-300"
            }`}
            onClick={() => handlePropertyChange("type", "square")}
          >
            사각형
          </button>
          <button
            className={`rounded border py-1.5 text-xs ${
              brushProps.type === "texture"
                ? "border-gray-400 bg-gray-100 font-medium"
                : "border-gray-300 text-neutral-300"
            }`}
            onClick={() => handlePropertyChange("type", "texture")}
          >
            텍스처
          </button>
        </div>
      </div>
    </div>
  );
};

export default Brush;
