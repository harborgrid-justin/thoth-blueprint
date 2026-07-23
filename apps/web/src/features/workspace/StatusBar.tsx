import { useCanvasStore } from "@/store/canvasStore";
import { formatCoord } from "@/lib/units";
import { usePrefsStore } from "@/store/prefsStore";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function StatusBar() {
  const coordFormat = usePrefsStore((s) => s.coordFormat);
  const cursor = useCanvasStore((s) => s.cursor);

  const { ortho, polar, osnap, toggleOrtho, togglePolar, toggleOsnap } = usePrefsStore();

  return (
    <div className={WORKSPACE_STYLES.statusbar + " absolute bottom-0 right-0 z-30 flex h-7 items-center gap-4 rounded-tl-lg shadow-lg backdrop-blur-md"}>
      <div className="flex gap-4 font-mono text-muted-foreground">
        <span>X: {cursor ? formatCoord(cursor, coordFormat) : "---"}</span>
        <span>Y: {cursor ? formatCoord(cursor, coordFormat) : "---"}</span>
        <span>Z: 0.00</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex gap-3 text-xs">
        <button className="transition-colors hover:text-foreground">SNAP</button>
        <button 
          onClick={toggleOrtho} 
          className={`transition-colors hover:text-foreground ${ortho ? "font-bold text-primary" : "text-muted-foreground"}`}
        >
          ORTHO
        </button>
        <button 
          onClick={togglePolar} 
          className={`transition-colors hover:text-foreground ${polar ? "font-bold text-primary" : "text-muted-foreground"}`}
        >
          POLAR
        </button>
        <button 
          onClick={toggleOsnap} 
          className={`transition-colors hover:text-foreground ${osnap ? "font-bold text-primary" : "text-muted-foreground"}`}
        >
          OSNAP
        </button>
      </div>
    </div>
  );
}
