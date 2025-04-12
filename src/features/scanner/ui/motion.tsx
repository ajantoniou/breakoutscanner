
// Basic motion component to provide animation capabilities
import React from "react";

interface MotionProps {
  initial?: object;
  animate?: object;
  exit?: object;
  transition?: object;
  className?: string;
  children: React.ReactNode;
}

export const Motion: React.FC<MotionProps> = ({
  initial = { opacity: 0 },
  animate = { opacity: 1 },
  exit = { opacity: 0 },
  transition = { duration: 0.3 },
  className = "",
  children
}) => {
  // This is a simplified motion component without animation libraries
  return <div className={className}>{children}</div>;
};
