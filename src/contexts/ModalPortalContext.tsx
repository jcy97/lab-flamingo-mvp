"use client";
import React, { createContext, useState, useContext, ReactNode } from "react";

// 모달/팝업 포탈 컨텍스트 타입 정의
type ModalPortalContextType = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  modalContent: ReactNode | null;
  setModalContent: (content: ReactNode) => void;
};

// 컨텍스트 생성
const ModalPortalContext = createContext<ModalPortalContextType | undefined>(
  undefined,
);

// 컨텍스트 훅
export const useModalPortal = () => {
  const context = useContext(ModalPortalContext);
  if (!context) {
    throw new Error(
      "useModalPortal은 ModalPortalProvider 내부에서만 사용할 수 있습니다.",
    );
  }
  return context;
};

// 프로바이더 컴포넌트
const ModalPortalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const value = {
    isOpen,
    openModal,
    closeModal,
    modalContent,
    setModalContent,
  };

  return (
    <ModalPortalContext.Provider value={value}>
      {children}
    </ModalPortalContext.Provider>
  );
};

export default ModalPortalProvider;
