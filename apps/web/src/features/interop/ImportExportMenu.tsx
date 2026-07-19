import * as React from "react";
import {
  Box,
  Boxes,
  Download,
  FileImage,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Mountain,
  Upload,
} from "lucide-react";
import {
  createId,
  pointCloudToSpots,
  spotsToPointCloud,
  type PointCloudFormat,
  type SpotElevationPoint,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useInteropStore } from "@/store/interopStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pickFile } from "./fileIo";
import { importPointCloudFile, exportPointCloud, POINT_CLOUD_ACCEPT, POINT_CLOUD_FORMATS } from "./pointCloudIo";
import { importMeshFile, MESH_ACCEPT } from "./meshIo";
import { exportPlanPng, exportSiteDae } from "./blueprintExport";
import { importUnderlayImage } from "./underlayIo";

/** The Import / Export menu: mesh, point-cloud, and blueprint interchange. */
export function ImportExportMenu() {
  const [busy, setBusy] = React.useState(false);
  const addCloud = useInteropStore((s) => s.addCloud);
  const addMesh = useInteropStore((s) => s.addMesh);
  const setUnderlay = useInteropStore((s) => s.setUnderlay);
  const addElements = useWorkspaceStore((s) => s.addElements);

  async function run(label: string, fn: () => Promise<void> | void) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const site = () => useWorkspaceStore.getState().site;

  async function importMesh() {
    const file = await pickFile(MESH_ACCEPT);
    if (!file) return;
    await run("Mesh import", async () => {
      const object = await importMeshFile(file);
      addMesh({ id: createId("mesh"), name: file.name, object, visible: true });
    });
  }

  async function importCloud(asTerrain: boolean) {
    const file = await pickFile(POINT_CLOUD_ACCEPT);
    if (!file) return;
    await run("Point-cloud import", async () => {
      const { name, cloud } = await importPointCloudFile(file);
      if (asTerrain) {
        const s = site();
        if (!s) return;
        const layerId = s.layers.find((l) => l.id === "layer-terrain")?.id ?? s.layers[0].id;
        const spots = pointCloudToSpots(cloud, layerId) as SpotElevationPoint[];
        addElements(spots);
      } else {
        addCloud({ id: createId("cloud"), name, cloud, visible: true });
      }
    });
  }

  async function importUnderlay() {
    const file = await pickFile("image/png,image/jpeg,.png,.jpg,.jpeg");
    if (!file) return;
    await run("Blueprint import", async () => {
      const s = site();
      if (!s) return;
      setUnderlay(await importUnderlayImage(file, s));
    });
  }

  async function exportPng() {
    const s = site();
    if (!s) return;
    await run("PNG export", () => exportPlanPng(s));
  }

  function exportDae() {
    const s = site();
    if (!s) return;
    void run("COLLADA export", () => exportSiteDae(s));
  }

  function exportCloud(format: PointCloudFormat) {
    const s = site();
    if (!s) return;
    const spots = s.elements.filter((e): e is SpotElevationPoint => e.kind === "spot");
    if (spots.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert("No terrain spot elevations to export. Add spot elevations or import a point cloud as terrain first.");
      return;
    }
    void run("Point-cloud export", () => exportPointCloud(spotsToPointCloud(spots), format, `${s.name}-cloud`));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          <span className="hidden md:inline">File</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Import</DropdownMenuLabel>
        <DropdownMenuItem onClick={importMesh}>
          <Boxes /> Mesh <span className="ml-auto text-[10px] text-muted-foreground">obj·dae·fbx·stl·gltf</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => importCloud(false)}>
          <Upload /> Point cloud <span className="ml-auto text-[10px] text-muted-foreground">reference</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => importCloud(true)}>
          <Mountain /> Point cloud → terrain <span className="ml-auto text-[10px] text-muted-foreground">spots</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={importUnderlay}>
          <ImageIcon /> Blueprint image <span className="ml-auto text-[10px] text-muted-foreground">png·jpg</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportPng}>
          <FileImage /> Plan as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportDae}>
          <Box /> Model as COLLADA (.dae)
        </DropdownMenuItem>
        <DropdownMenuLabel className="pt-1 text-[10px]">Point cloud (terrain)</DropdownMenuLabel>
        <div className="flex flex-wrap gap-1 px-2 pb-1.5">
          {POINT_CLOUD_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => exportCloud(f)}
              className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Download className="h-3 w-3" /> {f}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
