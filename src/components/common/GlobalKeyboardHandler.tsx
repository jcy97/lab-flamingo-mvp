"use client";

import { useEffect } from "react";

export default function GlobalKeyboardHandler() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D 또는 Command+D 단축키 방지
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        // 여기에 실행할 동작을 추가할 수 있음
      }
    };

    // 전역 이벤트 리스너 등록
    document.addEventListener("keydown", handleKeyDown);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null; // UI가 없는 동작만을 위한 컴포넌트
}
