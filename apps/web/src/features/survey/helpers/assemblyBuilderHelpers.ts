import type { Subassembly, Assembly } from "@thoth/domain";

export function formatSubassemblySummary(sub: Subassembly) {
  const paramCount = sub.parameters ? sub.parameters.length : 0;
  return `${sub.name} (${sub.side}) - ${paramCount} params`;
}

export function totalAssemblyWidth(assembly: Assembly): {
  leftWidth: number;
  rightWidth: number;
  totalWidth: number;
} {
  const getWidth = (subs: Subassembly[]) =>
    subs.reduce((acc, s) => {
      const widthParam = s.parameters?.find((p) => p.name === "Width");
      const val = widthParam ? Number(widthParam.value) : 0;
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

  const leftWidth = getWidth(assembly.leftSubassemblies);
  const rightWidth = getWidth(assembly.rightSubassemblies);

  return {
    leftWidth,
    rightWidth,
    totalWidth: leftWidth + rightWidth,
  };
}

