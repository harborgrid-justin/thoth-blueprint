import { TOOLS, toolDef, type ToolId, type ToolDef } from "@/lib/tools";
import { elementMeta } from "@/lib/elementMeta";

export function isGroupStart(
  index: number,
  tools: typeof TOOLS = TOOLS,
): boolean {
  return index > 0 && tools[index - 1].group !== tools[index].group;
}

export function getToolDefinition(id: ToolId): ToolDef {
  return toolDef(id);
}

export function getToolMeta(tool: ToolDef) {
  if (tool.kind) {
    return elementMeta(tool.kind);
  }
  return null;
}
