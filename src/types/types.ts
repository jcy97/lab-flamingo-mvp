import { Session } from "next-auth";
import { IconType } from "react-icons";
import { LayerWithContents } from "~/store/atoms";

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
  bezier?: boolean;
  smoothing?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  globalCompositeOperation?:
    | "source-over"
    | "source-in"
    | "source-out"
    | "source-atop"
    | "destination-over"
    | "destination-in"
    | "destination-out"
    | "destination-atop"
    | "lighter"
    | "copy"
    | "xor"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity";
}

// 실시간 브러시 상태를 나타내는 인터페이스
export interface RealtimeBrushState {
  userId: string;
  currentLine: LineData | null;
}

// 변환 가능한 레이어 타입 정의 (Konva 객체가 필요한 정보들)
export interface TransformableLayer extends LayerWithContents {
  // 레이어의 변환 정보
  transform?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
}

// 객체 크기 정보 인터페이스
export interface SizeInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX?: number;
  scaleY?: number;
}

// Transform 객체 인터페이스 정의
export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
