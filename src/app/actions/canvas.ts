/*
캔버스(페이지포함) 영역 관련 액션
*/
"use server";
import { selectPagesWithCanvases } from "~/server/service/canvas";

/**
 * 주어진 프로젝트 ID에 해당하는 페이지와 각 페이지의 캔버스를 인덱스 오름차순으로 반환
 *
 * @param projectId - 검색할 프로젝트의 ID
 * @returns 페이지와 해당 캔버스의 배열
 */
export const getPagesWithCanvases = async (projectId: string) => {
  const pagesWithCanvases = await selectPagesWithCanvases(projectId);
  if (!pagesWithCanvases) return [];
  return pagesWithCanvases;
};
