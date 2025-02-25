"use client";
import { useAtomValue } from "jotai";
import React from "react";
import { isLoadingAtom } from "~/store/atoms";
import LoadingSpinner from "./LoadingSpinner";

const Main: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoading = useAtomValue(isLoadingAtom);

  return (
    <main>
      {children}
      {isLoading && <LoadingSpinner />}
    </main>
  );
};

export default Main;
