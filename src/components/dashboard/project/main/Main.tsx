"use client";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { getUserProjects } from "~/app/actions/project";
import { projectsAtom } from "~/store/atoms";

const Main: React.FC = () => {
  const [projects, setProjects] = useAtom(projectsAtom);
  const [loading, setLoading] = useState(true);

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
          >
            <div className="hover:cursor-ㅊ flex flex-col items-center duration-300 hover:scale-105">
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
