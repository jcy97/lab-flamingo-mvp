"use client";
import { useAtom, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  getInitialProjectUrl,
  getUserProjects,
  editProjectName,
} from "~/app/actions/project";
import { Project } from "~/schemas";
import { currentProjectAtom, isLoadingAtom, projectsAtom } from "~/store/atoms";
import { IoMdSettings } from "react-icons/io";

const Main: React.FC = () => {
  const [projects, setProjects] = useAtom(projectsAtom);
  const setCurrentProject = useSetAtom(currentProjectAtom);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const setIsLoading = useSetAtom(isLoadingAtom);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeMenu &&
        menuRefs.current[activeMenu] &&
        !menuRefs.current[activeMenu]?.contains(event.target as Node)
      ) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);

  const handleProjectClick = async (project: Project) => {
    setIsLoading(true);
    const projectId = project.uuid;
    const projectUrl = await getInitialProjectUrl(projectId);
    setCurrentProject(project);
    if (projectUrl) {
      router.push(projectUrl);
    }
  };

  const toggleMenu = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === projectId ? null : projectId);
  };

  const handleEditName = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setActiveMenu(null);
    const newName = prompt("프로젝트 이름을 입력하세요:", project.name);
    if (newName && newName !== project.name) {
      const updatedProjects = projects.map((p) =>
        p.uuid === project.uuid ? { ...p, name: newName } : p,
      );
      setProjects(updatedProjects);

      // 서버 요청 - updateProjectName 함수가 모든 검증과 업데이트를 처리
      const result = await editProjectName(project.uuid, newName);

      if (!result?.success) {
        // 실패 시 원래 상태로 되돌림
        const revertUpdate = projects.map((p) =>
          p.uuid === project.uuid ? project : p,
        );
        setProjects(revertUpdate);
      }
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setActiveMenu(null);

    if (confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?`)) {
      const updatedProjects = projects.filter((p) => p.uuid !== project.uuid);
      setProjects(updatedProjects);
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
    <div className="my-6 h-full rounded-xl bg-neutral-700 p-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-28 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.uuid}
              className="relative flex h-44 flex-col items-center rounded-lg border border-neutral-300 bg-neutral-800 p-4 duration-300"
              onClick={() => handleProjectClick(project)}
            >
              <div className="absolute right-2 top-2 z-10">
                <button
                  onClick={(e) => toggleMenu(e, project.uuid)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                >
                  <IoMdSettings size={16} />
                </button>

                {activeMenu === project.uuid && (
                  <div
                    ref={(el) => {
                      menuRefs.current[project.uuid] = el;
                      return undefined;
                    }}
                    className="absolute right-0 mt-1 w-32 rounded-md bg-neutral-900 py-1 shadow-lg ring-1 ring-black ring-opacity-5"
                  >
                    <button
                      className="block w-full px-4 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800"
                      onClick={(e) => handleEditName(e, project)}
                    >
                      이름 수정
                    </button>
                    <button
                      className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-neutral-800"
                      onClick={(e) => handleDeleteProject(e, project)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>

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
          <div className="col-span-full text-center text-neutral-300">
            프로젝트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Main;
