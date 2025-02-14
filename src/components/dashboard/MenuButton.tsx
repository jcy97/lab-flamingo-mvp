import React from "react";
import { IconType } from "react-icons/lib";

interface MenuButtonProps {
  label: string;
  isActive: boolean;
  Icon: IconType;
}

const MenuButton: React.FC<MenuButtonProps> = ({ label, isActive, Icon }) => {
  return (
    <div
      className={`flex h-[45px] w-[200px] items-center justify-start rounded-xl ${isActive ? "bg-primary-500" : "bg-transparent"} text-center duration-300 hover:cursor-pointer`}
    >
      <Icon className="mx-4 text-neutral-100" size={20} />
      <p className="text-neutral-100">{label}</p>
    </div>
  );
};

export default MenuButton;
