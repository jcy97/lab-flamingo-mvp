import { RxDashboard } from "react-icons/rx";
import { IoMdSettings } from "react-icons/io";
import { IconType } from "react-icons/lib";

export interface MenuItem {
  label: string;
  path: string;
  icon: IconType;
}

const menuList: MenuItem[] = [
  { label: "프로젝트", path: "/dashboard/project", icon: RxDashboard },
  { label: "설정", path: "/dashboard/settings", icon: IoMdSettings },
];

export default menuList;
