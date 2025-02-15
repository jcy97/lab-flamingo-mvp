import React, { ReactNode } from "react";
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
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <div
        className={`relative w-full rounded-lg bg-neutral-700 p-6 shadow-xl ${getModalSize(
          size,
        )} z-50`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-100 hover:text-neutral-300"
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
