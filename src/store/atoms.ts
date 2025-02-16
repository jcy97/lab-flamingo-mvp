import { atom } from "jotai";
import { Project } from "~/schemas";

export const projectsAtom = atom<Project[]>([]);
