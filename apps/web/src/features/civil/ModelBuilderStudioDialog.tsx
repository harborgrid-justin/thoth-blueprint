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
import { useModelBuilderStudioState } from "./hooks/useModelBuilderStudioState";

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
    boundsInfo,
    commitGisModel,
  } = useModelBuilderStudioState();

  const [activeTab, setActiveTab] = useState<
    "bbox" | "layers" | "generate"
  >("bbox");

  if (!isOpen) return null;

  const handleCommit = () => {
    commitGisModel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-950 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                GIS & Model Builder Studio
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                OpenStreetMap Vector Roads • DEM Terrain TIN • 3D City Generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 space-x-2">
          {[
            { id: "bbox", label: "1. Geographic Bounding Box & CRS", icon: Globe },
            { id: "layers", label: "2. Vector & Terrain Layers", icon: Layers },
            { id: "generate", label: "3. 3D Model Generator", icon: Box },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-purple-400 text-purple-400 bg-purple-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "bbox" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-purple-300">Coordinate Reference System & BBox</h3>
                <div>
                  <Label className="text-xs text-slate-400">Target CRS Projection</Label>
                  <select
                    value={crs}
                    onChange={(e) => setCrs(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-purple-300"
                  >
                    <option value="EPSG:4326 (WGS 84)">EPSG:4326 (WGS 84 Geographic)</option>
                    <option value="EPSG:3857 (Web Mercator)">EPSG:3857 (Web Mercator Projection)</option>
                    <option value="NAD83 State Plane">NAD83 / California State Plane Zone III</option>
                    <option value="UTM Zone 10N">UTM Zone 10N (US GS Standard)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Min Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={minLat}
                      onChange={(e) => setMinLat(Number(e.target.value))}
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-purple-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Max Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={maxLat}
                      onChange={(e) => setMaxLat(Number(e.target.value))}
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-purple-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Min Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={minLon}
                      onChange={(e) => setMinLon(Number(e.target.value))}
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-purple-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Max Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={maxLon}
                      onChange={(e) => setMaxLon(Number(e.target.value))}
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-purple-300"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-purple-400 mb-3">Model Footprint Metrics</h3>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono space-y-2 text-xs">
                    <div>Extent Length: <strong className="text-purple-300">{boundsInfo.lonDistFt} ft</strong></div>
                    <div>Extent Width: <strong className="text-purple-300">{boundsInfo.latDistFt} ft</strong></div>
                    <div>Total Coverage: <strong className="text-emerald-400">{boundsInfo.acres} Acres</strong></div>
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Generate 3D GIS Site Model
                </Button>
              </div>
            </div>
          )}

          {activeTab === "layers" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-purple-300">Data Layers to Extract</h3>
              <div className="space-y-3 text-xs">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={importRoads}
                    onChange={(e) => setImportRoads(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500"
                  />
                  <span>OpenStreetMap Vector Road Network (Highways, Arterials, Local Roads)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={importBuildings}
                    onChange={(e) => setImportBuildings(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500"
                  />
                  <span>3D Building Footprints & Extrusions</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={importTerrain}
                    onChange={(e) => setImportTerrain(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500"
                  />
                  <span>DEM Digital Elevation Model Terrain Mesh</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "generate" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-semibold text-purple-300">Ready to Build GIS Site Model</h3>
              <p className="text-slate-300">
                Extracted layers will be converted to native project elements and 3D TIN surfaces on the workspace canvas.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-400">
          <span>GIS Studio: OpenStreetMap & USGS DEM Engine</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Generate Model
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
