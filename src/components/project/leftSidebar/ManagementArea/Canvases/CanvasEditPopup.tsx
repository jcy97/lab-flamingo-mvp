"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CanvasEditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (width: number, height: number, backgroundColor: string) => void;
  mode: "create" | "edit"; // 생성 모드와 수정 모드 구분
  canvasData?: {
    id: string;
    name: string;
    width: number;
    height: number;
    background: string;
    page_id: string;
  };
  updateCanvas?: (
    pageId: string,
    canvasId: string,
    width: number,
    height: number,
    background: string,
  ) => void;
}

// 해상도 프리셋 정의
interface ResolutionPreset {
  name: string;
  width: number;
  height: number;
  description?: string;
}

const presets: ResolutionPreset[] = [
  { name: "사용자 정의", width: 0, height: 0 },
  { name: "HD", width: 1280, height: 720, description: "720p" },
  { name: "Full HD", width: 1920, height: 1080, description: "1080p" },
  { name: "QHD", width: 2560, height: 1440, description: "1440p" },
  { name: "4K UHD", width: 3840, height: 2160 },
  { name: "8K", width: 7680, height: 4320 },
  {
    name: "인스타그램 포스트",
    width: 1080,
    height: 1080,
    description: "정사각형",
  },
  { name: "모바일", width: 360, height: 640, description: "스마트폰" },
  { name: "태블릿", width: 768, height: 1024 },
  { name: "A4", width: 2480, height: 3508, description: "인쇄용 300DPI" },
];

const CanvasEditPopup: React.FC<CanvasEditPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode = "create",
  canvasData,
  updateCanvas,
}) => {
  const { data: session } = useSession();
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [selectedPreset, setSelectedPreset] = useState<string>("Full HD");
  const [backgroundColor, setBackgroundColor] = useState<string>("#FFFFFF");
  const [isTransparent, setIsTransparent] = useState<boolean>(false);

  // 캔버스 데이터가 있을 경우 초기값 설정
  useEffect(() => {
    if (mode === "edit" && canvasData) {
      setWidth(canvasData.width);
      setHeight(canvasData.height);

      // 배경색 처리
      if (canvasData.background === "TRANSPARENT") {
        setIsTransparent(true);
        setBackgroundColor("#FFFFFF"); // 기본 색상 설정
      } else {
        setIsTransparent(false);
        setBackgroundColor(canvasData.background);
      }

      // 프리셋 찾기
      const matchedPreset = presets.find(
        (p) => p.width === canvasData.width && p.height === canvasData.height,
      );
      setSelectedPreset(matchedPreset ? matchedPreset.name : "사용자 정의");
    }
  }, [mode, canvasData, isOpen]);

  // 버튼 비활성화 여부 계산
  const isButtonDisabled = width <= 0 || height <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 투명 배경인 경우 "TRANSPARENT" 전달, 아니면 현재 색상값 전달
    const bgColor = isTransparent
      ? "TRANSPARENT"
      : backgroundColor.toUpperCase();

    if (mode === "create") {
      // 생성 모드일 때는 onConfirm 호출
      onConfirm(width, height, bgColor);
    } else if (mode === "edit" && canvasData && updateCanvas && session) {
      // 수정 모드일 때는 updateCanvas 호출
      updateCanvas(canvasData.page_id, canvasData.id, width, height, bgColor);
    }

    onClose();
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);

    // 선택한 프리셋 찾기
    const preset = presets.find((p) => p.name === presetName);

    // 사용자 정의가 아니고 프리셋이 존재할 경우 값 설정
    if (preset && preset.name !== "사용자 정의") {
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  // 사용자가 입력 필드를 직접 수정할 때 프리셋을 '사용자 정의'로 변경
  const handleManualInput = () => {
    // 현재 선택된 프리셋의 값과 입력된 값이 다르면 '사용자 정의'로 변경
    const currentPreset = presets.find((p) => p.name === selectedPreset);
    if (
      currentPreset &&
      (currentPreset.width !== width || currentPreset.height !== height)
    ) {
      setSelectedPreset("사용자 정의");
    }
  };

  // 값이 변경되었을 때 0 이하의 값은 강제로 최소값 설정
  const validateAndSetWidth = (value: number) => {
    // 0이나 음수가 들어오면 기본값을 1로 설정
    const safeValue = value <= 0 ? 1 : value;
    setWidth(safeValue);
    handleManualInput();
  };

  const validateAndSetHeight = (value: number) => {
    // 0이나 음수가 들어오면 기본값을 1로 설정
    const safeValue = value <= 0 ? 1 : value;
    setHeight(safeValue);
    handleManualInput();
  };

  // 색상 변경 처리
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setBackgroundColor(newColor.toUpperCase());
  };

  // 수동 입력으로 색상 변경 처리
  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    // #으로 시작하지 않으면 추가
    if (!newColor.startsWith("#") && newColor.length > 0) {
      newColor = "#" + newColor;
    }
    // 유효한 HEX 색상 형식이면 적용
    if (
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor) ||
      newColor === "#"
    ) {
      setBackgroundColor(newColor.toUpperCase());
    }
  };

  // 투명 배경 토글
  const handleTransparentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTransparent(e.target.checked);
  };

  // 배경 클릭 시 팝업 닫기 (단, e.target이 배경일 경우에만)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 팝업이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className="w-96 rounded-lg bg-neutral-800 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-neutral-100">
          {mode === "create" ? "캔버스 크기 설정" : "캔버스 수정"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              프리셋
            </label>
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="w-full rounded-lg bg-neutral-700 p-2 text-neutral-100"
            >
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                  {preset.description ? ` (${preset.description})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              가로 (픽셀)
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => {
                validateAndSetWidth(Number(e.target.value));
              }}
              className="w-full rounded-lg bg-neutral-700 p-2 text-neutral-100"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              세로 (픽셀)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => {
                validateAndSetHeight(Number(e.target.value));
              }}
              className="w-full rounded-lg bg-neutral-700 p-2 text-neutral-100"
              min="1"
              required
            />
          </div>

          {/* 배경색 설정 영역 */}
          <div className="mb-2">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              배경색
            </label>

            <div className="mb-3 flex items-center">
              <input
                type="checkbox"
                id="transparent-bg"
                checked={isTransparent}
                onChange={handleTransparentToggle}
                className="mr-2 h-4 w-4 rounded border-neutral-300"
              />
              <label
                htmlFor="transparent-bg"
                className="text-sm text-neutral-300"
              >
                투명 배경
              </label>
            </div>

            <div className="flex items-center gap-3">
              {/* 색상 미리보기 */}
              <div
                className="h-10 w-10 rounded border border-neutral-600"
                style={{
                  backgroundColor: isTransparent
                    ? "transparent"
                    : backgroundColor,
                  backgroundImage: isTransparent
                    ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                    : "none",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "0 0, 5px 5px",
                  opacity: isTransparent ? 0.5 : 1,
                }}
              ></div>

              {/* 색상 선택기 */}
              <input
                type="color"
                value={backgroundColor}
                onChange={handleColorChange}
                disabled={isTransparent}
                className={`h-8 w-8 cursor-pointer rounded ${isTransparent ? "opacity-50" : ""}`}
              />

              {/* 색상 코드 입력 필드 */}
              <input
                type="text"
                value={
                  isTransparent ? "TRANSPARENT" : backgroundColor.toUpperCase()
                }
                onChange={handleColorInputChange}
                disabled={isTransparent}
                className={`w-full rounded-lg bg-neutral-700 p-2 text-neutral-100 ${isTransparent ? "opacity-50" : ""}`}
                maxLength={7}
              />
            </div>
          </div>

          <div className="mt-6 flex w-full justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-lg bg-neutral-600 py-2 text-neutral-100 hover:bg-neutral-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isButtonDisabled}
              className={`w-1/2 rounded-lg py-2 text-white ${
                isButtonDisabled
                  ? "cursor-not-allowed bg-neutral-500"
                  : "hover:bg-primary-600 bg-primary-500"
              }`}
            >
              {mode === "create" ? "생성" : "수정"}
            </button>
          </div>

          {isButtonDisabled && (
            <div className="mt-2 text-center text-xs text-red-400">
              가로와 세로 값은 0보다 커야 합니다.
            </div>
          )}

          {selectedPreset === "Full HD" && mode === "create" && (
            <div className="mt-4 text-center text-xs text-neutral-400">
              <p>기본값: 1920 x 1080 (FHD)</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CanvasEditPopup;
