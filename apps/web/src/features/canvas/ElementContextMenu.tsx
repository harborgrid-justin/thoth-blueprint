import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { usePropertiesState } from "../workspace/hooks/usePropertiesState";
import { elementMeta } from "@/lib/elementMeta";
import { formatArea, formatNumber } from "@/lib/format";
import { isSpatialElement, measuredArea, measuredPerimeter } from "@thoth/domain";
import { useUiStore } from "@/store/uiStore";

export function ElementContextMenu({
  children,
  onContextMenu,
}: {
  children: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const { site, selectedElement, selection, deleteSelection } = usePropertiesState();
  const setSubdivisionTargetId = useUiStore((s) => s.setSubdivisionTargetId);

  const getElementName = (el: any) => {
    if (el.kind === "note") {return el.text;}
    if (el.kind === "tree") {return el.species;}
    if (el.kind === "spot") {return el.label;}
    return el.name;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={onContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {selection.length > 1 ? (
          <>
            <ContextMenuLabel>Selection ({selection.length} elements)</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={() => deleteSelection()}
            >
              Delete Selected
            </ContextMenuItem>
          </>
        ) : selectedElement && site ? (
          <>
            <ContextMenuLabel>
              {getElementName(selectedElement) || "Unnamed"}
              <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                ({elementMeta(selectedElement.kind).label})
              </span>
            </ContextMenuLabel>
            <ContextMenuSeparator />
            {isSpatialElement(selectedElement) && (
              <>
                <ContextMenuItem disabled>
                  Area:{" "}
                  {formatArea(
                    measuredArea(selectedElement.boundary, site.spatial, "sqm"),
                    "sqm"
                  )}
                </ContextMenuItem>
                <ContextMenuItem disabled>
                  Perimeter:{" "}
                  {formatNumber(
                    measuredPerimeter(selectedElement.boundary, site.spatial),
                    1
                  )}{" "}
                  m
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            {selectedElement.kind === "parcel" && (
              <>
                <ContextMenuItem 
                  className="cursor-pointer font-medium text-primary"
                  onSelect={() => setSubdivisionTargetId(selectedElement.id)}
                >
                  Auto Subdivide...
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            {selectedElement.kind === "zone" && (
              <>
                <ContextMenuItem disabled>
                  Designation: {(selectedElement as any).designation || "None"}
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            {selectedElement.kind === "building" && (
              <>
                <ContextMenuItem disabled>
                  Storeys: {(selectedElement as any).storeys || 1}
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem className="cursor-pointer" onSelect={() => {
              // Open properties panel by ensuring layout is open
            }}>
              Properties
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              Isolate Object
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              Select Similar
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={() => deleteSelection()}
            >
              Delete
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuLabel>Site Workspace</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem className="cursor-pointer font-bold">
              Repeat Last Command
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="cursor-pointer">
              Pan
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              Zoom
            </ContextMenuItem>
            <ContextMenuSeparator />
            {site && (
              <>
                <ContextMenuItem disabled>Name: {site.name}</ContextMenuItem>
                <ContextMenuItem disabled>CRS: {site.spatial.crs}</ContextMenuItem>
                <ContextMenuItem disabled>Units: {site.spatial.units}</ContextMenuItem>
              </>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
