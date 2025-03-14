"use client";
import { useAtomValue, useAtom } from "jotai";
import { useEffect, useState, useRef } from "react";
import {
  currentCanvasAtom,
  currentToolbarItemAtom,
  scaleFactorAtom,
  currentLayersAtom,
  currentLayerAtom,
  canvasSelectedLayerMapAtom,
  selectedLayersAtom, // 다중 선택 레이어 atom
  showTransformerAtom,
  LayerWithContents,
  canvasLayersAtom,
  editingTextLayerIdAtom, // 트랜스포머 표시 상태 atom
} from "~/store/atoms";
import { Stage, Layer, Rect } from "react-konva";
import { ToolbarItemIDs } from "~/constants/toolbarItems";
import { Canvas as CanvasType, LayerContent } from "@prisma/mongodb-client";
import Konva from "konva";
import Brush from "./Layer/Brush"; // 수정된 Brush 컴포넌트
import BrushCursor from "./Layer/BurshCurosr";
import LayerTransformer from "./Layer/LayerTransformer"; // 새로 만든 트랜스포머 컴포넌트
import { addTextLayer, saveLayerContent } from "~/app/actions/yjs/layerYjs";
import { useSession } from "next-auth/react";
import UserMousePointers from "~/components/common/user/UserMousePointers";
import {
  SizeInfo,
  TextObject,
  Transform,
  TransformableLayer,
} from "~/types/types";
import TextEdit from "./Layer/TextEdit";
import TextLayer from "./Layer/TextLayer";

// Define Canvas with Layers type
export interface CanvasWithLayers extends CanvasType {
  canvas_layers: LayerWithContents[];
}

// 최소 및 최대 스케일 값 정의
const MIN_SCALE = 0.1; // 최소 스케일 (10%)
const MAX_SCALE = 2; // 최대 스케일 (200%)
const ZOOM_IN_FACTOR = 1.2; // 줌 인 시 20% 증가
const ZOOM_OUT_FACTOR = 0.8; // 줌 아웃 시 20% 감소

const WHEEL_ZOOM_SENSITIVITY = 0.05;

const Canvas: React.FC = () => {
  const { data: user } = useSession();

  const currentCanvas = useAtomValue(currentCanvasAtom) as
    | CanvasWithLayers
    | undefined;
  const [currentLayers, setCurrentLayers] = useAtom(currentLayersAtom);
  const [currentLayer, setCurrentLayer] = useAtom(currentLayerAtom);
  const [selectedLayers, setSelectedLayers] = useAtom(selectedLayersAtom);
  const [showTransformer, setShowTransformer] = useAtom(showTransformerAtom);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [currentToolbarItem, setCurrentToolbarItem] = useAtom(
    currentToolbarItemAtom,
  );
  const [scaleFactor, setScaleFactor] = useAtom(scaleFactorAtom);
  const [canvasSelectedLayerMap, setCanvasSelectedLayerMap] = useAtom(
    canvasSelectedLayerMapAtom,
  );

  const [canvasLayers, setCanvasLayers] = useAtom(canvasLayersAtom);

  // 캔버스 위치 상태
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [recentlyFinishedSpacebarDrag, setRecentlyFinishedSpacebarDrag] =
    useState<boolean>(false);

  // 임시 모드 상태
  const [temporaryZoomIn, setTemporaryZoomIn] = useState<boolean>(false);
  const [temporaryZoomOut, setTemporaryZoomOut] = useState<boolean>(false);

  // Stage와 컨테이너에 대한 참조
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 트랜스포머 관련 상태
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [isClickInsideTransformer, setIsClickInsideTransformer] =
    useState<boolean>(false);

  // 레이어 크기 및 위치 정보 캐싱
  const [layerSizeInfo, setLayerSizeInfo] = useState<Record<string, SizeInfo>>(
    {},
  );

  // 노드 드래그 관련 상태
  const [isNodeDragging, setIsNodeDragging] = useState<boolean>(false);

  // 텍스트 레이어 관련 상태
  const [editingTextLayer, setEditingTextLayer] =
    useState<LayerWithContents | null>(null);

  const [editingTextLayerId, setEditingTextLayerId] = useAtom(
    editingTextLayerIdAtom,
  );
  // 노드 드래그 이벤트 감지
  useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      const handleNodeDragStart = () => {
        setIsNodeDragging(true);
      };
      const handleNodeDragEnd = () => {
        setIsNodeDragging(false);
      };
      container.addEventListener("nodeDragStart", handleNodeDragStart);
      container.addEventListener("nodeDragEnd", handleNodeDragEnd);
      return () => {
        container.removeEventListener("nodeDragStart", handleNodeDragStart);
        container.removeEventListener("nodeDragEnd", handleNodeDragEnd);
      };
    }
  }, [stageRef.current]);

  // 윈도우 크기에 맞게 초기 스케일 조정하는 함수
  const adjustInitialScale = (): void => {
    if (!currentCanvas || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // 화면 가장자리에 여백을 주기 위한 패딩 값
    const padding = 120;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    // 너비와 높이에 대한 스케일 팩터 계산
    const widthScale = availableWidth / currentCanvas.width;
    const heightScale = availableHeight / currentCanvas.height;

    // 캔버스가 완전히 화면에 들어갈 수 있도록 더 작은 스케일 값 사용
    const newScale = Math.min(widthScale, heightScale, 1);

    // 스케일이 1보다 작을 때만 적용 (축소만 적용, 확대는 안 함)
    if (newScale < 1) {
      setScaleFactor(newScale);
    } else {
      setScaleFactor(1);
    }

    // 초기 위치도 중앙으로 설정
    setPosition({ x: 0, y: 0 });
  };

  // 스케일 변경 함수 - 모든 줌 작업에 사용
  const changeScale = (newScale: number): void => {
    // MIN_SCALE과 MAX_SCALE 사이로 제한
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    setScaleFactor(clampedScale);
  };

  // 레이어 업데이트 핸들러
  const handleLayerUpdate = (layerId: string, data: LayerContent): void => {
    // 서버에 데이터 저장하기 전에 브러시 업데이트가 현재 레이어에 제대로 적용되도록 확인
    if (currentLayer?.id === layerId || selectedLayerId === layerId) {
      // 브러시 업데이트가 현재 레이어에 적용되었음을 확인 (상태 갱신)
      const updatedLayers = currentLayers.map((layer) => {
        if (layer.id === layerId) {
          return {
            ...layer,
            layer_content: data,
          };
        }
        return layer;
      });
    }

    // 서버에 데이터 저장
    saveLayerContent(currentCanvas!.id, layerId, data, user!);
  };

  // 레이어 크기 변경 핸들러
  const handleLayerSizeChange = (layerId: string, newSize: SizeInfo) => {
    // 크기 정보 캐싱
    setLayerSizeInfo((prev) => ({
      ...prev,
      [layerId]: newSize,
    }));

    // 현재 선택된 레이어 찾기
    const layer = currentLayers.find((l) => l.id === layerId);
    if (!layer || !layer.layer_content) return;

    // 레이어 콘텐츠 업데이트
    const updatedContent = {
      ...layer.layer_content,
      transform: {
        x: newSize.x,
        y: newSize.y,
        rotation: newSize.rotation,
        scaleX: newSize.scaleX,
        scaleY: newSize.scaleY,
      },
    };

    handleLayerUpdate(layerId, updatedContent);
  };

  const keepMultiLayerSelect = (layers: TransformableLayer[]) => {
    setTimeout(() => {
      if (layers.length > 0) {
        // 선택된 레이어 유지
        setSelectedLayers([...layers]);

        // 트랜스포머 표시 상태 유지
        setShowTransformer(true);

        // 트랜스포머 업데이트
        if (transformerRef.current) {
          const nodesToAttach: Konva.Node[] = [];

          // 선택된 레이어의 노드들 찾기
          layers.forEach((layer) => {
            const node = stageRef.current?.findOne(`#${layer.id}`);
            if (node) {
              nodesToAttach.push(node);
            }
          });

          // 트랜스포머에 노드 다시 연결
          if (nodesToAttach.length > 0) {
            transformerRef.current.nodes(nodesToAttach);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }
      }
    }, 10);
  };

  // 트랜스포머 토글 함수
  const toggleTransformer = () => {
    setShowTransformer(!showTransformer);
  };

  // 트랜스포머 끄기 함수
  const hideTransformer = () => {
    if (showTransformer) {
      setShowTransformer(false);

      // 트랜스포머 비활성화 시 모든 노드의 이벤트 리스너 제거
      if (stageRef.current) {
        // 모든 선택된 레이어 노드에서 이벤트 리스너 제거
        selectedLayers.forEach((layer) => {
          const node = stageRef.current?.findOne(`#${layer.id}`);
          if (node) {
            node.draggable(false);
            node.off("dragstart");
            node.off("dragend");
            node.off("dragmove");
          }
        });

        // 스테이지 리드로우
        stageRef.current.batchDraw();
      }

      // 선택 레이어 초기화
      setSelectedLayers([]);
    }
  };

  // 클릭이 트랜스포머 내부인지 확인하는 함수
  const checkIfClickInsideTransformer = (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!showTransformer || !stageRef.current || !transformerRef.current) {
      return false;
    }

    // 클릭 좌표를 스테이지 좌표로 변환
    const stage = stageRef.current;
    const point = stage.getPointerPosition();

    if (!point) return false;

    // 트랜스포머의 경계 가져오기
    const transformer = transformerRef.current;
    const boundingBox = transformer.getClientRect();

    // 클릭 좌표가 경계 내부인지 확인
    const isInside =
      point.x >= boundingBox.x &&
      point.x <= boundingBox.x + boundingBox.width &&
      point.y >= boundingBox.y &&
      point.y <= boundingBox.y + boundingBox.height;

    setIsClickInsideTransformer(isInside);
    return isInside;
  };

  // 클릭 이벤트 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    // 임시 확대 모드가 활성화된 경우
    if (temporaryZoomIn) {
      // 새 스케일 계산 (20% 증가)
      changeScale(scaleFactor * ZOOM_IN_FACTOR);
      return;
    }

    // 임시 축소 모드가 활성화된 경우
    if (temporaryZoomOut) {
      // 새 스케일 계산 (20% 감소)
      changeScale(scaleFactor * ZOOM_OUT_FACTOR);
      return;
    }

    // 트랜스포머 활성화 상태에서 바깥 영역 클릭 처리
    if (showTransformer) {
      // 클릭이 트랜스포머 내부인지 확인
      const isInside = checkIfClickInsideTransformer(e);

      // 트랜스포머 바깥쪽 클릭 시 트랜스포머 숨기기
      if (!isInside) {
        hideTransformer();
        return;
      }
    }

    // 기존 줌 툴바 기능
    // ZOOM_IN이 선택된 경우
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) {
      // 새 스케일 계산 (20% 증가)
      changeScale(scaleFactor * ZOOM_IN_FACTOR);
    }
    // ZOOM_OUT이 선택된 경우
    else if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) {
      // 새 스케일 계산 (20% 감소)
      changeScale(scaleFactor * ZOOM_OUT_FACTOR);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    // 스페이스바 쿨다운 기간 중 휠 이벤트 무시
    if (recentlyFinishedSpacebarDrag) {
      return;
    }
    // 스테이지 참조가 없으면 리턴
    if (!stageRef.current) return;

    // ctrl 키와 함께 사용되는 경우 핀치 제스처로 간주 (맥북)
    const isPinchGesture = e.ctrlKey || e.metaKey;

    // 기본 감도 설정
    let sensitivity = WHEEL_ZOOM_SENSITIVITY;

    // 핀치 제스처인 경우 더 낮은 감도 사용
    if (isPinchGesture) {
      sensitivity = sensitivity * 0.5; // 핀치 제스처에 대해 감도 줄임
    }

    // deltaY 값에 따라 스케일 조정 (부드러운 변화를 위해 작은 값 사용)
    // 음수 deltaY는 확대, 양수 deltaY는 축소
    const zoomFactor = 1 - e.deltaY * sensitivity;

    // 현재 스케일에 조정 값 적용 (MIN_SCALE과 MAX_SCALE 사이로 제한)
    const newScale = Math.min(
      Math.max(scaleFactor * zoomFactor, MIN_SCALE),
      MAX_SCALE,
    );

    // 스케일 변경 - 경계 제약 없음
    setScaleFactor(newScale);
  };

  // 마우스 다운 이벤트 핸들러 - 드래그 시작
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (showTransformer) {
      return;
    }
    // 임시 확대/축소 모드일 경우 드래그 방지
    if (temporaryZoomIn || temporaryZoomOut) {
      return;
    }

    // 핸드 툴이 선택되었거나 스페이스 키가 눌렸을 때만 드래그 가능
    if (currentToolbarItem === ToolbarItemIDs.HAND || isSpacePressed) {
      setIsDragging(true);
      setLastPointerPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  // 마우스 이동 이벤트 핸들러 - 드래그 중
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isDragging) return;

    let newX = position.x + (e.clientX - lastPointerPosition.x);
    let newY = position.y + (e.clientY - lastPointerPosition.y);

    const parentX = containerRef.current?.clientWidth ?? 0;
    const parentY = containerRef.current?.clientHeight ?? 0;

    if (newX > parentX / 2) {
      newX = parentX / 2;
    }
    if (newX < -parentX / 2) {
      newX = -parentX / 2;
    }
    if (newY > parentY / 2) {
      newY = parentY / 2;
    }
    if (newY < -parentY / 2) {
      newY = -parentY / 2;
    }

    // 위치 설정
    setPosition({
      x: newX,
      y: newY,
    });

    setLastPointerPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };
  // 마우스 업 이벤트 핸들러 - 드래그 종료
  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  // 마우스가 컨테이너를 벗어났을 때 드래그 종료
  const handleMouseLeave = (): void => {
    setIsDragging(false);
  };

  // 키보드 이벤트 핸들러 - 스페이스 키 감지 및 단축키 처리
  useEffect(() => {
    // 현재 활성화된 키의 상태를 관리하기 위한 객체
    const activeKeys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent): void => {
      // 키 상태 업데이트
      activeKeys[e.code] = true;

      // Ctrl + T 키 감지하여 트랜스포머 토글
      if (e.ctrlKey && e.code === "KeyT") {
        e.preventDefault(); // 기본 동작 방지
        e.stopPropagation(); // 버블링 방지
        toggleTransformer();
        return;
      }

      // 트랜스포머 활성화 상태에서 Enter나 Esc 키 처리
      if (showTransformer && (e.code === "Enter" || e.code === "Escape")) {
        e.preventDefault();
        hideTransformer();
        return;
      }

      // 스페이스 키 처리
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        setIsSpacePressed(true);
      }
      // B 키를 눌렀을 때 브러시 도구 선택
      if (e.code === "KeyB" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.BRUSH);
      }
      // V 키를 눌렀을 때 선택 도구 선택
      if (e.code === "KeyV" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.SELECT);
      }
      // V 키를 눌렀을 때 선택 도구 선택
      if (e.code === "KeyE" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.ERASER);
      }
      // T 키를 눌렀을 때 텍스트 도구 선택
      if (e.code === "KeyT" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setCurrentToolbarItem(ToolbarItemIDs.TEXT);
      }

      // Windows: Ctrl+Space, macOS: 스포트라이트 충돌 방지를 위해 Ctrl+Space로 통일
      // 임시 확대 모드 활성화
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        setTemporaryZoomIn(true);
        setTemporaryZoomOut(false);
      }

      // Windows/macOS 모두: Alt/Option + Space: 임시 축소 모드 활성화
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        setTemporaryZoomOut(true);
        setTemporaryZoomIn(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      // 키 상태 업데이트
      activeKeys[e.code] = false;

      // 키를 뗐을 때 임시 모드 해제
      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        setTemporaryZoomIn(false);
      }

      if (e.code === "AltLeft" || e.code === "AltRight") {
        setTemporaryZoomOut(false);
      }

      if (e.code === "Space") {
        setIsSpacePressed(false);
        setTemporaryZoomIn(false);
        setTemporaryZoomOut(false);

        // 스페이스바 뗀 후 쿨다운 활성화
        setRecentlyFinishedSpacebarDrag(true);

        // 짧은 지연 후 쿨다운 해제 (300ms)
        setTimeout(() => {
          setRecentlyFinishedSpacebarDrag(false);
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [showTransformer]);

  // 텍스트 레이어 클릭 처리 함수
  const handleTextLayerClick = (layer: LayerWithContents) => {
    if (layer.type === "TEXT") {
      setEditingTextLayer(layer);
      setCurrentLayer(layer);
      setEditingTextLayerId(layer.id);
    }
  };

  // 텍스트 업데이트 처리 함수
  const handleTextUpdate = (layerId: string, textObject: TextObject) => {
    if (!currentCanvas) return;

    const layer = currentLayers.find((l) => l.id === layerId);
    if (!layer || !layer.layer_content) return;

    // 레이어 콘텐츠 업데이트
    const textData = layer.layer_content.text_data || {};
    const updatedContent = {
      ...layer.layer_content,
      text_data: {
        ...(textData as Record<string, any>),
        textObject: textObject,
      } as Record<string, any>, // JsonValue 호환되도록 타입 캐스팅
    };

    // 로컬 상태 업데이트
    const updatedLayers = currentLayers.map((l) => {
      if (l.id === layerId) {
        return {
          ...l,
          layer_content: updatedContent,
        };
      }
      return l;
    });

    setCurrentLayers(updatedLayers as LayerWithContents[]);
    setCanvasLayers({
      ...canvasLayers,
      [currentCanvas.id]: updatedLayers as LayerWithContents[],
    });

    return updatedContent; // 업데이트된 콘텐츠 반환 (서버 저장용)
  };

  // 텍스트 편집 종료 함수
  const handleFinishTextEditing = () => {
    if (editingTextLayer && currentCanvas && user) {
      const layer = currentLayers.find((l) => l.id === editingTextLayer.id);
      if (layer && layer.layer_content) {
        // 타입 호환성을 위한 캐스팅 추가
        const layerContent = {
          ...layer.layer_content,
          // 모든 JSON 필드를 명시적으로 Record<string, any>로 캐스팅
          normal_data: layer.layer_content.normal_data as Record<string, any>,
          shape_data: layer.layer_content.shape_data as Record<string, any>,
          text_data: layer.layer_content.text_data as Record<string, any>,
          image_data: layer.layer_content.image_data as Record<string, any>,
        };

        // 서버에 최종 데이터 저장
        saveLayerContent(currentCanvas.id, layer.id, layerContent, user);
        console.log("텍스트 레이어 서버 저장:", layer.id);
      }
    }

    setEditingTextLayer(null);
    setEditingTextLayerId(null);
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    setIsMounted(true);
    adjustInitialScale();
  }, [currentCanvas, containerRef]);

  // 윈도우 크기가 변경될 때 스케일 업데이트
  useEffect(() => {
    const handleResize = (): void => {
      adjustInitialScale();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentCanvas]);

  if (!currentCanvas || !isMounted) {
    return null;
  }

  // 현재 선택된 레이어 ID
  const selectedLayerId =
    currentLayer?.id ||
    (currentCanvas && canvasSelectedLayerMap[currentCanvas.id]);

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  // 트랜스포머에 표시할 레이어들 준비
  const getTransformableLayers = (): TransformableLayer[] => {
    if (!showTransformer) return [];

    // 다중 선택된 레이어가 있으면 해당 레이어들 반환
    if (selectedLayers.length > 0) {
      return selectedLayers.map((layer) => {
        return {
          ...layer,
          transform: layer.layer_content?.transform,
        } as TransformableLayer;
      });
    }

    // 다중 선택된 레이어가 없고 현재 레이어가 있으면 현재 레이어만 반환
    if (currentLayer) {
      return [
        {
          ...currentLayer,
          transform: currentLayer.layer_content?.transform,
        } as TransformableLayer,
      ];
    }

    return [];
  };

  // 마우스 커서 스타일 결정
  const getCursorStyle = (): string => {
    // 임시 확대/축소 모드 우선 처리
    if (temporaryZoomIn) return "zoom-in";
    if (temporaryZoomOut) return "zoom-out";

    // 기존 커서 스타일 처리
    if (isDragging) return "grabbing";
    if (isSpacePressed || currentToolbarItem === ToolbarItemIDs.HAND)
      return "grab";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_IN) return "zoom-in";
    if (currentToolbarItem === ToolbarItemIDs.ZOOM_OUT) return "zoom-out";

    // 브러시 도구 선택 시
    if (currentToolbarItem === ToolbarItemIDs.BRUSH) return "crosshair";
    if (currentToolbarItem === ToolbarItemIDs.TEXT) return "text";
    return "default";
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target instanceof Konva.Text) {
      const layerId = e.target.id();
      const textLayer = currentLayers.find(
        (layer) => layer.id === layerId && layer.type === "TEXT",
      );
      if (textLayer) {
        handleTextLayerClick(textLayer);
        setCurrentToolbarItem(ToolbarItemIDs.TEXT);
        return;
      }
    }

    // Stage를 클릭한 경우 (텍스트 객체가 아닌 빈 공간)
    if (e.target === e.target.getStage()) {
      if (editingTextLayer) {
        setEditingTextLayer(null);
      }

      const stage = e.target;
      const pointerPosition = stage.getPointerPosition();

      //Text 처리
      if (
        currentToolbarItem === ToolbarItemIDs.TEXT &&
        currentLayer?.type !== "TEXT" &&
        pointerPosition
      ) {
        const transform = stage.getAbsoluteTransform().copy().invert();
        const actualPosition = transform.point(pointerPosition);
        addTextLayer(
          currentCanvas.id,
          { x: actualPosition.x, y: actualPosition.y },
          user!,
        ).then((layer) => {
          if (layer) {
            console.log("텍스트 레이어 생성됨:", layer);
            console.log("텍스트 데이터:", layer.layer_content?.text_data);
            setEditingTextLayer(layer);
            console.log("편집 모드 활성화:", layer.id);
          }
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      style={{
        minHeight: "100%",
        minWidth: "100%",
        cursor: isSpacePressed
          ? isDragging
            ? "grabbing"
            : "grab"
          : currentToolbarItem === ToolbarItemIDs.BRUSH ||
              currentToolbarItem === ToolbarItemIDs.ERASER
            ? "none"
            : getCursorStyle(),
      }}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* 브러쉬 모드용 커서 */}
      <BrushCursor
        containerRef={containerRef}
        isSpacePressed={isSpacePressed}
      />

      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transformOrigin: "top left",
        }}
      >
        {/* 다른 사용자들의 마우스 포인터 - 스테이지와 같은 레벨에 배치 */}
        {currentCanvas && stageRef.current && (
          <UserMousePointers stageRef={stageRef} canvasId={currentCanvas.id} />
        )}

        {/* 배경 컨테이너 */}
        <div
          style={{
            width: currentCanvas.width * scaleFactor,
            height: currentCanvas.height * scaleFactor,
            background: isTransparent ? "" : currentCanvas.background,
            position: "relative",
          }}
          className={isTransparent ? "bg-checkerboard" : ""}
        >
          <Stage
            ref={stageRef}
            width={currentCanvas.width * scaleFactor}
            height={currentCanvas.height * scaleFactor}
            scaleX={scaleFactor}
            scaleY={scaleFactor}
            onMouseDown={(e) => e.evt.preventDefault()}
            onTouchStart={(e) => e.evt.preventDefault()}
            onClick={handleStageClick}
          >
            {/* 레이어 순서대로 렌더링 (인덱스 낮은 것부터) */}
            {currentLayers &&
              currentLayers.length > 0 &&
              [...currentLayers]
                .sort((a, b) => a.index - b.index)
                .map((layer) => {
                  // 각 레이어를 별도의 Konva Layer로 렌더링
                  if (layer.type === "NORMAL" && layer.layer_content) {
                    return (
                      <Layer
                        key={`layer-${layer.id}`}
                        visible={layer.visible}
                        imageSmoothingEnabled={true}
                        opacity={layer.opacity || 1}
                      >
                        <Brush
                          layer={layer}
                          isSelected={layer.id === selectedLayerId}
                          canvasWidth={currentCanvas.width}
                          canvasHeight={currentCanvas.height}
                          scale={scaleFactor}
                          onUpdate={handleLayerUpdate}
                          stageRef={stageRef}
                          isSpacePressed={isSpacePressed}
                          listening={
                            layer.id === selectedLayerId ||
                            selectedLayers.some((l) => l.id === layer.id)
                          }
                          onSizeChange={handleLayerSizeChange}
                        />
                      </Layer>
                    );
                  } else if (layer.type === "TEXT" && layer.layer_content) {
                    return (
                      <Layer
                        key={`layer-${layer.id}`}
                        visible={layer.visible}
                        imageSmoothingEnabled={true}
                        opacity={layer.opacity || 1}
                      >
                        <TextLayer
                          layer={layer}
                          stageRef={stageRef}
                          isSelected={layer.id === selectedLayerId}
                        />
                      </Layer>
                    );
                  }
                  return null;
                })}

            {/* 트랜스포머 레이어 (모든 레이어 위에 렌더링) */}
            {showTransformer && (
              <Layer>
                <LayerTransformer
                  ref={transformerRef}
                  selectedLayers={getTransformableLayers()}
                  onTransformEnd={handleLayerSizeChange}
                  stageRef={stageRef}
                  onKeepMultiLayerSelect={keepMultiLayerSelect}
                />
              </Layer>
            )}
          </Stage>
          {/* Canvas return 내부, Stage 바로 다음에 추가 */}
          {editingTextLayer && (
            <TextEdit
              layer={editingTextLayer}
              stageRef={stageRef}
              scale={scaleFactor}
              isActive={!!editingTextLayer}
              position={position} // 캔버스 위치 전달
              onTextChange={(newText) => {
                if (
                  editingTextLayer &&
                  editingTextLayer.layer_content?.text_data
                ) {
                  const textObj = (
                    editingTextLayer.layer_content.text_data as any
                  ).textObject;
                  if (textObj) {
                    handleTextUpdate(editingTextLayer.id, {
                      ...textObj,
                      text: newText,
                    });
                  }
                }
              }}
              onSave={(layerId, textObject) => {
                if (currentCanvas && user) {
                  // 업데이트된 콘텐츠 가져오기
                  const updatedContent = handleTextUpdate(layerId, textObject);
                  if (updatedContent) {
                    // 서버에 저장
                    saveLayerContent(
                      currentCanvas.id,
                      layerId,
                      updatedContent,
                      user,
                    );
                    console.log("텍스트 레이어 저장:", layerId);
                  }
                }
              }}
              onFinishEditing={handleFinishTextEditing}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
