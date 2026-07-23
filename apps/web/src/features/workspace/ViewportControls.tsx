import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function ViewportControls() {
  return (
    <div className="absolute top-4 left-20 z-20 flex select-none items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
      <button className={WORKSPACE_STYLES.btnGhost}>[-]</button>
      <span>|</span>
      <button className={WORKSPACE_STYLES.btnGhost}>[Top]</button>
      <span>|</span>
      <button className={WORKSPACE_STYLES.btnGhost}>[2D Wireframe]</button>
    </div>
  );
}
