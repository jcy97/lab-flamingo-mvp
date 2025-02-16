import React, { ReactNode, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdropClick?: boolean;
}

const getModalSize = (size: ModalProps["size"]): string => {
  switch (size) {
    case "sm":
      return "max-w-sm";
    case "lg":
      return "max-w-lg";
    case "xl":
      return "max-w-xl";
    case "md":
    default:
      return "max-w-md";
  }
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnBackdropClick = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // 애니메이션이 끝난 후 렌더링 중지
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // transition-duration과 같은 값
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isAnimating ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with fade */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${isAnimating ? "bg-opacity-50" : "bg-opacity-0"}`}
      />

      {/* Modal content with scale and fade */}
      <div
        className={`relative w-full rounded-lg bg-neutral-700 p-6 shadow-xl ${getModalSize(size)} z-50 transform transition-all duration-200 ${isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-100 transition-colors duration-200 hover:text-neutral-300"
          aria-label="Close modal"
        >
          <IoMdClose size={20} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
