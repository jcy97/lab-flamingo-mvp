import { atom } from "jotai";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

export const pageYdocAtom = atom<Y.Doc | null>(null);

export const yProvidersAtom = atom<Record<string, SocketIOProvider>>({});
