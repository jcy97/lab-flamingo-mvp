import React from "react";
import { BiChevronDown } from "react-icons/bi";
import { ToolbarItem as ToolbarItemType } from "~/types/types";
import { useClickOutside } from "~/hooks/useClickOutside";
import { IconType } from "react-icons";

interface ToolbarItemProps {
  item: ToolbarItemType;
  isSelected: boolean;
  selectedToolId: string;
  onSelect: (id: string) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}

const ToolbarItem: React.FC<ToolbarItemProps> = ({
  item,
  isSelected,
  selectedToolId,
  onSelect,
  openDropdownId,
  setOpenDropdownId,
}) => {
  const dropdownRef = useClickOutside(() => {
    if (openDropdownId === item.id) {
      setOpenDropdownId(null);
    }
  });

  const handleMainItemClick = () => {
    if (item.hasSubItems) {
      // 드롭다운 표시
      setOpenDropdownId(item.id === openDropdownId ? null : item.id);

      // 서브아이템이 있는 경우 첫 번째 서브아이템 선택
      if (
        item.subItems &&
        item.subItems.length > 0 &&
        item.id !== openDropdownId
      ) {
        onSelect(item.subItems[0]!.id);
      }
    } else {
      // 서브아이템이 없는 경우, 아이템 자체를 선택
      onSelect(item.id);
      setOpenDropdownId(null);
    }
  };

  // 현재 표시할 아이콘 결정
  const getCurrentIcon = (): IconType => {
    // 서브아이템이 있는 경우
    if (item.subItems) {
      // 현재 선택된 id가 이 아이템의 서브아이템인지 확인
      const selectedSubItem = item.subItems.find(
        (subItem) => subItem.id === selectedToolId,
      );
      if (selectedSubItem) {
        return selectedSubItem.icon;
      }
    }

    // 기본 아이콘
    return item.icon;
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex h-8 items-center rounded-lg px-2 transition-colors ${
          isSelected
            ? "bg-primary-500 hover:bg-primary-500"
            : "hover:bg-neutral-800"
        }`}
      >
        <button onClick={handleMainItemClick} className="flex items-center">
          <CurrentIcon className="h-5 w-5 text-neutral-100" />
        </button>

        {item.hasSubItems && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(item.id === openDropdownId ? null : item.id);
            }}
          >
            <BiChevronDown
              className={`h-3 w-3 text-neutral-100 transition-transform ${
                openDropdownId === item.id ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* 서브 툴바 드롭다운 */}
      {openDropdownId === item.id && item.subItems && (
        <div className="absolute bottom-full left-0 mb-2 h-auto w-32 rounded-lg bg-neutral-900 p-1 shadow-lg">
          {item.subItems.map((subItem) => {
            const SubIcon = subItem.icon;
            return (
              <button
                key={subItem.id}
                onClick={() => {
                  onSelect(subItem.id);
                  setOpenDropdownId(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 ${
                  selectedToolId === subItem.id
                    ? "bg-primary-500 hover:bg-primary-500"
                    : "hover:bg-neutral-800"
                }`}
              >
                <SubIcon className="h-5 w-5 text-neutral-100" />
                <span className="text-sm text-neutral-100">
                  {subItem.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToolbarItem;
