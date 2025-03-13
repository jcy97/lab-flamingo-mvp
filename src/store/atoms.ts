import { atom } from "jotai";
import { Project } from "~/schemas";
import { Canvas, Page, Layer, LayerContent } from "@prisma/mongodb-client";
import { CurrentConnectedUser } from "~/types/types";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import Konva from "konva";
import { FOCUS_AREA } from "~/constants/focus";

export type PageWithCanvases = Page & {
  page_canvases: CanvasWithLayers[];
};
export type CanvasWithLayers = Canvas & {
  canvas_layers: LayerWithContents[];
};
export type LayerWithContents = Layer & {
  layer_content: LayerContent;
};
// 전역 로딩 상태 관리
export const isLoadingAtom = atom<Boolean>(false);

// 스케일 팩터
export const scaleFactorAtom = atom(1);

// 프로젝트 로딩 상태 관리
export const projectLoadingAtom = atom<Boolean>(true);
// 프로젝트 전체 리스트
export const projectsAtom = atom<Project[]>([]);

//선택한 툴바 아이템
export const currentToolbarItemAtom = atom(ToolbarItemIDs.SELECT);

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
export const canvasLayersAtom = atom<Record<string, LayerWithContents[]>>({});

//현재 사용자가 선택한 캔버스
export const currentCanvasAtom = atom<CanvasWithLayers>();

//현재 사용자가 선택한 캔버스의 레이어 리스트
export const currentLayersAtom = atom<LayerWithContents[]>([]);

//현재 사용자가 선택한 레이어
export const currentLayerAtom = atom<LayerWithContents>();

// 다중 선택된 레이어 리스트
export const selectedLayersAtom = atom<LayerWithContents[]>([]);

// 레이어 ref 아톰
export const layerRefsMapAtom = atom<Map<string, Konva.Node>>(new Map());

// 레이어 ref를 추가하는 atom
export const addLayerRefAtom = atom(
  null,
  (get, set, { layerId, node }: { layerId: string; node: Konva.Node }) => {
    const currentMap = get(layerRefsMapAtom);
    const newMap = new Map(currentMap);
    newMap.set(layerId, node);
    set(layerRefsMapAtom, newMap);
  },
);

// 레이어 ref를 제거하는 atom
export const removeLayerRefAtom = atom(null, (get, set, layerId: string) => {
  const currentMap = get(layerRefsMapAtom);
  const newMap = new Map(currentMap);
  newMap.delete(layerId);
  set(layerRefsMapAtom, newMap);
});

// 특정 레이어의 ref를 가져오는 atom
export const getLayerRefAtom = atom((get) => (layerId: string) => {
  const refsMap = get(layerRefsMapAtom);
  return refsMap.get(layerId) || null;
});

//현재 프로젝트 접속 중인 사용자
export const currentConnectedUserAtom = atom<CurrentConnectedUser[]>([]);

// 페이지별 선택된 캔버스 ID를 저장하는 atom
// 페이지 ID를 키로, 캔버스 ID를 값으로 사용
export const pageSelectedCanvasMapAtom = atom<Record<string, string>>({});

// 캔버스별 선택된 레이어 ID를 저장하는 atom
export const canvasSelectedLayerMapAtom = atom<Record<string, string>>({});

// 브러시 속성 관리를 위한 아톰
export const brushPropertiesAtom = atom({
  color: "#000000", // 브러시 색상
  size: 5, // 브러시 크기 (픽셀)
  opacity: 1, // 브러시 불투명도 (0~1)
  smoothing: 0.2, // 브러시 부드러움 (0~1)
  pressure: true, // 압력 감지 활성화 여부
  blendMode: "normal", // 브러시 혼합 모드
  type: "round", // 브러시 유형 (round, square, texture)
  texture: null, // 텍스처 브러시용 이미지 URL
});

// 트랜스포머 표시 상태 관리
export const showTransformerAtom = atom<boolean>(false);

//현재 사용자가 포커싱한 영역
// PAGE: 페이지 영역, CANVAS: 캔버스 영역, DRAWING: 그림 영역, LAYER: 레이어 영역
export const currentFocusAreaAtom = atom<string>(FOCUS_AREA.DRAWING);

export const canvasObservingAtom = atom<boolean>(false);

//텍스트 레이어 관리
export const editingTextLayerIdAtom = atom<string | null>(null);
