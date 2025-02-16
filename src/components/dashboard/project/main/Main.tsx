"use client";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { getUserProjects } from "~/app/actions/project";
import { projectsAtom } from "~/store/atoms";

const Main: React.FC = () => {
  const [projects, setProjects] = useAtom(projectsAtom);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userProjects = await getUserProjects();
        setProjects(userProjects);
      } catch (error) {
        console.error("프로젝트를 가져오는 중 오류 발생:", error);
      }
    };

    fetchProjects();
  }, [setProjects]);

  return (
    <div className="my-10 grid h-full grid-cols-1 gap-12 rounded-xl bg-neutral-700 p-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
      {projects.length > 0 ? (
        projects.map((project) => (
          <div
            key={project.uuid}
            className="flex h-44 flex-col items-center rounded-lg border border-neutral-300 bg-neutral-800 p-4 duration-300"
          >
            <div className="flex flex-col items-center duration-300 hover:scale-105 hover:cursor-pointer">
              <img
                src={"/logo.png"}
                alt={`${project.name} 썸네일`}
                className="min-w-[300px]rounded-lg h-40 w-full object-contain"
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
        <p>프로젝트가 없습니다.</p>
      )}
    </div>
  );
};

export default Main;
