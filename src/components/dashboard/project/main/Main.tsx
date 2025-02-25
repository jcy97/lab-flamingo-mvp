"use client";
import { useAtom, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getInitialProjectUrl, getUserProjects } from "~/app/actions/project";
import { Project } from "~/schemas";
import { currentProjectAtom, isLoadingAtom, projectsAtom } from "~/store/atoms";

const Main: React.FC = () => {
  const [projects, setProjects] = useAtom(projectsAtom);
  const setCurrentProject = useSetAtom(currentProjectAtom);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const setIsLoading = useSetAtom(isLoadingAtom);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userProjects = await getUserProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error("프로젝트를 가져오는 중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [setProjects]);

  const handleProjectClick = async (project: Project) => {
    setIsLoading(true);
    const projectId = project.uuid;
    const projectUrl = await getInitialProjectUrl(projectId);
    setCurrentProject(project);
    if (projectUrl) {
      router.push(projectUrl);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="my-10 grid h-full grid-cols-1 gap-12 rounded-xl bg-neutral-700 p-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
      {projects.length > 0 ? (
        projects.map((project) => (
          <div
            key={project.uuid}
            className="flex h-44 flex-col items-center rounded-lg border border-neutral-300 bg-neutral-800 p-4 duration-300"
            onClick={() => handleProjectClick(project)}
          >
            <div className="flex flex-col items-center duration-300 hover:scale-105">
              <img
                src={"/logo.png"}
                alt={`${project.name} 썸네일`}
                className="h-40 w-full rounded-lg object-contain"
              />
              <p className="mt-2 text-xl font-semibold text-neutral-100">
                {project.name}
              </p>
              <p className="text-xs text-neutral-300">
                수정일: {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-neutral-300">프로젝트가 없습니다.</div>
      )}
    </div>
  );
};

export default Main;
