import React, { useState } from "react";
import {
  Cloud,
  CheckCircle2,
  Globe,
  Box,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogShell } from "@/components/layout";
import { useModelBuilderStudioState } from "./hooks/useModelBuilderStudioState";
import { CIVIL_STYLES } from "./styles/civilDesignSystem";

interface ModelBuilderStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelBuilderStudioDialog: React.FC<
  ModelBuilderStudioDialogProps
> = ({ isOpen, onClose }) => {
  const {
    crs,
    setCrs,
    minLat,
    setMinLat,
    maxLat,
    setMaxLat,
    minLon,
    setMinLon,
    maxLon,
    setMaxLon,
    importRoads,
    setImportRoads,
    importBuildings,
    setImportBuildings,
    importTerrain,
    setImportTerrain,
    commitGisModel,
  } = useModelBuilderStudioState();

  const [activeTab, setActiveTab] = useState<
    "bbox" | "layers" | "generate"
  >("bbox");

  const handleCommit = () => {
    commitGisModel();
    onClose();
  };

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="GIS ModelBuilder Studio"
      description="Automated GIS Bounding Box Importer for OpenStreetMap Vector Roads, 3D Buildings & DEM Mesh"
      icon={<Cloud className="h-6 w-6 text-purple-400" />}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>GIS Importer: OGC EPSG Standard</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className={CIVIL_STYLES.btnOutline}>
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className={CIVIL_STYLES.btnPrimary}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Build GIS Site Model
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border text-xs font-semibold">
          <button
            onClick={() => setActiveTab("bbox")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "bbox"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4" /> Bounding Box & CRS
          </button>
          <button
            onClick={() => setActiveTab("layers")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "layers"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" /> GIS Feature Layers
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "generate"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Box className="h-4 w-4" /> Generate 3D Site
          </button>
        </div>

        {/* Content Panels */}
        {activeTab === "bbox" && (
          <div className="space-y-4">
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Target CRS Projection (EPSG)</Label>
              <Input
                type="text"
                value={crs}
                onChange={(e) => setCrs(e.target.value)}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={CIVIL_STYLES.fieldLabel}>Min Latitude (Deg)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={minLat}
                  onChange={(e) => setMinLat(Number(e.target.value))}
                  className={CIVIL_STYLES.fieldInput}
                />
              </div>
              <div>
                <Label className={CIVIL_STYLES.fieldLabel}>Max Latitude (Deg)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={maxLat}
                  onChange={(e) => setMaxLat(Number(e.target.value))}
                  className={CIVIL_STYLES.fieldInput}
                />
              </div>
              <div>
                <Label className={CIVIL_STYLES.fieldLabel}>Min Longitude (Deg)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={minLon}
                  onChange={(e) => setMinLon(Number(e.target.value))}
                  className={CIVIL_STYLES.fieldInput}
                />
              </div>
              <div>
                <Label className={CIVIL_STYLES.fieldLabel}>Max Longitude (Deg)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={maxLon}
                  onChange={(e) => setMaxLon(Number(e.target.value))}
                  className={CIVIL_STYLES.fieldInput}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "layers" && (
          <div className="space-y-4">
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={importRoads}
                  onChange={(e) => setImportRoads(e.target.checked)}
                  className="rounded border-input bg-background text-purple-500"
                />
                <span>OpenStreetMap Vector Road Network</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={importBuildings}
                  onChange={(e) => setImportBuildings(e.target.checked)}
                  className="rounded border-input bg-background text-purple-500"
                />
                <span>3D Building Footprints & Extrusions</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={importTerrain}
                  onChange={(e) => setImportTerrain(e.target.checked)}
                  className="rounded border-input bg-background text-purple-500"
                />
                <span>DEM Digital Elevation Model Terrain Mesh</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === "generate" && (
          <div className={CIVIL_STYLES.panelDarkContainer}>
            <h3 className="text-sm font-semibold text-purple-300">Ready to Build GIS Site Model</h3>
            <p className="text-xs text-muted-foreground">
              Extracted layers will be converted to native project elements and 3D TIN surfaces on the workspace canvas.
            </p>
          </div>
        )}
      </div>
    </DialogShell>
  );
};
