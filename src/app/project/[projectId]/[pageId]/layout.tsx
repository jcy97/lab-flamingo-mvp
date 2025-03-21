"use client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { disconnectSocket, initProjectSocket } from "~/app/actions/socket";
import { checkAndAddProjectPermission } from "~/app/actions/project"; // 액션 함수 임포트
import LeftSidebar from "~/components/project/leftSidebar/LeftSidebar";
import RightSidebar from "~/components/project/rightSidebar/RightSidebar";
import Toolbar from "~/components/project/toolbar/Toolbar";
import {
  currentProjectAtom,
  projectLoadingAtom,
  scaleFactorAtom,
} from "~/store/atoms";
import { useSession } from "next-auth/react";
import LoadingSpinner from "~/components/common/LoadingSpinner";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, status } = useSession();
  const [isLoading, setIsLoading] = useAtom(projectLoadingAtom);
  const currentProject = useAtomValue(currentProjectAtom);
  const scaleFactor = useAtomValue(scaleFactorAtom);
  const [isScaleFactorVisible, setIsScaleFactorVisible] = useState(false);
  const router = useRouter();

  const pathname = usePathname();
  const projectIdInUrl = pathname.split("/")[2]!;

  // 스케일 팩터 변경시 표시 로직
  useEffect(() => {
    setIsScaleFactorVisible(true);

    const timer = setTimeout(() => {
      setIsScaleFactorVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [scaleFactor]);

  // 권한 검사 수행
  useEffect(() => {
    if (status === "loading") return;
    if (!user) return;

    const projectId = currentProject?.uuid || projectIdInUrl;
    if (!projectId) return;

    // 권한 검사
    const checkPermission = async () => {
      try {
        const permissionResult = await checkAndAddProjectPermission(projectId);

        if (!permissionResult.success && permissionResult.redirect) {
          router.push(permissionResult.redirect);
        }
      } catch (error) {
        console.error("권한 검사 중 오류:", error);
      }
    };

    checkPermission();
  }, [status, projectIdInUrl, currentProject?.uuid, user, router]);

  // 소켓 초기화 별도 수행
  useEffect(() => {
    if (status === "loading") return;
    if (!user) return;

    const projectId = currentProject?.uuid || projectIdInUrl;
    if (!projectId) return;

    const initializeSocket = async () => {
      setIsLoading(true);

      try {
        await disconnectSocket();
        await initProjectSocket(projectId, user);
      } catch (error) {
        console.error("소켓 초기화 중 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSocket();

    return () => {
      disconnectSocket();
    };
  }, [status, projectIdInUrl, currentProject?.uuid, user, setIsLoading]);

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

        {/* 스케일 팩터 표시 */}
        {isScaleFactorVisible && (
          <div className="fixed bottom-4 right-[calc(256px+16px)] z-50 rounded bg-white bg-opacity-70 px-2 py-1 text-xs text-gray-700 shadow-sm">
            {Math.round(scaleFactor * 100)}%
          </div>
        )}
      </main>
    </>
  );
}
