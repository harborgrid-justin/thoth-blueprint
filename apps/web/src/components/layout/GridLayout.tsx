import * as React from "react";
import { LAYOUT_STYLES } from "@/styles/layoutTokens";
import { cn } from "@/lib/utils";

export interface GridLayoutProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | "split";
  className?: string;
}

export function GridLayout({ children, cols = 2, className }: GridLayoutProps) {
  const gridClass =
    cols === 3
      ? LAYOUT_STYLES.grid3Col
      : cols === 4
        ? LAYOUT_STYLES.grid4Col
        : cols === "split"
          ? LAYOUT_STYLES.gridSplit
          : LAYOUT_STYLES.grid2Col;

  return <div className={cn(gridClass, className)}>{children}</div>;
}
