"use client";
import React, { useState, useEffect } from "react";
import ToolbarItem from "./ToolbarItem";
import { toolbarItems } from "~/constants/toolbarItems";
import { useAtom } from "jotai";
import { currentToolbarItemAtom } from "~/store/atoms";

const Toolbar: React.FC = () => {
  const [currentToolId, setCurrentToolId] = useAtom(currentToolbarItemAtom);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // UI 표시용 로컬 상태
  const [activeToolId, setActiveToolId] = useState<string>("select");

  // 현재 선택된 툴이 어떤 부모 툴에 속하는지 찾는 함수
  const findParentTool = (toolId: string) => {
    // 직접 툴바 아이템인지 확인
    const directTool = toolbarItems.find((item) => item.id === toolId);
    if (directTool) return toolId;

    // 서브아이템인 경우 부모 찾기
    for (const item of toolbarItems) {
      if (
        item.subItems &&
        item.subItems.some((subItem) => subItem.id === toolId)
      ) {
        return item.id;
      }
    }

    return "select"; // 기본값
  };

  // 전역 상태가 변경되면 UI 상태도 업데이트
  useEffect(() => {
    setActiveToolId(findParentTool(currentToolId));
  }, [currentToolId]);

  const handleToolSelect = (toolId: string) => {
    // 전역 상태 업데이트
    setCurrentToolId(toolId);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex h-[40px] w-[500px] -translate-x-1/2 transform items-center gap-4 rounded-xl bg-neutral-900 px-4">
      {toolbarItems.map((item) => (
        <ToolbarItem
          key={item.id}
          item={item}
          isSelected={activeToolId === item.id}
          selectedToolId={currentToolId}
          onSelect={handleToolSelect}
          openDropdownId={openDropdownId}
          setOpenDropdownId={setOpenDropdownId}
        />
      ))}
    </div>
  );
};
export default Toolbar;
