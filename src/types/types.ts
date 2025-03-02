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

// 라인 데이터 인터페이스
export interface LineData {
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: "round" | "square";
  lineJoin: "round" | "miter";
  opacity: number;
}

// 실시간 브러시 상태를 나타내는 인터페이스
export interface RealtimeBrushState {
  userId: string;
  currentLine: LineData | null;
}
