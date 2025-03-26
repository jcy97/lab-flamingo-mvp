"use client";
import { MdOutlineDevicesFold } from "react-icons/md";
import React, { useRef, useState, useEffect } from "react";
import PopupPortal from "~/components/common/PopupPotal";
import { FaHome, FaRegSave, FaSignOutAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { currentCanvasAtom, stageRefAtom } from "~/store/atoms";

const Header: React.FC = () => {
  // 메뉴 상태 관리
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const router = useRouter();

  // 스테이지 참조와 현재 캔버스 가져오기
  const stageRef = useAtomValue(stageRefAtom);
  const currentCanvas = useAtomValue(currentCanvasAtom);

  // 로고 클릭 핸들러
  const handleLogoClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 메뉴 위치 계산
    if (logoRef.current) {
      const rect = logoRef.current.getBoundingClientRect();
      // 로고 아래에 메뉴 위치시키기
      setMenuPosition({
        top: rect.bottom + 5,
        left: rect.left,
      });
    }

    // 메뉴 토글
    setMenuOpen((prev) => !prev);
  };

  // 메뉴 아이템 클릭 핸들러
  const handleMenuItemClick = (action: string) => {
    console.log(`${action} 메뉴 아이템 클릭됨`);
    setMenuOpen(false);

    // 각 액션에 따른 처리
    switch (action) {
      case "home":
        // 홈으로 이동 로직
        router.push("/dashboard/project");
        break;
      case "save":
        // 이미지 저장 로직
        exportCanvasToImage();
        break;
      default:
        break;
    }
  };

  // 캔버스를 이미지로 내보내는 함수
  const exportCanvasToImage = () => {
    if (!stageRef || !stageRef.current || !currentCanvas) {
      console.error("스테이지 또는 캔버스가 준비되지 않았습니다.");
      return;
    }

    try {
      const stage = stageRef.current;

      // 현재 스케일 저장
      const currentScale = {
        x: stage.scaleX(),
        y: stage.scaleY(),
      };

      // 스케일을 1로 설정하여 원본 크기로 내보내기
      stage.scale({ x: 1, y: 1 });

      // 고품질 PNG로 내보내기 (pixelRatio를 3으로 설정하여 고화질)
      const dataURL = stage.toDataURL({
        pixelRatio: 3,
        mimeType: "image/png",
        quality: 1,
        width: currentCanvas.width,
        height: currentCanvas.height,
      });

      // 원래 스케일로 복원
      stage.scale(currentScale);

      // 다운로드 링크 생성
      const link = document.createElement("a");
      link.download = `${currentCanvas.name || "캔버스"}_export.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("이미지가 성공적으로 내보내졌습니다.");
    } catch (error) {
      console.error("이미지 내보내기 중 오류 발생:", error);
    }
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex w-full flex-col justify-center gap-2 border-b border-neutral-700 px-2 py-3 text-left">
      <div className="flex w-full items-center justify-between">
        <img
          src="/side-logo.svg"
          alt="사이드 로고"
          className="hover:cursor-pointer"
          onClick={handleLogoClick}
          ref={logoRef}
        />
        <MdOutlineDevicesFold
          className="transform text-neutral-100 duration-300 hover:cursor-pointer"
          size={20}
        />
      </div>
      <p className="w-full border-none bg-transparent pl-1 text-sm font-bold text-neutral-100 outline-none">
        테스트
      </p>

      {/* 드롭다운 메뉴 */}
      <PopupPortal isOpen={menuOpen}>
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed z-[1000] w-36 rounded bg-neutral-800 shadow-lg"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col py-1">
              <button
                className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                onClick={() => handleMenuItemClick("home")}
              >
                <FaHome size={16} />
                <span>홈으로</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-700"
                onClick={() => handleMenuItemClick("save")}
              >
                <FaRegSave size={16} />
                <span>이미지 저장</span>
              </button>
            </div>
          </div>
        )}
      </PopupPortal>
    </div>
  );
};

export default Header;
