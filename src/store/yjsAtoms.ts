import { atom } from "jotai";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { Socket } from "socket.io-client";

export const pageYdocAtom = atom<Y.Doc | null>(null);
export const canvasYdocAtom = atom<Y.Doc | null>(null);

export const yPageProvidersAtom = atom<Record<string, SocketIOProvider>>({});

export const projectSocketAtom = atom<Socket | null>(null);
