import { buildKnightsbridgePlatFromScratch as buildSite } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function buildKnightsbridgePlatFromScratch() {
  const site = buildSite();
  useWorkspaceStore.getState().loadSitePreset(site, site.name);
  return site;
}
