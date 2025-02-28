"use client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPagesWithCanvases } from "~/app/actions/canvas";
import { disconnectSocket, initProjectSocket } from "~/app/actions/socket";
import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";
import { currentProjectAtom, projectLoadingAtom } from "~/store/atoms";
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

  const pathname = usePathname();
  const projectIdinUrl = pathname.split("/")[2]!;

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
      </main>
    </>
  );
}
