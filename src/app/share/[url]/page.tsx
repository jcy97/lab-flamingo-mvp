"use client";
import { useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  getInitialProjectUrl,
  getProjectUuidByUrl,
} from "~/app/actions/project";
import { isLoadingAtom } from "~/store/atoms";

const Share: React.FC = () => {
  const setIsLoading = useSetAtom(isLoadingAtom);
  const pathname = usePathname();
  const router = useRouter();
  const projectUrl = pathname.split("/")[2];

  useEffect(() => {
    const redirectToProject = async () => {
      if (!projectUrl) {
        router.push("/");
        return;
      }

      setIsLoading(true);

      try {
        // URL을 사용하여 프로젝트 UUID 조회
        const projectId = await getProjectUuidByUrl(projectUrl);

        if (projectId) {
          // UUID가 존재하면 프로젝트 페이지로 이동
          const projectUrl = await getInitialProjectUrl(projectId);
          if (projectUrl) {
            router.push(projectUrl);
          }
        } else {
          // UUID가 존재하지 않으면 루트 페이지로 이동
          console.log("프로젝트를 찾을 수 없습니다:", projectUrl);
          router.push("/");
        }
      } catch (error) {
        // 오류 발생 시 루트 페이지로 이동
        console.error("프로젝트 리다이렉트 중 오류:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    redirectToProject();
  }, [projectUrl, router, setIsLoading]);

  return <div></div>;
};

export default Share;
