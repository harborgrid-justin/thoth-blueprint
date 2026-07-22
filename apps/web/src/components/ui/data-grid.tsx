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
        if (c.width) initial[c.id] = c.width;
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
    <div className="flex flex-col border border-border bg-card rounded-md overflow-hidden text-xs">
      {(title || onExportCsv || onExportXlsx) && (
        <div className="flex items-center justify-between p-1.5 px-2 bg-muted/30 border-b border-border">
          <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
            {title}
          </h4>
          <div className="flex items-center gap-1">
            {onExportCsv && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 hover:bg-background transition-colors"
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
                className="h-5 w-5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                onClick={onExportXlsx}
                title="Export XLSX"
              >
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-background">
              {columns.map((col) => {
                const w = colWidths[col.id] || 100;
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "py-1.5 px-2 font-semibold text-muted-foreground uppercase text-[9px] relative group select-none whitespace-nowrap",
                      col.pinned ? "sticky left-0 bg-background z-10 border-r border-border shadow-[1px_0_0_rgba(0,0,0,0.1)]" : "",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}
                    style={{ width: w, minWidth: w, maxWidth: w }}
                  >
                    {col.header}
                    {/* Resizer Handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors"
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
                  "border-b border-border/40 hover:bg-muted/40 transition-colors",
                  rIdx % 2 === 1 ? "bg-black/5" : "bg-transparent"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "py-1.5 px-2 truncate",
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
                  className="py-4 px-2 text-center text-muted-foreground/50 italic"
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
