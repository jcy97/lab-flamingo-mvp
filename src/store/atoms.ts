import { atom } from "jotai";
import { Project } from "~/schemas";
import { Canvas, Page } from "@prisma/mongodb-client";

type PageWithCanvases = Page & {
  page_canvases: Canvas[];
};

// 프로젝트 로딩 상태 관리
export const projectLoadingAtom = atom<Boolean>(true);
// 프로젝트 전체 리스트
export const projectsAtom = atom<Project[]>([]);

// 현재 접속 프로젝트
export const currentProjectAtom = atom<Project>();

// 현재 접속 프로젝트의 페이지 및 캔버스 정보
export const pageCanvasInformationAtom = atom<PageWithCanvases[]>([]);

//현재 사용자가 선택한 페이지
export const currentPageAtom = atom<PageWithCanvases>();

//현재 사용자가 선택한 페이지의 캔버스 리스트
export const currentCanvasesAtom = atom<Canvas[]>([]);

//현재 사용자가 선택한 캔버스
export const currentCanvasAtom = atom<Canvas>();
