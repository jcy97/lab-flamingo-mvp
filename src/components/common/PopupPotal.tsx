"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PopupPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
}

const PopupPortal: React.FC<PopupPortalProps> = ({ children, isOpen }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 팝업이 열려있지 않으면 아무것도 렌더링하지 않음
  if (!isOpen || !mounted) return null;

  // document.body에 직접 렌더링
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {children}
    </div>,
    document.body,
  );
};

export default PopupPortal;
