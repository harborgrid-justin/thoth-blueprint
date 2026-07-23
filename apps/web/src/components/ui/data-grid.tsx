import * as React from "react";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "./button";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  width?: number;
  align?: "left" | "right" | "center";
  pinned?: boolean;
}

interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
}

export function DataGrid<T>({
  data,
  columns,
  title,
  onExportCsv,
  onExportXlsx,
}: DataGridProps<T>) {
  const [colWidths, setColWidths] = React.useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      columns.forEach((c) => {
        if (c.width) {initial[c.id] = c.width;}
      });
      return initial;
    }
  );

  const handleResize = (id: string, delta: number) => {
    setColWidths((prev) => ({
      ...prev,
      [id]: Math.max(40, (prev[id] || 100) + delta),
    }));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card text-xs">
      {(title || onExportCsv || onExportXlsx) && (
        <div className="flex items-center justify-between border-b border-border bg-muted/30 p-1.5 px-2">
          <h4 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h4>
          <div className="flex items-center gap-1">
            {onExportCsv && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 transition-colors hover:bg-background"
                onClick={onExportCsv}
                title="Export CSV"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            {onExportXlsx && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 text-emerald-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                onClick={onExportXlsx}
                title="Export XLSX"
              >
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="relative w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-background">
              {columns.map((col) => {
                const w = colWidths[col.id] || 100;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "group relative px-2 py-1.5 text-[9px] font-semibold whitespace-nowrap text-muted-foreground uppercase select-none",
                      col.pinned ? "sticky left-0 z-10 border-r border-border bg-background shadow-[1px_0_0_rgba(0,0,0,0.1)]" : "",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}
                    style={{ width: w, minWidth: w, maxWidth: w }}
                  >
                    {col.header}
                    {/* Resizer Handle */}
                    <div
                      className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize transition-colors hover:bg-primary/50 active:bg-primary"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startW = w;
                        
                        const onMove = (me: MouseEvent) => {
                          handleResize(col.id, me.clientX - startX - (w - startW));
                        };
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={cn(
                  "border-b border-border/40 transition-colors hover:bg-muted/40",
                  rIdx % 2 === 1 ? "bg-black/5" : "bg-transparent"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "truncate px-2 py-1.5",
                      col.pinned ? "sticky left-0 z-10 border-r border-border/40 shadow-[1px_0_0_rgba(0,0,0,0.1)]" : "",
                      col.pinned ? (rIdx % 2 === 1 ? "bg-[#141517]" : "bg-card") : "", // approximate bg mapping for zebra in pinned mode
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.pinned ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {col.accessor ? col.accessor(row) : (row as any)[col.id]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-2 py-4 text-center text-muted-foreground/50 italic"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
