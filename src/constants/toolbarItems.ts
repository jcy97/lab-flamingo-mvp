import {
  BiSolidSelectMultiple,
  BiPencil,
  BiBrush,
  BiEraser,
  BiText,
  BiCommentDetail,
} from "react-icons/bi";
import { FaMousePointer } from "react-icons/fa";
import { FaHand } from "react-icons/fa6";
import { IoBrush } from "react-icons/io5";
import { ToolbarItem } from "~/types/types";

export const toolbarItems: ToolbarItem[] = [
  {
    id: "select",
    label: "선택",
    icon: FaMousePointer,
    hasSubItems: true,
    subItems: [
      {
        id: "selct",
        label: "선택",
        icon: FaMousePointer,
      },
      {
        id: "hand",
        label: "이동",
        icon: FaHand,
      },
    ],
  },
  {
    id: "pen",
    label: "Pen",
    icon: BiPencil,
  },
  {
    id: "brush",
    label: "Brush",
    icon: IoBrush,
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: BiEraser,
  },
  {
    id: "text",
    label: "Text",
    icon: BiText,
  },
  {
    id: "comment",
    label: "Comment",
    icon: BiCommentDetail,
  },
];
