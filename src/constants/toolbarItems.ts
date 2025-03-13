import {
  BiSolidSelectMultiple,
  BiPencil,
  BiBrush,
  BiEraser,
  BiText,
  BiCommentDetail,
} from "react-icons/bi";
import { FaMousePointer } from "react-icons/fa";
import { HiOutlineZoomIn, HiOutlineZoomOut } from "react-icons/hi";
import { FaHand } from "react-icons/fa6";
import { IoBrush } from "react-icons/io5";
import { ToolbarItem } from "~/types/types";

// 상수 정의
export const ToolbarItemIDs = {
  SELECT: "select",
  ZOOM_IN: "zoomin",
  ZOOM_OUT: "zoomout",
  HAND: "hand",
  PEN: "pen",
  BRUSH: "brush",
  ERASER: "eraser",
  TEXT: "text",
  COMMENT: "comment",
};

// 툴바 항목 정의
export const toolbarItems: ToolbarItem[] = [
  {
    id: ToolbarItemIDs.SELECT,
    label: "선택",
    icon: FaMousePointer,
    hasSubItems: true,
    subItems: [
      {
        id: ToolbarItemIDs.SELECT,
        label: "선택",
        icon: FaMousePointer,
      },
      {
        id: ToolbarItemIDs.HAND,
        label: "이동",
        icon: FaHand,
      },
    ],
  },
  {
    id: ToolbarItemIDs.ZOOM_IN,
    label: "확대",
    icon: HiOutlineZoomIn,
    hasSubItems: true,
    subItems: [
      {
        id: ToolbarItemIDs.ZOOM_IN,
        label: "확대",
        icon: HiOutlineZoomIn,
      },
      {
        id: ToolbarItemIDs.ZOOM_OUT,
        label: "축소",
        icon: HiOutlineZoomOut,
      },
    ],
  },
  // {
  //   id: ToolbarItemIDs.PEN,
  //   label: "Pen",
  //   icon: BiPencil,
  // },
  {
    id: ToolbarItemIDs.BRUSH,
    label: "Brush",
    icon: IoBrush,
  },
  {
    id: ToolbarItemIDs.ERASER,
    label: "Eraser",
    icon: BiEraser,
  },
  {
    id: ToolbarItemIDs.TEXT,
    label: "Text",
    icon: BiText,
  },
  {
    id: ToolbarItemIDs.COMMENT,
    label: "Comment",
    icon: BiCommentDetail,
  },
];
