import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LAYOUT_STYLES } from "@/styles/layoutTokens";
import { cn } from "@/lib/utils";

export interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
}

export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  headerActions,
  footer,
  children,
  className,
  maxWidthClass = "max-w-4xl",
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(LAYOUT_STYLES.dialogShell, maxWidthClass, className)}>
        <DialogHeader className={LAYOUT_STYLES.dialogHeader}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && <div className="shrink-0 rounded-xl border border-border bg-card/60 p-2">{icon}</div>}
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {title}
                </DialogTitle>
                {description && <DialogDescription className="mt-0.5 text-xs text-muted-foreground">{description}</DialogDescription>}
              </div>
            </div>
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>
        </DialogHeader>

        <div className={LAYOUT_STYLES.dialogBody}>
          {children}
        </div>

        {footer && (
          <div className={LAYOUT_STYLES.dialogFooter}>
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
