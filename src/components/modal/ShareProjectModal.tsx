import { useAtomValue } from "jotai";
import { useState, useEffect } from "react";
import { currentProjectAtom } from "~/store/atoms";
import { FiCheck, FiCopy } from "react-icons/fi";

interface Props {
  onClose: () => void;
  level: number;
}

const ShareProjectModal: React.FC<Props> = ({ onClose, level }) => {
  const currentProject = useAtomValue(currentProjectAtom);
  const [isCopied, setIsCopied] = useState(false);

  // 환경에 따른 기본 URL 설정
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  // 전체 프로젝트 URL 생성
  const fullProjectUrl = currentProject?.url
    ? `${baseUrl}/project/${currentProject.url}`
    : "";

  // 클립보드에 URL 복사 함수
  const copyToClipboard = async () => {
    // 이미 복사 중이면 동작하지 않도록
    if (fullProjectUrl && !isCopied) {
      try {
        await navigator.clipboard.writeText(fullProjectUrl);
        setIsCopied(true);

        // 3초 후 복사 상태 초기화
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (err) {
        console.error("클립보드 복사 실패:", err);
      }
    }
  };

  return (
    <div className="text-neutral-100">
      <h2 className="mb-6 text-xl font-bold">공유</h2>

      <div className="mb-6">
        <div className="relative">
          <input
            readOnly
            type="text"
            value={fullProjectUrl}
            className="h-[45px] w-full rounded-lg border border-neutral-500 bg-neutral-700 p-2 pr-10 text-sm text-neutral-100 outline-none"
          />
          <button
            onClick={copyToClipboard}
            className="absolute right-3 top-1/2 -translate-y-1/2 overflow-hidden text-neutral-300 transition-colors hover:text-neutral-100"
            title="URL 복사하기"
          >
            <div className="relative h-5 w-5">
              {/* 복사 아이콘 */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  isCopied
                    ? "-translate-y-10 rotate-12 scale-0 transform"
                    : "translate-y-0 rotate-0 scale-100 transform"
                }`}
              >
                <FiCopy className="h-5 w-5" />
              </div>

              {/* 체크 아이콘 */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  isCopied
                    ? "translate-y-0 scale-110 transform"
                    : "translate-y-10 scale-0 transform"
                }`}
              >
                <FiCheck className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          링크를 복사해서 친구에게 공유하세요
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg bg-primary-500 px-4 py-2 duration-300 hover:bg-primary-700 disabled:bg-neutral-500"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default ShareProjectModal;
