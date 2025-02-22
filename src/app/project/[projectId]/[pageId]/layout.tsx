"use client";
import { useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPagesWithCanvases } from "~/app/actions/canvas";
import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";
import {
  currentCanvasAtom,
  currentPageAtom,
  currentProjectAtom,
  pageCanvasInformationAtom,
} from "~/store/atoms";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const currentProject = useAtomValue(currentProjectAtom);
  const setPageCanvasInformation = useSetAtom(pageCanvasInformationAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setCurrentCanvas = useSetAtom(currentCanvasAtom);
  const pathname = usePathname();
  const projectIdinUrl = pathname.split("/")[2];

  useEffect(() => {
    const getCanvasInformation = async () => {
      const projectId = currentProject ? currentProject.uuid : projectIdinUrl;
      const canvasInformation = await getPagesWithCanvases(projectId!);
      setPageCanvasInformation(canvasInformation);
      //초기 페이지와 캔버스 설정
      setCurrentPage(canvasInformation[0]);
      setCurrentCanvas(canvasInformation[0]!.page_canvases[0]);
      //로딩 화면 해제
      setIsLoading(false);
    };
    getCanvasInformation();
  }, []);
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
