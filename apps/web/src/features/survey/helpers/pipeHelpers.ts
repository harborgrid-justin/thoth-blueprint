import { validatePipeNetwork, type PipeDesignRules } from "@thoth/domain";

export function initializeNodeInverts(
  networks: any[],
  site: any,
  terrainSurface: any,
): Record<string, number> {
  const initInverts: Record<string, number> = {};
  if (site && terrainSurface) {
    for (const net of networks) {
      for (const node of net.nodes) {
        initInverts[node.id] = 4.0;
      }
    }
  }
  return initInverts;
}

export function runPipeValidation({
  activeNet,
  terrainSurface,
  rules,
  inverts,
}: {
  activeNet: any;
  terrainSurface: any;
  rules: PipeDesignRules;
  inverts: Record<string, number>;
}) {
  if (!activeNet || !terrainSurface) {
    return null;
  }
  return validatePipeNetwork(activeNet, terrainSurface, rules, inverts);
}
