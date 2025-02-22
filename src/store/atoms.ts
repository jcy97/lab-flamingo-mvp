import { atom } from "jotai";
import { Project } from "~/schemas";
import { Canvas, Page } from "@prisma/mongodb-client";

// 프로젝트 로딩 상태 관리
export const projectLoadingAtom = atom<Boolean>(true);
// 프로젝트 전체 리스트
export const projectsAtom = atom<Project[]>([]);

// 현재 접속 프로젝트
export const currentProjectAtom = atom<Project>();

// 현재 접속 프로젝트의 페이지 및 캔버스 정보
export const pageCanvasInformationAtom = atom<Page[]>([]);

//현재 사용자가 선택한 페이지
export const currentPageAtom = atom<Page>();

//현재 사용자가 선택안 캔버스
export const currentCanvasAtom = atom<Canvas>();
