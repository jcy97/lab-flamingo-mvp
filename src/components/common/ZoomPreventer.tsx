// components/ZoomPreventer.tsx
"use client";

import { useEffect } from "react";

const ZoomPreventer: React.FC = () => {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 아무것도 렌더링하지 않음
  return null;
};

export default ZoomPreventer;
