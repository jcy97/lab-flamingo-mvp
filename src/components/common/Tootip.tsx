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
        <div
          className="fixed z-50 mt-2 w-max transform rounded bg-gray-700 p-1 text-center text-sm text-neutral-100"
          style={{
            left: "var(--tooltip-x)",
            top: "var(--tooltip-y)",
          }}
          ref={(el) => {
            if (el) {
              const rect = el.parentElement?.getBoundingClientRect();
              if (rect) {
                el.style.setProperty(
                  "--tooltip-x",
                  `${rect.left + rect.width / 2 - el.offsetWidth / 2}px`,
                );
                el.style.setProperty("--tooltip-y", `${rect.bottom + 8}px`);
              }
            }
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
