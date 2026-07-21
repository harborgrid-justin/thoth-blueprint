import * as React from "react";
import {
  getRegionPlugin,
  resolveCapabilities,
  US_PLSS_DEFAULT,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";

export function usePlatSheetState() {
  const open = useUiStore((s) => s.sheetOpen);
  const setOpen = useUiStore((s) => s.setSheetOpen);
  const site = useWorkspaceStore((s) => s.site);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const plugin = site
    ? (getRegionPlugin(site.jurisdictionId) ?? US_PLSS_DEFAULT)
    : US_PLSS_DEFAULT;
  const caps = resolveCapabilities(plugin);

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) {return;}
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${src}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plat-sheet.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    open,
    setOpen,
    site,
    plugin,
    caps,
    svgRef,
    exportSvg,
  };
}
