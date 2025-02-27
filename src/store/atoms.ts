import { atom } from "jotai";
import { Project } from "~/schemas";
import { Canvas, Page, Layer } from "@prisma/mongodb-client";
import { CurrentConnectedUser } from "~/types/types";

export type PageWithCanvases = Page & {
  page_canvases: CanvasWithLayers[];
};
export type CanvasWithLayers = Canvas & {
  canvas_layers: Layer[];
};
// 전역 로딩 상태 관리
export const isLoadingAtom = atom<Boolean>(false);

// 프로젝트 로딩 상태 관리
export const projectLoadingAtom = atom<Boolean>(true);
// 프로젝트 전체 리스트
export const projectsAtom = atom<Project[]>([]);

// 현재 접속 프로젝트
export const currentProjectAtom = atom<Project>();

// 현재 접속 프로젝트의 페이지 및 캔버스 정보
export const pageCanvasInformationAtom = atom<PageWithCanvases[]>([]);

// 페이지 리스트
export const pagesAtom = atom<Page[]>([]);

// 페이지별 캔버스 리스트
export const pageCanvasesAtom = atom<Record<string, CanvasWithLayers[]>>({});

// 페이지 변경 여부
export const pagesUpdatedAtom = atom<boolean>(false);

//현재 사용자가 선택한 페이지
export const currentPageAtom = atom<Page>();

//현재 사용자가 선택한 페이지의 캔버스 리스트
export const currentCanvasesAtom = atom<CanvasWithLayers[]>([]);

//캔버스별 레이어 리스트
export const canvasLayersAtom = atom<Record<string, Layer[]>>({});

//현재 사용자가 선택한 캔버스
export const currentCanvasAtom = atom<CanvasWithLayers>();

//현재 사용자가 선택한 캔버스의 레이어 리스트
export const currentLayersAtom = atom<Layer[]>([]);

//현재 사용자가 선택한 레이어
export const currentLayerAtom = atom<Layer>();

//현재 프로젝트 접속 중인 사용자
export const currentConnectedUserAtom = atom<CurrentConnectedUser[]>([]);

// 페이지별 선택된 캔버스 ID를 저장하는 atom
// 페이지 ID를 키로, 캔버스 ID를 값으로 사용
export const pageSelectedCanvasMapAtom = atom<Record<string, string>>({});

// 캔버스별 선택된 레이어 ID를 저장하는 atom (필요한 경우)
export const canvasSelectedLayerMapAtom = atom<Record<string, string>>({});
