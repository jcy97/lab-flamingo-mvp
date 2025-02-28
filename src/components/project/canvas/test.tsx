"use client";
import { useAtomValue } from "jotai";
import { useEffect, useState, useRef } from "react";
import { currentCanvasAtom } from "~/store/atoms";
import { Stage, Layer, Transformer } from "react-konva";

const Canvas: React.FC = () => {
  const currentCanvas = useAtomValue(currentCanvasAtom);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for zoom and position
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Initial fit to screen
  useEffect(() => {
    setIsMounted(true);

    if (currentCanvas && containerRef.current) {
      fitCanvasToScreen();

      // Add window resize handler
      window.addEventListener("resize", fitCanvasToScreen);
      return () => window.removeEventListener("resize", fitCanvasToScreen);
    }
  }, [currentCanvas, containerRef.current]);

  // Function to fit canvas to screen
  const fitCanvasToScreen = () => {
    if (!currentCanvas || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // Calculate ratio to fit the canvas in the container
    const scaleX = containerWidth / currentCanvas.width;
    const scaleY = containerHeight / currentCanvas.height;

    // Use the smaller scale to ensure the entire canvas fits
    const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin

    // Center the canvas
    const newX = (containerWidth - currentCanvas.width * newScale) / 2;
    const newY = (containerHeight - currentCanvas.height * newScale) / 2;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (!containerRef.current || !currentCanvas) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Find the mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find the point on the original canvas that the mouse is pointing to
    const mousePointTo = {
      x: (mouseX - position.x) / scale,
      y: (mouseY - position.y) / scale,
    };

    // Calculate new scale
    // Adjust the 1.05 and 0.95 values to control zoom sensitivity
    const newScale = e.deltaY < 0 ? scale * 1.05 : scale * 0.95;

    // Limit zoom levels
    const limitedScale = Math.min(Math.max(newScale, 0.1), 10);

    // Calculate new position
    const newPos = {
      x: mouseX - mousePointTo.x * limitedScale,
      y: mouseY - mousePointTo.y * limitedScale,
    };

    setScale(limitedScale);
    setPosition(newPos);
  };

  // Handle pan start
  const handleDragStart = (e: React.MouseEvent) => {
    // Middle mouse button (button 1) or Alt+left click could trigger panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  // Handle pan move
  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newPosition = {
      x: position.x + e.movementX,
      y: position.y + e.movementY,
    };

    setPosition(newPosition);
    e.preventDefault();
  };

  // Handle pan end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Create keyboard shortcut for fit to screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '0' key for fit to screen (like Photoshop)
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fitCanvasToScreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCanvas]);

  if (!currentCanvas || !isMounted) {
    return null;
  }

  const isTransparent = currentCanvas.background === "TRANSPARENT";

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{
        backgroundColor: "#4A4A4A", // Dark gray background like Photoshop
        overflow: "hidden",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onWheel={handleWheel}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      {/* Canvas container with transform */}
      <div
        className="absolute"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.5)",
        }}
      >
        {/* Transparent background checkerboard pattern */}
        {isTransparent && (
          <div
            className="bg-checkerboard absolute left-0 top-0"
            style={{
              width: currentCanvas.width,
              height: currentCanvas.height,
            }}
          />
        )}

        {/* Stage component */}
        <Stage
          width={currentCanvas.width}
          height={currentCanvas.height}
          style={{
            background: isTransparent
              ? "transparent"
              : currentCanvas.background,
          }}
        >
          <Layer>{/* Your canvas content will go here */}</Layer>
        </Stage>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 select-none rounded-md bg-gray-800 px-3 py-1 text-sm text-white">
        {Math.round(scale * 100)}%
      </div>

      {/* Fit to screen button */}
      <button
        onClick={fitCanvasToScreen}
        className="absolute bottom-4 left-4 z-10 rounded-md bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700"
      >
        Fit to Screen
      </button>
    </div>
  );
};

export default Canvas;
