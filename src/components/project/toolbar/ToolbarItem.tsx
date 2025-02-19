import React from "react";
import { BiChevronDown } from "react-icons/bi";
import { ToolbarItem as ToolbarItemType } from "~/types/types";
import { useClickOutside } from "~/hooks/useClickOutside";
import { IconType } from "react-icons";

interface ToolbarItemProps {
  item: ToolbarItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  selectedSubItemId?: string;
  onSubItemSelect: (parentId: string, subItemId: string) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}

const ToolbarItem: React.FC<ToolbarItemProps> = ({
  item,
  isSelected,
  onSelect,
  selectedSubItemId,
  onSubItemSelect,
  openDropdownId,
  setOpenDropdownId,
}) => {
  const dropdownRef = useClickOutside(() => {
    if (openDropdownId === item.id) {
      setOpenDropdownId(null);
    }
  });

  const handleDropdownToggle = () => {
    if (openDropdownId === item.id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(item.id);
    }
  };
  const getCurrentIcon = (): IconType => {
    if (item.subItems && selectedSubItemId) {
      const selectedSubItem = item.subItems.find(
        (subItem) => subItem.id === selectedSubItemId,
      );
      if (selectedSubItem) {
        return selectedSubItem.icon;
      }
    }
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
        <button onClick={() => onSelect(item.id)} className="flex items-center">
          <CurrentIcon className="h-5 w-5 text-neutral-100" />
        </button>

        {item.hasSubItems && (
          <button onClick={handleDropdownToggle}>
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
                  onSubItemSelect(item.id, subItem.id);
                  setOpenDropdownId(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-1 py-2 ${
                  selectedSubItemId === subItem.id
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
