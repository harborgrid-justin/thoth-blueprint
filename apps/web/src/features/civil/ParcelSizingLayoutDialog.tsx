import React, { useState } from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteManager, type ParcelLayoutParameters, type UserDefinedClassificationData, type ParcelStyle } from '@thoth/domain';

export const ParcelSizingLayoutDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const siteMgr = new SiteManager();
  const defaultStyle: ParcelStyle = { id: 's1', name: 'Property Boundary', boundaryColor: '#00FF00', linetype: 'CONTINUOUS', layer: 'C-PROP' };

  const [site] = useState(() => {
    const s = siteMgr.createSite('Subdivision Phase II', 101);
    siteMgr.generateParcelFromGeometry(s.id, [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 }], defaultStyle);
    siteMgr.generateParcelFromGeometry(s.id, [{ x: 200, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 200, y: 200 }], defaultStyle);
    return s;
  });

  const [layoutParams, setLayoutParams] = useState<ParcelLayoutParameters>({
    minimumAreaSqFt: 10000,
    minimumFrontageFt: 75,
    frontageOffsetFt: 25,
    minimumWidthFt: 75,
    minimumDepthFt: 120,
    maximumDepthFt: 250,
    layoutPreference: 'shortest_frontage',
    remainderDistribution: 'last_parcel',
  });

  const [startNum, setStartNum] = useState<number>(200);
  const [increment, setIncrement] = useState<number>(10);
  const [nameTemplate, setNameTemplate] = useState<string>('LOT-[COUNTER]');
  const [renumberedParcels, setRenumberedParcels] = useState<any[]>([]);

  const [globalElev, setGlobalElev] = useState<number>(145.0);
  const [elevUpdatedMsg, setElevUpdatedMsg] = useState<string | null>(null);

  const [classification, setClassification] = useState<UserDefinedClassificationData>({
    zoningDistrict: 'R-2 Residential',
    maxImperviousRatio: 0.35,
    ownerName: 'Vanguard Properties LLC',
  });

  const handleExecuteSubdivision = () => {
    const parentParcelId = site.parcels[0]?.id;
    if (!parentParcelId) return;
    siteMgr.executeSlideLineSubdivision(
      site.id,
      parentParcelId,
      { start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
      layoutParams
    );
  };

  const handleRenumberFence = () => {
    const updated = siteMgr.renumberParcelsAlongFence(
      site.id,
      { start: { x: 0, y: 100 }, end: { x: 500, y: 100 } },
      startNum,
      increment,
      nameTemplate
    );
    setRenumberedParcels([...updated]);
  };

  const handleApplyElevations = () => {
    const parcelIds = site.parcels.map(p => p.id);
    const updated = siteMgr.editParcelElevationsGlobally(site.id, parcelIds, globalElev);
    setElevUpdatedMsg(`Updated elevation to ${globalElev} ft across ${updated.length} parcels.`);
  };

  const handleApplyClassification = () => {
    if (site.parcels[0]) {
      siteMgr.editParcelUserDefinedClassification(site.id, site.parcels[0].id, classification);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-background border-border text-foreground p-6 animate-dialog-in">
        <DialogHeader className={CIVIL_STYLES.sectionHeaderContainer}>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <div className={`${CIVIL_STYLES.titlePulseDot} bg-cyan-400`} />
            Parcel Sizing & Layout Controls (REQ-118 to REQ-129)
          </DialogTitle>
        </DialogHeader>

        {/* Form grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Column 1: Layout Controls */}
          <div className="flex flex-col gap-3 bg-background p-3 rounded-lg border border-border">
            <span className="font-semibold text-cyan-300 border-b border-border pb-1">
              Automated Layout Sizing (REQ-118 to REQ-122)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-muted-foreground">Min Area (sq ft):</label>
                <Input
                  type="number"
                  value={layoutParams.minimumAreaSqFt}
                  onChange={(e) => setLayoutParams({ ...layoutParams, minimumAreaSqFt: Number(e.target.value) })}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Min Frontage (ft):</label>
                <Input
                  type="number"
                  value={layoutParams.minimumFrontageFt}
                  onChange={(e) => setLayoutParams({ ...layoutParams, minimumFrontageFt: Number(e.target.value) })}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-muted-foreground">Max Depth (ft):</label>
                <Input
                  type="number"
                  value={layoutParams.maximumDepthFt}
                  onChange={(e) => setLayoutParams({ ...layoutParams, maximumDepthFt: Number(e.target.value) })}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Layout Preference:</label>
                <select
                  value={layoutParams.layoutPreference}
                  onChange={(e) => setLayoutParams({ ...layoutParams, layoutPreference: e.target.value as any })}
                  className="w-full bg-card border border-input rounded px-2 py-1 text-foreground h-8 text-xs"
                >
                  <option value="shortest_frontage">Shortest Frontage (REQ-121)</option>
                  <option value="equal_area">Equal Area</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleExecuteSubdivision}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow transition mt-1"
            >
              Run Automated Slide-Line Subdivision
            </Button>
          </div>

          {/* Column 2: Renumbering & Elevations */}
          <div className="flex flex-col gap-3 bg-background p-3 rounded-lg border border-border">
            <span className="font-semibold text-cyan-300 border-b border-border pb-1">
              Renumbering & Properties (REQ-123 to REQ-128)
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-muted-foreground">Start Num:</label>
                <Input
                  type="number"
                  value={startNum}
                  onChange={(e) => setStartNum(Number(e.target.value))}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Increment:</label>
                <Input
                  type="number"
                  value={increment}
                  onChange={(e) => setIncrement(Number(e.target.value))}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Template:</label>
                <Input
                  type="text"
                  value={nameTemplate}
                  onChange={(e) => setNameTemplate(e.target.value)}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>

            <Button
              onClick={handleRenumberFence}
              variant="outline"
              size="sm"
              className="bg-muted hover:bg-accent text-cyan-300 border-input font-medium"
            >
              Renumber Parcels Along Fence
            </Button>

            {renumberedParcels.length > 0 && (
              <div className="font-mono text-[11px] text-cyan-300">
                Renumbered: {renumberedParcels.map(p => p.name).join(', ')}
              </div>
            )}

            <div className="border-t border-border pt-2 flex items-center gap-2">
              <label className="text-muted-foreground">Global Elevation (ft):</label>
              <Input
                type="number"
                value={globalElev}
                onChange={(e) => setGlobalElev(Number(e.target.value))}
                className="w-20 bg-card border-input text-foreground h-8 text-xs"
              />
              <Button
                onClick={handleApplyElevations}
                variant="outline"
                size="sm"
                className="h-8 text-[11px] px-2 bg-muted border-input"
              >
                Apply (REQ-125)
              </Button>
            </div>

            {elevUpdatedMsg && <div className="text-[11px] text-emerald-400">{elevUpdatedMsg}</div>}
          </div>
        </div>

        {/* User Defined Classification */}
        <div className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2 text-xs">
          <span className="font-semibold text-cyan-300">User Defined Classification Properties (REQ-128)</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-muted-foreground">Zoning District:</label>
              <Input
                type="text"
                value={classification.zoningDistrict}
                onChange={(e) => setClassification({ ...classification, zoningDistrict: e.target.value })}
                className="bg-card border-input text-foreground h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-muted-foreground">Max Impervious Ratio:</label>
              <Input
                type="number"
                step="0.05"
                value={classification.maxImperviousRatio}
                onChange={(e) => setClassification({ ...classification, maxImperviousRatio: Number(e.target.value) })}
                className="bg-card border-input text-foreground h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-muted-foreground">Owner Name:</label>
              <Input
                type="text"
                value={classification.ownerName}
                onChange={(e) => setClassification({ ...classification, ownerName: e.target.value })}
                className="bg-card border-input text-foreground h-8 text-xs"
              />
            </div>
          </div>
          <Button
            onClick={handleApplyClassification}
            size="sm"
            className="self-end bg-cyan-700 hover:bg-cyan-600 text-white font-medium"
          >
            Save User Classification Data
          </Button>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border pt-3">
          <Button onClick={onClose} variant="outline" size="sm" className="border-input text-foreground bg-muted hover:bg-accent">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
