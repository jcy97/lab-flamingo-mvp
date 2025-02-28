"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useModalPortal } from "~/contexts/ModalPortalContext";

const ModalPortal: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { isOpen, closeModal, modalContent } = useModalPortal();

  useEffect(() => {
    setMounted(true);

    // 모달이 열릴 때 body의 스크롤을 방지
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      // 컴포넌트 언마운트시 body 스크롤 복구
      document.body.style.overflow = "";
      setMounted(false);
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  if (!isOpen || !mounted || !modalContent) return null;

  // portal-root 요소에 렌더링
  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div onClick={(e) => e.stopPropagation()}>{modalContent}</div>
    </div>,
    portalRoot,
  );
};

export default ModalPortal;
