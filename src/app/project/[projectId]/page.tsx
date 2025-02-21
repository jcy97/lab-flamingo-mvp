"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const Project: React.FC = () => {
  const pathname = usePathname();
  const projectId = pathname.split("/")[2];
  const router = useRouter();

  useEffect(() => {
    if (projectId) {
      router.push(`/project/${projectId}/asd/asd`);
    }
  }, [projectId]);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <img src="/logo.png" className="w-[250px] animate-pulse" />
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
    </div>
  );
};

export default Project;
