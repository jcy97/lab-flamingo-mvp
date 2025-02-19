"use client";
import React, { useState } from "react";
import ToolbarItem from "./ToolbarItem";
import { toolbarItems } from "~/constants/toolbarItems";

const Toolbar: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>("select");
  const [selectedSubItemId, setSelectedSubItemId] = useState<
    string | undefined
  >();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const handleSubItemSelect = (parentId: string, subItemId: string) => {
    setSelectedTool(parentId);
    setSelectedSubItemId(subItemId);
  };

  return (
    <div className="fixed bottom-6 left-1/2 flex h-[40px] w-[500px] -translate-x-1/2 transform items-center gap-4 rounded-xl bg-neutral-900 px-4">
      {toolbarItems.map((item) => (
        <ToolbarItem
          key={item.id}
          item={item}
          isSelected={selectedTool === item.id}
          onSelect={setSelectedTool}
          selectedSubItemId={
            selectedTool === item.id ? selectedSubItemId : undefined
          }
          onSubItemSelect={handleSubItemSelect}
          openDropdownId={openDropdownId}
          setOpenDropdownId={setOpenDropdownId}
        />
      ))}
    </div>
  );
};

export default Toolbar;
