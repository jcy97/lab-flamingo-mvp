"use client";
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Transformer, Group, Rect } from "react-konva";
import Konva from "konva";
import { TransformableLayer, SizeInfo } from "~/types/types";
import { useAtomValue } from "jotai";
import { currentLayerAtom, scaleFactorAtom } from "~/store/atoms";

interface LayerTransformerProps {
  selectedLayers: TransformableLayer[];
  onTransformEnd: (layerId: string, newSize: SizeInfo) => void;
  onKeepMultiLayerSelect: (layers: TransformableLayer[]) => void;
  stageRef: React.RefObject<Konva.Stage>;
}

const LayerTransformer = forwardRef<Konva.Transformer, LayerTransformerProps>(
  (
    { selectedLayers, onTransformEnd, onKeepMultiLayerSelect, stageRef },
    ref,
  ) => {
    const transformerRef = useRef<Konva.Transformer | null>(null);
    const groupRef = useRef<Konva.Group | null>(null);
    const invisibleRectRef = useRef<Konva.Rect | null>(null);
    const currentLayer = useAtomValue(currentLayerAtom);
    const [transformerBox, setTransformerBox] = useState({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

    // 노드의 원본 속성을 저장할 객체
    const originalNodeProps = useRef<
      Map<
        string,
        {
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          scaleX: number;
          scaleY: number;
        }
      >
    >(new Map());

    // 외부 ref를 내부 ref에 연결
    useImperativeHandle(ref, () => transformerRef.current!);

    // 트랜스포머의 크기와 위치를 업데이트하는 함수
    const updateTransformerBox = () => {
      if (!transformerRef.current) return;

      const transformer = transformerRef.current;
      const nodes = transformer.nodes();

      if (nodes.length === 0) return;

      // 모든 노드를 포함하는 경계 상자 계산
      const box = transformer.getClientRect();

      setTransformerBox({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });
    };

    useEffect(() => {
      if (!transformerRef.current || !stageRef.current || !groupRef.current)
        return;

      // 트랜스포머에 설정할 노드들
      const nodesToAttach: Konva.Node[] = [];

      // 원본 속성 맵 초기화
      originalNodeProps.current.clear();

      // 선택된 레이어가 여러 개인 경우
      if (selectedLayers && selectedLayers.length > 0) {
        // 스테이지에서 선택된 레이어의 노드들을 찾아서 배열에 추가
        selectedLayers.forEach((layer) => {
          const node = stageRef.current?.findOne(`#${layer.id}`);
          if (node) {
            // 노드를 draggable로 설정
            node.draggable(true);

            // 드래그 이벤트 핸들러 연결
            node.on("dragstart", handleDragStart);
            node.on("dragend", handleDragEnd);
            node.on("dragmove", handleDragMove);

            // 원본 속성 저장
            originalNodeProps.current.set(layer.id, {
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height(),
              rotation: node.rotation(),
              scaleX: node.scaleX(),
              scaleY: node.scaleY(),
            });

            nodesToAttach.push(node);
          }
        });
      }
      // 선택된 레이어가 없고 현재 레이어만 있는 경우
      else if (currentLayer?.id) {
        const node = stageRef.current.findOne(`#${currentLayer.id}`);
        if (node) {
          // 원본 draggable 상태 저장
          const originalDraggable = node.draggable();

          // 노드를 draggable로 설정
          node.draggable(true);

          node.on("dragstart", handleDragStart);
          node.on("dragend", handleDragEnd);
          node.on("dragmove", handleDragMove);

          // 원본 속성 저장
          originalNodeProps.current.set(currentLayer.id, {
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
          });

          nodesToAttach.push(node);
        }
      }

      // 노드들을 트랜스포머에 연결
      if (nodesToAttach.length > 0) {
        transformerRef.current.nodes(nodesToAttach);
        // 트랜스포머 박스 업데이트
        updateTransformerBox();
      } else {
        transformerRef.current.nodes([]);
        setTransformerBox({ x: 0, y: 0, width: 0, height: 0 });
      }

      // 트랜스포머 업데이트
      transformerRef.current.getLayer()?.batchDraw();

      // 클린업 함수: 언마운트 시 원래 draggable 상태로 복원
      return () => {
        if (stageRef.current) {
          // 원본 속성에 저장된 모든 노드에 대해
          originalNodeProps.current.forEach((props, layerId) => {
            const node = stageRef.current?.findOne(`#${layerId}`);
            if (node) {
              node.draggable(false);
              // 이벤트 리스너 제거
              node.off("dragstart");
              node.off("dragend");
              node.off("dragmove");
            }
          });
          // 변경사항 반영
          stageRef.current.batchDraw();
        }
      };
    }, [selectedLayers, currentLayer, stageRef]);

    // 트랜스포머의 변환 시작 시 호출
    const handleTransformStart = () => {
      // 노드의 원본 속성 저장
      const nodes = transformerRef.current?.nodes() || [];
      originalNodeProps.current.clear();

      nodes.forEach((node) => {
        originalNodeProps.current.set(node.id(), {
          x: node.x(),
          y: node.y(),
          width: node.width(),
          height: node.height(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        });
      });
    };

    // 트랜스포머의 변환 종료 시 호출
    const handleTransformEnd = () => {
      if (!transformerRef.current || !stageRef.current) return;

      const nodes = transformerRef.current.nodes();
      const stage = stageRef.current;

      // 단일 레이어 변환
      if (nodes) {
        nodes.forEach((node) => {
          const layerId = node.id();
          const original = originalNodeProps.current.get(layerId);

          if (!original) return;

          // 노드의 변환된 속성 가져오기
          const newScaleX = node.scaleX();
          const newScaleY = node.scaleY();
          const newRotation = node.rotation();

          // 스테이지 좌표계에서의 위치
          const nodePos = node.position();
          const adjustedSize: SizeInfo = {
            x: nodePos.x,
            y: nodePos.y,
            width: original.width,
            height: original.height,
            scaleX: newScaleX,
            scaleY: newScaleY,
            rotation: newRotation,
          };

          // 변경 사항을 콜백으로 전달
          onTransformEnd(layerId, adjustedSize);
        });
        onKeepMultiLayerSelect(selectedLayers);
      }
      // 트랜스포머 박스 업데이트
      updateTransformerBox();
      transformerRef.current.getLayer()?.batchDraw();
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const layerId = node.id();

      // 위치 정보 업데이트
      const nodePos = node.position();
      const original = originalNodeProps.current.get(layerId);

      if (!original) return;

      const adjustedSize: SizeInfo = {
        x: nodePos.x,
        y: nodePos.y,
        width: original.width,
        height: original.height,
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      };

      // 변경 사항을 콜백으로 전달
      onTransformEnd(layerId, adjustedSize);
      onKeepMultiLayerSelect(selectedLayers);

      // 트랜스포머 박스 업데이트
      updateTransformerBox();

      // 스테이지 리드로우
      if (stageRef.current) {
        stageRef.current.batchDraw();
      }
    };

    const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      // 커스텀 이벤트를 통해 캔버스에 드래그 시작을 알림
      if (stageRef.current) {
        const event = new CustomEvent("nodeDragStart");
        stageRef.current.container().dispatchEvent(event);
      }
    };

    // 드래그 중에도 UI 업데이트를 위한 핸들러 추가
    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (transformerRef.current) {
        transformerRef.current.update();
        transformerRef.current.getLayer()?.batchDraw();
        // 드래그 중에도 트랜스포머 박스 업데이트
        updateTransformerBox();
      }
    };

    // 트랜스포머 내부 영역 드래그 이벤트 처리
    const handleInvisibleRectDragStart = (
      e: Konva.KonvaEventObject<DragEvent>,
    ) => {
      e.evt.stopPropagation();
      e.cancelBubble = true;

      // 현재 선택된 노드들의 시작 위치 저장
      const nodes = transformerRef.current?.nodes() || [];
      nodes.forEach((node) => {
        const layerId = node.id();
        if (!originalNodeProps.current.has(layerId)) {
          originalNodeProps.current.set(layerId, {
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
          });
        }
      });

      // 커스텀 이벤트를 통해 캔버스에 드래그 시작을 알림
      if (stageRef.current) {
        const event = new CustomEvent("nodeDragStart");
        stageRef.current.container().dispatchEvent(event);
      }
    };

    const handleInvisibleRectDragMove = (
      e: Konva.KonvaEventObject<DragEvent>,
    ) => {
      e.evt.stopPropagation();

      // 모든 선택된 노드들을 함께 이동
      const nodes = transformerRef.current?.nodes() || [];
      const dx = invisibleRectRef.current!.x() - transformerBox.x;
      const dy = invisibleRectRef.current!.y() - transformerBox.y;

      nodes.forEach((node) => {
        const original = originalNodeProps.current.get(node.id());
        if (original) {
          node.position({
            x: original.x + dx,
            y: original.y + dy,
          });
        }
      });

      // 트랜스포머 업데이트
      if (transformerRef.current) {
        transformerRef.current.update();
        transformerRef.current.getLayer()?.batchDraw();
      }
    };

    const handleInvisibleRectDragEnd = (
      e: Konva.KonvaEventObject<DragEvent>,
    ) => {
      e.evt.stopPropagation();

      // 모든 선택된 노드들의 최종 위치 업데이트
      const nodes = transformerRef.current?.nodes() || [];
      const dx = invisibleRectRef.current!.x() - transformerBox.x;
      const dy = invisibleRectRef.current!.y() - transformerBox.y;

      nodes.forEach((node) => {
        const layerId = node.id();
        const original = originalNodeProps.current.get(layerId);

        if (original) {
          const newPos = {
            x: original.x + dx,
            y: original.y + dy,
          };

          node.position(newPos);

          const adjustedSize: SizeInfo = {
            x: newPos.x,
            y: newPos.y,
            width: original.width,
            height: original.height,
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          };

          // 변경 사항을 콜백으로 전달
          onTransformEnd(layerId, adjustedSize);
        }
      });

      // 트랜스포머 박스 위치 리셋
      invisibleRectRef.current!.position({
        x: transformerBox.x,
        y: transformerBox.y,
      });

      onKeepMultiLayerSelect(selectedLayers);

      // 트랜스포머 업데이트
      updateTransformerBox();

      // 스테이지 리드로우
      if (stageRef.current) {
        stageRef.current.batchDraw();
      }
    };

    return (
      <Group ref={groupRef}>
        {/* 투명한 드래그 영역 */}
        {transformerBox.width > 0 && transformerBox.height > 0 && (
          <Rect
            ref={invisibleRectRef}
            x={transformerBox.x}
            y={transformerBox.y}
            width={transformerBox.width}
            height={transformerBox.height}
            fill="transparent"
            draggable={true}
            onDragStart={handleInvisibleRectDragStart}
            onDragMove={handleInvisibleRectDragMove}
            onDragEnd={handleInvisibleRectDragEnd}
          />
        )}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // 최소 크기 제한
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={true}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          keepRatio={false}
          borderStroke="#00BFFF"
          borderStrokeWidth={2}
          anchorFill="#FFFFFF"
          anchorStroke="#00BFFF"
          anchorSize={10}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
          centeredScaling={false}
          // 회전 시 스냅 기능 (15도 단위로 스냅)
          rotationSnaps={[
            0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210,
            225, 240, 255, 270, 285, 300, 315, 330, 345,
          ]}
          padding={5}
          onTransform={updateTransformerBox}
        />
      </Group>
    );
  },
);

// 컴포넌트 이름 설정
LayerTransformer.displayName = "LayerTransformer";

export default LayerTransformer;
