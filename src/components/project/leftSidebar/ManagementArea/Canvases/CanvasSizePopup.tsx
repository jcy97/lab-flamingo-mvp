import React, { useState, useEffect } from "react";

interface CanvasSizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (width: number, height: number) => void;
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

const CanvasSizePopup: React.FC<CanvasSizePopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [selectedPreset, setSelectedPreset] = useState<string>("Full HD");

  // 버튼 비활성화 여부 계산
  const isButtonDisabled = width <= 0 || height <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(width, height);
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

  // 팝업이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-neutral-100">
          캔버스 크기 설정
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
          <div className="mb-6">
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
          <div className="flex w-full justify-between gap-4">
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
              생성
            </button>
          </div>

          {isButtonDisabled && (
            <div className="mt-2 text-center text-xs text-red-400">
              가로와 세로 값은 0보다 커야 합니다.
            </div>
          )}

          {selectedPreset === "Full HD" && (
            <div className="mt-4 text-center text-xs text-neutral-400">
              <p>기본값: 1920 x 1080 (FHD)</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CanvasSizePopup;
