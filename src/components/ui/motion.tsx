
import React, { ReactNode } from 'react';

interface MotionProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  initial?: boolean;
  transition?: {
    duration?: number;
    delay?: number;
    ease?: string;
  };
}

export const Motion: React.FC<MotionProps> = ({ 
  children, 
  className = "", 
  animate = true,
  initial = true,
  transition = { duration: 0.3 }
}) => {
  return (
    <div className={`${animate ? 'animate-fade-in' : ''} ${className}`}>
      {children}
    </div>
  );
};

interface PresenceProps {
  children: ReactNode;
  present: boolean;
  className?: string;
  unmountOnExit?: boolean;
}

export const Presence: React.FC<PresenceProps> = ({ 
  children, 
  present, 
  className = "",
  unmountOnExit = true
}) => {
  if (!present && unmountOnExit) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ${present ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}>
      {children}
    </div>
  );
};
