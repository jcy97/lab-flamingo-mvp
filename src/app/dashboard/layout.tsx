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
    if (status === "loading") {
      setIsLoading(true);
    }
    if (status === "unauthenticated") {
      window.location.reload();
    }

    if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, setIsLoading]);

  return (
    <>
      <main className="flex h-screen bg-neutral-800">
        <Sidebar />
        <div className="w-full">{children}</div>
      </main>
    </>
  );
}
