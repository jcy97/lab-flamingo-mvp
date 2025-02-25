// components/LoadingSpinner.tsx
import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed left-0 top-0 z-10 flex h-screen w-full flex-col items-center justify-center bg-neutral-800">
      <img src="/logo.png" className="w-[250px] animate-pulse" />
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
    </div>
  );
};

export default LoadingSpinner;
