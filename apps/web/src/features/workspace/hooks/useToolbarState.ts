import { useWorkspaceStore } from "@/store/workspaceStore";
import { TOOLS } from "@/lib/tools";

export function useToolbarState() {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const canUndo = useWorkspaceStore((s) => s.history.past.length > 0);
  const canRedo = useWorkspaceStore((s) => s.history.future.length > 0);

  return {
    tools: TOOLS,
    activeTool,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
