"use client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { disconnectSocket, initProjectSocket } from "~/app/actions/socket";
import { checkAndAddProjectPermission } from "~/app/actions/project";
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

  // 초기화 완료 여부를 추적하는 ref
  const initializedRef = useRef(false);
  // 사용자 ID를 추출 (객체 대신 불변값 사용)
  const userId = user?.user.id || user?.user.email;

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

  // 권한 검사 및 소켓 초기화를 하나의 useEffect로 통합
  useEffect(() => {
    // 로딩 중이거나 사용자가 없으면 중단
    if (status === "loading" || !userId) return;

    const projectId = currentProject?.uuid || projectIdInUrl;
    if (!projectId) return;

    // 이미 초기화되었는지 확인
    if (initializedRef.current) return;

    let isMounted = true;

    const initializeProject = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      console.log(`프로젝트 초기화 시작: 프로젝트 ID ${projectId}`);

      try {
        // 1. 권한 검사 수행
        const permissionResult = await checkAndAddProjectPermission(projectId);
        if (!isMounted) return;

        if (!permissionResult.success && permissionResult.redirect) {
          router.push(permissionResult.redirect);
          return;
        }

        // 2. 권한이 있으면 소켓 초기화
        await initProjectSocket(projectId, user);

        if (isMounted) {
          console.log("프로젝트 초기화 완료");
          initializedRef.current = true; // 초기화 완료 표시
        }
      } catch (error) {
        if (isMounted) {
          console.error("프로젝트 초기화 중 오류:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeProject();

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      isMounted = false;
      console.log("컴포넌트 언마운트: 소켓 연결 해제");
      disconnectSocket();
      initializedRef.current = false; // 초기화 상태 리셋
    };
  }, [
    status,
    projectIdInUrl,
    currentProject?.uuid,
    userId,
    router,
    setIsLoading,
  ]);

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
