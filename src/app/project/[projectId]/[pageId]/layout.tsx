"use client";
import { useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPagesWithCanvases } from "~/app/actions/canvas";
import { disconnectSocket, initSocket } from "~/app/actions/socket";
import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";
import {
  currentCanvasAtom,
  currentCanvasesAtom,
  currentLayerAtom,
  currentLayersAtom,
  currentPageAtom,
  currentProjectAtom,
  pageCanvasInformationAtom,
} from "~/store/atoms";
import { useSession } from "next-auth/react";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const currentProject = useAtomValue(currentProjectAtom);
  const setPageCanvasInformation = useSetAtom(pageCanvasInformationAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setCurrentCanvases = useSetAtom(currentCanvasesAtom);
  const setCurrentCanvas = useSetAtom(currentCanvasAtom);
  const setCurrentLayers = useSetAtom(currentLayersAtom);
  const setCurrentLayer = useSetAtom(currentLayerAtom);
  const { data: user, status } = useSession();

  const pathname = usePathname();
  const projectIdinUrl = pathname.split("/")[2]!;

  useEffect(() => {
    let cleanup: (() => Promise<void>) | undefined;

    const getCanvasInformation = async () => {
      if (status !== "authenticated") return;
      const projectId = currentProject ? currentProject.uuid : projectIdinUrl;
      const canvasInformation = await getPagesWithCanvases(projectId!);
      setPageCanvasInformation(canvasInformation);

      setCurrentPage(canvasInformation[0]);
      setCurrentCanvases(canvasInformation[0]!.page_canvases);
      setCurrentCanvas(canvasInformation[0]!.page_canvases[0]);
      setCurrentLayers(canvasInformation[0]!.page_canvases[0]!.canvas_layers);
      setCurrentLayer(canvasInformation[0]!.page_canvases[0]!.canvas_layers[0]);

      await initSocket(projectId, user!);
      cleanup = disconnectSocket; // cleanup 함수 저장

      setIsLoading(false);
    };

    getCanvasInformation();

    return () => {
      if (cleanup) {
        cleanup(); // 컴포넌트 언마운트 시 소켓 연결 해제
      }
    };
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <img src="/logo.png" className="w-[250px] animate-pulse" />
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  return (
    <>
      <main>
        <LeftSidebar />
        <RightSidebar />
        <Toolbar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
