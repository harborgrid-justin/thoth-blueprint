import * as React from "react";
import {
  bounds,
  isSpatialElement,
  unionBounds,
  type Bounds,
  type Site,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useResizeObserver } from "@/lib/hooks";
import { fitBounds } from "../helpers/viewport";
import { padBounds } from "../helpers/canvasHelpers";

export interface Size {
  width: number;
  height: number;
}

export function useCanvasViewportController(
  containerRef: React.RefObject<HTMLDivElement | null>,
  site: Site | null,
) {
  const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

  const {
    viewport,
    setViewport,
    fitRequestId,
    fitSelectionRequestId,
  } = useCanvasStore();

  // --- Size tracking -------------------------------------------------------
  useResizeObserver(containerRef.current, (entry) => {
    const rect = entry.contentRect;
    setSize({ width: rect.width, height: rect.height });
  });

  React.useEffect(() => {
    const el = containerRef.current;
    if (el) {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    }
  }, [containerRef]);

  const prevSizeRef = React.useRef<Size>({ width: 0, height: 0 });
  React.useEffect(() => {
    if (
      prevSizeRef.current.width > 0 &&
      prevSizeRef.current.height > 0 &&
      size.width > 0 &&
      size.height > 0
    ) {
      const dw = size.width - prevSizeRef.current.width;
      const dh = size.height - prevSizeRef.current.height;
      if (dw !== 0 || dh !== 0) {
        const currentViewport = useCanvasStore.getState().viewport;
        setViewport({
          zoom: currentViewport.zoom,
          offsetX: currentViewport.offsetX + dw / 2,
          offsetY: currentViewport.offsetY + dh / 2,
        });
      }
    }
    prevSizeRef.current = size;
  }, [size, setViewport]);

  // --- Fit to bounds on request & first load -------------------------------
  const planBounds = React.useMemo<Bounds | null>(() => {
    if (!site) {
      return null;
    }
    const boxes = site.elements.filter(isSpatialElement).map((e) => bounds(e.boundary));
    return boxes.length ? unionBounds(boxes) : null;
  }, [site]);

  const didInitialFit = React.useRef(false);
  React.useEffect(() => {
    if (!size.width || !size.height) {
      return;
    }
    if (didInitialFit.current) {
      return;
    }
    didInitialFit.current = true;
    if (planBounds) {
      setViewport(fitBounds(planBounds, size.width, size.height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, planBounds]);

  React.useEffect(() => {
    if (fitRequestId === 0 || !size.width || !size.height) {
      return;
    }
    if (planBounds) {
      setViewport(fitBounds(planBounds, size.width, size.height));
    } else {
      setViewport({ offsetX: size.width / 2, offsetY: size.height / 2, zoom: 3 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

  // Zoom-to-selection
  React.useEffect(() => {
    if (fitSelectionRequestId === 0 || !site || !size.width || !size.height) {
      return;
    }
    const ids = new Set(useWorkspaceStore.getState().selection);
    const boxes: Bounds[] = [];
    for (const el of site.elements) {
      if (!ids.has(el.id)) {
        continue;
      }
      if (isSpatialElement(el)) {
        boxes.push(bounds(el.boundary));
      } else {
        boxes.push({
          minX: el.position.x,
          minY: el.position.y,
          maxX: el.position.x,
          maxY: el.position.y,
        });
      }
    }
    const box = boxes.length ? unionBounds(boxes) : planBounds;
    if (box) {
      setViewport(fitBounds(padBounds(box), size.width, size.height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSelectionRequestId]);

  return {
    size,
    viewport,
    setViewport,
  };
}
