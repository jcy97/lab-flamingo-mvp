import React from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className="absolute top-full mt-2 w-max rounded bg-gray-700 p-1 text-center text-sm text-neutral-100">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
