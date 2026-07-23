import React, { useState } from 'react';
import { CIVIL_STYLES } from "./styles/civilDesignSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createLineFromGridCoordinates,
  createLineFromLatLon,
  createLineFromDeflectionAngle,
  calculatePointFromStationOffset,
  createLineTangentFromPoint,
  createLinePerpendicularFromPoint,
  createRightOfWayParcel,
  type LineSegment,
  type Point2D,
} from '@thoth/domain';

export const AdvancedLineworkGeometryDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'latlon' | 'deflection' | 'station' | 'tangent' | 'row'>('grid');

  // State for Grid coordinates (REQ-109)
  const [gridStart, setGridStart] = useState({ northing: 1000, easting: 500 });
  const [gridEnd, setGridEnd] = useState({ northing: 1200, easting: 700 });
  const [gridResultLine, setGridResultLine] = useState<LineSegment | null>(null);

  // State for Lat/Lon (REQ-110)
  const [latLonStart, setLatLonStart] = useState({ lat: 38.8977, lon: -77.0365 });
  const [latLonEnd, setLatLonEnd] = useState({ lat: 38.8985, lon: -77.0350 });
  const [latLonResultLine, setLatLonResultLine] = useState<LineSegment | null>(null);

  // State for Deflection Angle (REQ-111)
  const [startPt, setStartPt] = useState<Point2D>({ x: 100, y: 100 });
  const [refBearing, setRefBearing] = useState<number>(45);
  const [deflectionAngle, setDeflectionAngle] = useState<number>(15);
  const [distFt, setDistFt] = useState<number>(150);
  const [deflectionResultPt, setDeflectionResultPt] = useState<Point2D | null>(null);

  // State for Station/Offset (REQ-112)
  const [staOffsetAlignmentStart] = useState<Point2D>({ x: 0, y: 0 });
  const [staOffsetAlignmentEnd] = useState<Point2D>({ x: 1000, y: 0 });
  const [targetStation, setTargetStation] = useState<number>(500);
  const [targetOffset, setTargetOffset] = useState<number>(50);
  const [staOffsetResultPt, setStaOffsetResultPt] = useState<Point2D | null>(null);

  // State for Tangent & Perpendicular (REQ-113, REQ-114)
  const [tangentResultLine, setTangentResultLine] = useState<LineSegment | null>(null);

  // State for R.O.W. Parcel Tool (REQ-117)
  const [rowWidth, setRowWidth] = useState<number>(50);
  const [rowDepth, setRowDepth] = useState<number>(100);
  const [rowParcelResult, setRowParcelResult] = useState<any>(null);

  const handleCreateGridLine = () => {
    setGridResultLine(createLineFromGridCoordinates(gridStart, gridEnd));
  };

  const handleCreateLatLonLine = () => {
    setLatLonResultLine(createLineFromLatLon(latLonStart, latLonEnd));
  };

  const handleCreateDeflectionLine = () => {
    setDeflectionResultPt(createLineFromDeflectionAngle(startPt, refBearing, deflectionAngle, distFt));
  };

  const handleCalculateStaOffset = () => {
    setStaOffsetResultPt(calculatePointFromStationOffset(staOffsetAlignmentStart, staOffsetAlignmentEnd, targetStation, targetOffset));
  };

  const handleCreateTangentLine = () => {
    setTangentResultLine(createLineTangentFromPoint({ x: 0, y: 0 }, startPt, distFt));
  };

  const handleCreatePerpendicularLine = () => {
    setTangentResultLine(createLinePerpendicularFromPoint(startPt, { start: { x: 0, y: 0 }, end: { x: 200, y: 0 } }));
  };

  const handleCreateROW = () => {
    const res = createRightOfWayParcel({ start: { x: 0, y: 0 }, end: { x: 300, y: 0 } }, rowWidth, rowDepth);
    setRowParcelResult(res);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-input text-foreground p-6">
        <DialogHeader className={CIVIL_STYLES.sectionHeaderContainer}>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <div className={`${CIVIL_STYLES.titlePulseDot} bg-amber-400`} />
            Advanced Linework & Geometry Tools (REQ-109 to REQ-117)
          </DialogTitle>
        </DialogHeader>

        {/* Sub-tabs using pre-existing Tabs UI component */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-background border border-border p-1 w-full justify-start gap-1">
            <TabsTrigger value="grid" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Grid N/E</TabsTrigger>
            <TabsTrigger value="latlon" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Lat/Lon</TabsTrigger>
            <TabsTrigger value="deflection" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Deflection</TabsTrigger>
            <TabsTrigger value="station" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Sta/Offset</TabsTrigger>
            <TabsTrigger value="tangent" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Tangent/Perp</TabsTrigger>
            <TabsTrigger value="row" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">R.O.W.</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab contents */}
        {activeTab === 'grid' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-muted-foreground mb-1 font-semibold">Start Point Grid Coordinates</span>
                <label className="block text-muted-foreground">Northing (Y):</label>
                <Input
                  type="number"
                  value={gridStart.northing}
                  onChange={(e) => setGridStart({ ...gridStart, northing: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs mb-2"
                />
                <label className="block text-muted-foreground">Easting (X):</label>
                <Input
                  type="number"
                  value={gridStart.easting}
                  onChange={(e) => setGridStart({ ...gridStart, easting: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <span className="block text-muted-foreground mb-1 font-semibold">End Point Grid Coordinates</span>
                <label className="block text-muted-foreground">Northing (Y):</label>
                <Input
                  type="number"
                  value={gridEnd.northing}
                  onChange={(e) => setGridEnd({ ...gridEnd, northing: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs mb-2"
                />
                <label className="block text-muted-foreground">Easting (X):</label>
                <Input
                  type="number"
                  value={gridEnd.easting}
                  onChange={(e) => setGridEnd({ ...gridEnd, easting: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleCreateGridLine} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
              Draft Grid Line
            </Button>
            {gridResultLine && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300">
                Created Line: Start({gridResultLine.start.x}, {gridResultLine.start.y}) {'->'} End({gridResultLine.end.x}, {gridResultLine.end.y})
              </div>
            )}
          </div>
        )}

        {activeTab === 'latlon' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-muted-foreground mb-1 font-semibold">Start Lat/Lon (WGS84)</span>
                <label className="block text-muted-foreground">Latitude:</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latLonStart.lat}
                  onChange={(e) => setLatLonStart({ ...latLonStart, lat: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs mb-2"
                />
                <label className="block text-muted-foreground">Longitude:</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latLonStart.lon}
                  onChange={(e) => setLatLonStart({ ...latLonStart, lon: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <span className="block text-muted-foreground mb-1 font-semibold">End Lat/Lon (WGS84)</span>
                <label className="block text-muted-foreground">Latitude:</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latLonEnd.lat}
                  onChange={(e) => setLatLonEnd({ ...latLonEnd, lat: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs mb-2"
                />
                <label className="block text-muted-foreground">Longitude:</label>
                <Input
                  type="number"
                  step="0.0001"
                  value={latLonEnd.lon}
                  onChange={(e) => setLatLonEnd({ ...latLonEnd, lon: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleCreateLatLonLine} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
              Project & Draft Lat/Lon Line
            </Button>
            {latLonResultLine && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300">
                Projected State Plane Feet: Start({latLonResultLine.start.x.toFixed(1)}, {latLonResultLine.start.y.toFixed(1)}) {'->'} End({latLonResultLine.end.x.toFixed(1)}, {latLonResultLine.end.y.toFixed(1)})
              </div>
            )}
          </div>
        )}

        {activeTab === 'deflection' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-muted-foreground">Start Pt X:</label>
                <Input
                  type="number"
                  value={startPt.x}
                  onChange={(e) => setStartPt({ ...startPt, x: Number(e.target.value) })}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Reference Bearing:</label>
                <Input
                  type="number"
                  value={refBearing}
                  onChange={(e) => setRefBearing(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Deflection Angle:</label>
                <Input
                  type="number"
                  value={deflectionAngle}
                  onChange={(e) => setDeflectionAngle(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Distance (ft):</label>
                <Input
                  type="number"
                  value={distFt}
                  onChange={(e) => setDistFt(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleCreateDeflectionLine} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
              Calculate Deflection Endpoint
            </Button>
            {deflectionResultPt && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300">
                Calculated Deflection Endpoint: ({deflectionResultPt.x.toFixed(2)}, {deflectionResultPt.y.toFixed(2)})
              </div>
            )}
          </div>
        )}

        {activeTab === 'station' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground">Target Station (ft):</label>
                <Input
                  type="number"
                  value={targetStation}
                  onChange={(e) => setTargetStation(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Target Offset (+R / -L ft):</label>
                <Input
                  type="number"
                  value={targetOffset}
                  onChange={(e) => setTargetOffset(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleCalculateStaOffset} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
              Calculate Station/Offset Point
            </Button>
            {staOffsetResultPt && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300">
                Point at Sta {targetStation.toFixed(2)}, Off {targetOffset.toFixed(2)}: ({staOffsetResultPt.x.toFixed(2)}, {staOffsetResultPt.y.toFixed(2)})
              </div>
            )}
          </div>
        )}

        {activeTab === 'tangent' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="flex gap-2">
              <Button onClick={handleCreateTangentLine} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
                Draft Tangent Line (REQ-113)
              </Button>
              <Button onClick={handleCreatePerpendicularLine} variant="outline" className="border-input text-amber-300 bg-muted hover:bg-accent">
                Draft Perpendicular Line (REQ-114)
              </Button>
            </div>
            {tangentResultLine && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300">
                Generated Vector: ({tangentResultLine.start.x.toFixed(1)}, {tangentResultLine.start.y.toFixed(1)}) {'->'} ({tangentResultLine.end.x.toFixed(1)}, {tangentResultLine.end.y.toFixed(1)})
              </div>
            )}
          </div>
        )}

        {activeTab === 'row' && (
          <div className="flex flex-col gap-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground">R.O.W. Dedication Width (ft):</label>
                <Input
                  type="number"
                  value={rowWidth}
                  onChange={(e) => setRowWidth(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Remainder Parcel Depth (ft):</label>
                <Input
                  type="number"
                  value={rowDepth}
                  onChange={(e) => setRowDepth(Number(e.target.value))}
                  className="bg-muted border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleCreateROW} className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow">
              Generate Dedicated Right of Way Parcel
            </Button>
            {rowParcelResult && (
              <div className="bg-background p-2.5 rounded font-mono text-cyan-300 flex flex-col gap-1">
                <div>Dedication: {rowParcelResult.rowParcel.name} (Area: {rowParcelResult.rowParcel.areaSqFt.toFixed(0)} sq ft)</div>
                <div>Remainder Polygon Vertices: {rowParcelResult.remainderVertices.length}</div>
              </div>
            )}
          </div>
        )}

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
