"use client";
import React, { useState } from "react";
import Header from "./Header/Header";
// import DrawingList from "./DrawingList/DrawingList";

const RightSidebar: React.FC = () => {
  const [width, setWidth] = useState(240); // 초기 너비
  const [isResizing, setIsResizing] = useState(false); // 리사이징 상태 추가

  const handleMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    setIsResizing(true); // 리사이징 시작

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(
        Math.max(240, width + (startX - e.clientX)),
        700,
      ); // 최소 240px, 최대 700px
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false); // 리사이징 종료
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <aside
      className="fixed right-0 top-0 flex h-full select-none flex-col items-center bg-neutral-900"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute left-0 top-0 h-full cursor-ew-resize"
        onMouseDown={handleMouseDown}
        style={{ width: "5px" }} // 드래그 핸들 너비
      />
      {isResizing && (
        <style>
          {`
            body {
              cursor: ew-resize;
            }
          `}
        </style>
      )}
      <Header />
      {/* <DrawingList /> */}
    </aside>
  );
};

export default RightSidebar;
