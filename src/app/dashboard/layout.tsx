"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAtom } from "jotai";
import { isLoadingAtom } from "~/store/atoms";
import Sidebar from "~/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

  useEffect(() => {
    console.log("세션 상태:", status);
    if (status === "unauthenticated") {
      window.location.reload();
    }
    // 세션 로딩 중일 때 전역 로딩 상태 활성화
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    // 세션 로딩이 완료되면 로딩 상태 비활성화
    setIsLoading(false);
  }, [status, router, setIsLoading]);

  return (
    <>
      <main className="flex h-screen bg-neutral-800">
        <Sidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
