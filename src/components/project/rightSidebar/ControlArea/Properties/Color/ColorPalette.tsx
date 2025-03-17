"use client";
import React, { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { brushPropertiesAtom } from "~/store/atoms";
import { DEFAULT_COLORS } from "~/constants/color";

const ColorPalette: React.FC = () => {
  const [brushProps, setBrushProps] = useAtom(brushPropertiesAtom);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState(brushProps.color);

  // HSV 값 관리
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [value, setValue] = useState(100);

  // 색상 선택 모드 (palette, slider)
  const [colorMode, setColorMode] = useState<"palette" | "slider">("palette");

  // 캔버스 참조
  const hueSliderRef = useRef<HTMLCanvasElement>(null);
  const palettePickerRef = useRef<HTMLCanvasElement>(null);

  // 드래그 상태
  const isDraggingRef = useRef(false);
  const activeElementRef = useRef<"palette" | "hue" | null>(null);

  // 마우스 위치 (팔레트에서의 선택점)
  const [palettePos, setpalettePos] = useState({ x: 100, y: 0 });
  const [huePos, setHuePos] = useState(0);

  // 컴포넌트 마운트 시 초기 HSV 값 설정
  useEffect(() => {
    const hex = brushProps.color;
    const rgb = hexToRgb(hex);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setValue(hsv.v);

      // 팔레트 포지션 계산
      setpalettePos({
        x: hsv.s,
        y: (1 - hsv.v / 100) * 100,
      });
      // 휴 슬라이더 포지션
      setHuePos((hsv.h / 360) * 100);
    }

    // 약간의 지연 후 캔버스 초기화 (마운트 완료 보장)
    setTimeout(() => {
      drawHueSlider();
      drawColorPalette(hue);
    }, 50);
  }, []);

  // HSV 값이 변경될 때 팔레트 업데이트
  useEffect(() => {
    drawHueSlider();
    drawColorPalette(hue);

    // HSV에서 RGB로 변환 후 HEX로 변환
    const rgb = hsvToRgb(hue, saturation, value);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    setCustomColor(hex);
    setBrushProps({ ...brushProps, color: hex });
  }, [hue, saturation, value]);

  // 컬러 모드가 변경될 때마다 해당 캔버스 다시 그리기
  useEffect(() => {
    // 약간의 지연 후 캔버스 다시 그리기 (DOM 업데이트 완료 보장)
    setTimeout(() => {
      if (colorMode === "palette") {
        drawHueSlider();
        drawColorPalette(hue);
      } else if (colorMode === "slider") {
        drawHueSlider();
      }
    }, 50);
  }, [colorMode]);

  // 색상 팔레트 그리기 (포토샵 스타일)
  const drawColorPalette = (hue: number) => {
    const canvas = palettePickerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);

    // 성능 개선을 위해 ImageData 사용
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // 포화도(X축)와 밝기(Y축)에 따른 색상 사각형 그리기
    for (let y = 0; y < height; y++) {
      const v = 100 - (y / height) * 100;

      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;
        const rgb = hsvToRgb(hue, s, v);

        const index = (y * width + x) * 4;
        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = 255; // 알파
      }
    }

    // 이미지 데이터 적용
    ctx.putImageData(imageData, 0, 0);
  };

  // 색상 슬라이더 그리기
  const drawHueSlider = () => {
    const canvas = hueSliderRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);

    // 색상 슬라이더 그리기
    for (let x = 0; x < width; x++) {
      const h = (x / width) * 360;
      const rgb = hsvToRgb(h, 100, 100);

      const gradient = ctx.createLinearGradient(x, 0, x, height);
      gradient.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      gradient.addColorStop(1, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, 0, 1, height);
    }

    // 현재 선택된 위치 표시
    const markerX = (hue / 360) * width;
    ctx.beginPath();
    ctx.moveTo(markerX, 0);
    ctx.lineTo(markerX, height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // 팔레트 마우스 이벤트 처리
  const handlePaletteMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    activeElementRef.current = "palette";
    handlePaletteMouseMove(e);
  };

  const handlePaletteMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || activeElementRef.current !== "palette")
      return;

    const canvas = palettePickerRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 유효한 범위로 제한
    const newS = Math.min(100, Math.max(0, (x / canvas.width) * 100));
    const newV = Math.min(100, Math.max(0, 100 - (y / canvas.height) * 100));

    // 상태 업데이트
    setSaturation(newS);
    setValue(newV);
    setpalettePos({ x: newS, y: 100 - newV });
  };

  // 휴 슬라이더 마우스 이벤트 처리
  const handleHueMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    activeElementRef.current = "hue";
    handleHueMouseMove(e);
  };

  const handleHueMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || activeElementRef.current !== "hue") return;

    const canvas = hueSliderRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // 유효한 범위로 제한
    const newHue = Math.min(359, Math.max(0, (x / canvas.width) * 360));

    // 상태 업데이트
    setHue(newHue);
    setHuePos((newHue / 360) * 100);
  };

  // 마우스 업 이벤트 처리
  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      activeElementRef.current = null;

      // HSV에서 RGB로 변환 후 HEX로 변환
      const rgb = hsvToRgb(hue, saturation, value);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      // 최근 색상에 추가
      addToRecentColors(hex);
    }
  };

  // 마우스 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, []);

  // 글로벌 마우스 이동 이벤트 처리
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    if (activeElementRef.current === "palette") {
      const canvas = palettePickerRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));

      // 유효한 범위로 제한
      const newS = (x / canvas.width) * 100;
      const newV = 100 - (y / canvas.height) * 100;

      // 상태 업데이트
      setSaturation(newS);
      setValue(newV);
      setpalettePos({ x: newS, y: 100 - newV });
    } else if (activeElementRef.current === "hue") {
      const canvas = hueSliderRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));

      // 유효한 범위로 제한
      const newHue = (x / canvas.width) * 360;

      // 상태 업데이트
      setHue(newHue);
      setHuePos((newHue / 360) * 100);
    }
  };

  // 색상 선택 핸들러 (색상 버튼 클릭 시 사용)
  const handleColorSelect = (color: string) => {
    setBrushProps({ ...brushProps, color });
    setCustomColor(color);

    // RGB로 변환 후 HSV로 변환
    const rgb = hexToRgb(color);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setValue(hsv.v);

      // 팔레트 포지션 업데이트
      setpalettePos({
        x: hsv.s,
        y: 100 - hsv.v,
      });
    }

    // 최근 사용 색상에 추가
    addToRecentColors(color);
  };

  // 최근 사용 색상에 추가하는 함수
  const addToRecentColors = (color: string) => {
    // 이미 같은 색상이 있는 경우 추가하지 않음
    if (!recentColors.includes(color)) {
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

      // RGB로 변환 후 HSV로 변환
      const rgb = hexToRgb(value);
      if (rgb) {
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHue(hsv.h);
        setSaturation(hsv.s);
        setValue(hsv.v);

        // 팔레트 포지션 업데이트
        setpalettePos({
          x: hsv.s,
          y: 100 - hsv.v,
        });
      }
    }
  };

  // 컬러 모드 변경 핸들러
  const handleModeChange = (mode: "palette" | "slider") => {
    setColorMode(mode);

    // 모드 변경 즉시 캔버스 강제 초기화 (DOM 업데이트 전이므로 setTimeout 사용)
    setTimeout(() => {
      if (mode === "palette") {
        drawColorPalette(hue);
        drawHueSlider();
      } else if (mode === "slider") {
        drawHueSlider();
      }
    }, 0);
  };

  // HEX <-> RGB <-> HSV 변환 함수들
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  };

  const hsvToRgb = (h: number, s: number, v: number) => {
    h = h / 360;
    s = s / 100;
    v = v / 100;

    let r = 0,
      g = 0,
      b = 0;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
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

      {/* 색상 모드 선택 탭 */}
      <div className="mb-4 flex border-b border-neutral-700">
        <button
          className={`mr-2 px-3 py-1 text-xs ${
            colorMode === "palette"
              ? "border-b-2 border-blue-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => handleModeChange("palette")}
        >
          팔레트
        </button>
        <button
          className={`px-3 py-1 text-xs ${
            colorMode === "slider"
              ? "border-b-2 border-blue-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => handleModeChange("slider")}
        >
          슬라이더
        </button>
      </div>

      {/* 색상 선택 영역 */}
      <div className="mb-4 rounded-md border border-neutral-700 bg-neutral-800 p-3">
        {/* 팔레트 모드 */}
        {colorMode === "palette" && (
          <div>
            <div className="relative">
              <canvas
                ref={palettePickerRef}
                width={150}
                height={150}
                className="cursor-crosshair"
                onMouseDown={handlePaletteMouseDown}
              />
              {/* 컬러 인디케이터 */}
              <div
                className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
                style={{
                  left: `${(palettePos.x / 100) * 150 - 2}px`,
                  top: `${(palettePos.y / 100) * 150 - 2}px`,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                  background: brushProps.color,
                }}
              ></div>
            </div>
            <div className="mt-2">
              <canvas
                ref={hueSliderRef}
                width={150}
                height={10}
                className="cursor-ew-resize"
                onMouseDown={handleHueMouseDown}
              />
            </div>
          </div>
        )}

        {/* 슬라이더 모드 */}
        {colorMode === "slider" && (
          <div className="space-y-3">
            {/* 휴 슬라이더 */}
            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-xs text-gray-300">색상 (H)</span>
                <span className="text-xs text-gray-300">
                  {Math.round(hue)}°
                </span>
              </div>
              <div className="relative">
                <canvas
                  ref={hueSliderRef}
                  width={220}
                  height={12}
                  className="cursor-ew-resize"
                  onMouseDown={handleHueMouseDown}
                />
              </div>
            </div>

            {/* 채도 슬라이더 */}
            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-xs text-gray-300">채도 (S)</span>
                <span className="text-xs text-gray-300">
                  {Math.round(saturation)}%
                </span>
              </div>
              <div
                className="relative h-3 w-full rounded-full"
                style={{
                  background: `linear-gradient(to right, 
                  ${(() => {
                    const rgb1 = hsvToRgb(hue, 0, value);
                    return rgbToHex(rgb1.r, rgb1.g, rgb1.b);
                  })()}, 
                  ${(() => {
                    const rgb2 = hsvToRgb(hue, 100, value);
                    return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
                  })()})`,
                }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={saturation}
                  className="absolute h-3 w-full cursor-pointer appearance-none rounded-full bg-transparent"
                  onChange={(e) => {
                    const newS = Number(e.target.value);
                    setSaturation(newS);
                    setpalettePos({
                      x: newS,
                      y: palettePos.y,
                    });
                  }}
                />
              </div>
            </div>

            {/* 명도 슬라이더 */}
            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-xs text-gray-300">명도 (V)</span>
                <span className="text-xs text-gray-300">
                  {Math.round(value)}%
                </span>
              </div>
              <div
                className="relative h-3 w-full rounded-full"
                style={{
                  background: `linear-gradient(to right, 
                  ${(() => {
                    const rgb1 = hsvToRgb(hue, saturation, 0);
                    return rgbToHex(rgb1.r, rgb1.g, rgb1.b);
                  })()}, 
                  ${(() => {
                    const rgb2 = hsvToRgb(hue, saturation, 100);
                    return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
                  })()})`,
                }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  className="absolute h-3 w-full cursor-pointer appearance-none rounded-full bg-transparent"
                  onChange={(e) => {
                    setValue(Number(e.target.value));
                    setpalettePos({
                      x: palettePos.x,
                      y: 100 - Number(e.target.value),
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HSV 값 표시 */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded border border-neutral-700 bg-neutral-800 p-2">
          <div className="mb-1 text-xs text-gray-400">H</div>
          <div className="text-center text-xs font-medium text-white">
            {Math.round(hue)}°
          </div>
        </div>
        <div className="rounded border border-neutral-700 bg-neutral-800 p-2">
          <div className="mb-1 text-xs text-gray-400">S</div>
          <div className="text-center text-xs font-medium text-white">
            {Math.round(saturation)}%
          </div>
        </div>
        <div className="rounded border border-neutral-700 bg-neutral-800 p-2">
          <div className="mb-1 text-xs text-gray-400">V</div>
          <div className="text-center text-xs font-medium text-white">
            {Math.round(value)}%
          </div>
        </div>
      </div>

      {/* 기본 색상 팔레트 */}
      <div className="mb-3">
        <h4 className="mb-2 text-xs font-medium text-white">기본 색상</h4>
        <div className="grid grid-cols-8 gap-1.5">
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
        <div className="mb-2">
          <h4 className="text-xs font-medium text-white">입력값</h4>
        </div>

        <div className="rounded-md border border-neutral-700 bg-neutral-800 p-2">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 cursor-pointer rounded border border-neutral-600 transition hover:border-white"
              style={{ backgroundColor: customColor }}
            ></div>
            <input
              type="text"
              className="h-8 w-full rounded border border-neutral-600 bg-neutral-800 px-2 text-sm text-neutral-100 outline-none"
              value={customColor}
              onChange={handleHexInputChange}
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
