import { Session } from "next-auth";
import { IconType } from "react-icons";

export interface SubToolbarItem {
  id: string;
  label: string;
  icon: IconType;
}

export interface ToolbarItem {
  id: string;
  label: string;
  icon: IconType;
  hasSubItems?: boolean;
  subItems?: SubToolbarItem[];
}

export interface CurrentConnectedUser {
  socketId: string;
  user: Session;
}
