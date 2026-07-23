import * as React from "react";
import { LAYOUT_STYLES } from "@/styles/layoutTokens";
import { cn } from "@/lib/utils";

export interface SidebarShellProps {
  children: React.ReactNode;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function SidebarShell({ children, width = 320, className, style }: SidebarShellProps) {
  return (
    <aside
      style={{ width, ...style }}
      className={cn(LAYOUT_STYLES.sidebarShell, className)}
    >
      {children}
    </aside>
  );
}
