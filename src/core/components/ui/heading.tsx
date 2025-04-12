
import React from "react";
import { cn } from "@/lib/utils";

export enum HeadingLevel {
  h1 = "h1",
  h2 = "h2",
  h3 = "h3",
  h4 = "h4",
  h5 = "h5",
  h6 = "h6"
}

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel;
  showAs?: HeadingLevel;
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  level,
  showAs,
  children,
  className,
  ...props
}) => {
  const styles = {
    [HeadingLevel.h1]: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    [HeadingLevel.h2]: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
    [HeadingLevel.h3]: "scroll-m-20 text-2xl font-semibold tracking-tight",
    [HeadingLevel.h4]: "scroll-m-20 text-xl font-semibold tracking-tight",
    [HeadingLevel.h5]: "scroll-m-20 text-lg font-semibold tracking-tight",
    [HeadingLevel.h6]: "scroll-m-20 text-base font-semibold tracking-tight",
  };

  const visualLevel = showAs || level;
  
  // Use createElement instead of directly using the tag as a component
  return React.createElement(
    level,
    {
      className: cn(styles[visualLevel], className),
      ...props
    },
    children
  );
};
