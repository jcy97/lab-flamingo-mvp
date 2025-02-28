"use client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPagesWithCanvases } from "~/app/actions/canvas";
import { disconnectSocket, initProjectSocket } from "~/app/actions/socket";
import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";
import {
  currentProjectAtom,
  projectLoadingAtom,
  scaleFactorAtom, // 스케일 팩터 atom 추가
} from "~/store/atoms";
import { useSession } from "next-auth/react";
import LoadingSpinner from "~/components/common/LoadingSpinner";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useAtom(projectLoadingAtom);
  const currentProject = useAtomValue(currentProjectAtom);
  const { data: user, status } = useSession();
  const scaleFactor = useAtomValue(scaleFactorAtom); // 스케일 팩터 가져오기
  const [isScaleFactorVisible, setIsScaleFactorVisible] = useState(false);

  const pathname = usePathname();
  const projectIdinUrl = pathname.split("/")[2]!;

  // 스케일 팩터 변경시 표시 로직
  useEffect(() => {
    setIsScaleFactorVisible(true);

    const timer = setTimeout(() => {
      setIsScaleFactorVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [scaleFactor]);

  useEffect(() => {
    const projectId = currentProject?.uuid || projectIdinUrl;
    if (status !== "authenticated" || !projectId) return;

    const initialize = async () => {
      setIsLoading(true);
      // 기존 소켓 연결 해제
      await disconnectSocket();
      const projectId = currentProject ? currentProject.uuid : projectIdinUrl;
      await initProjectSocket(projectId, user!);
    };

    initialize();

    return () => {
      disconnectSocket();
    };
  }, [status, projectIdinUrl, currentProject?.uuid, user?.user.id]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <main className="relative">
        <div className="relative z-20">
          <LeftSidebar />
        </div>
        <div className="relative z-20">
          <RightSidebar />
        </div>
        <div className="relative z-10">
          <Toolbar />
        </div>
        <div className="relative z-0">{children}</div>

        {/* 스케일 팩터 표시 - 사이드바를 피해서 오른쪽 위치 */}
        {isScaleFactorVisible && (
          <div className="fixed bottom-4 right-[calc(256px+16px)] z-50 rounded bg-white bg-opacity-70 px-2 py-1 text-xs text-gray-700 shadow-sm">
            {Math.round(scaleFactor * 100)}%
          </div>
        )}
      </main>
    </>
  );
}
