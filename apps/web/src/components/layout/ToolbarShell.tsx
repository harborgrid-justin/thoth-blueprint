import * as React from "react";
import { LAYOUT_STYLES } from "@/styles/layoutTokens";
import { cn } from "@/lib/utils";

export interface ToolbarShellProps {
  children: React.ReactNode;
  variant?: "floating" | "statusbar" | "ribbon";
  className?: string;
}

export function ToolbarShell({ children, variant = "floating", className }: ToolbarShellProps) {
  const variantClass =
    variant === "ribbon"
      ? LAYOUT_STYLES.ribbonBar
      : variant === "statusbar"
        ? LAYOUT_STYLES.statusbarFloating
        : LAYOUT_STYLES.toolbarFloating;

  return <div className={cn(variantClass, className)}>{children}</div>;
}
