import { atom } from "jotai";
import * as Y from "yjs";
import { Socket } from "socket.io-client";
import { SocketIOProvider } from "y-socket.io";

export const pageYdocAtom = atom<Y.Doc | null>(null);
export const canvasYdocAtom = atom<Y.Doc | null>(null);

export const projectSocketAtom = atom<Socket | null>(null);

export const yjsProviderAtom = atom<SocketIOProvider | null>(null);
