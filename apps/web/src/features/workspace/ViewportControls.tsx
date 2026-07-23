import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function ViewportControls() {
  return (
    <div className="absolute top-4 left-20 z-20 flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
      <button className={WORKSPACE_STYLES.btnGhost}>[-]</button>
      <span>|</span>
      <button className={WORKSPACE_STYLES.btnGhost}>[Top]</button>
      <span>|</span>
      <button className={WORKSPACE_STYLES.btnGhost}>[2D Wireframe]</button>
    </div>
  );
}
