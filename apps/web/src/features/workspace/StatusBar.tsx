import { useCanvasStore } from "@/store/canvasStore";
import { formatCoord } from "@/lib/units";
import { usePrefsStore } from "@/store/prefsStore";

export function StatusBar() {
  const coordFormat = usePrefsStore((s) => s.coordFormat);
  const cursor = useCanvasStore((s) => s.cursor);

  const { ortho, polar, osnap, toggleOrtho, togglePolar, toggleOsnap } = usePrefsStore();

  return (
    <div className="absolute bottom-0 right-0 z-30 flex h-7 items-center gap-4 border-l border-t border-border/60 bg-background/95 px-4 font-cad text-[10px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-md">
      <div className="flex gap-4">
        <span>X: {cursor ? formatCoord(cursor, coordFormat) : "---"}</span>
        <span>Y: {cursor ? formatCoord(cursor, coordFormat) : "---"}</span>
        <span>Z: 0.00</span>
      </div>
      <div className="h-3 w-px bg-border/60" />
      <div className="flex gap-3">
        <button className="hover:text-foreground">SNAP</button>
        <button 
          onClick={toggleOrtho} 
          className={`hover:text-foreground transition-colors ${ortho ? "text-primary" : ""}`}
        >
          ORTHO
        </button>
        <button 
          onClick={togglePolar} 
          className={`hover:text-foreground transition-colors ${polar ? "text-primary" : ""}`}
        >
          POLAR
        </button>
        <button 
          onClick={toggleOsnap} 
          className={`hover:text-foreground transition-colors ${osnap ? "text-primary" : ""}`}
        >
          OSNAP
        </button>
      </div>
    </div>
  );
}
