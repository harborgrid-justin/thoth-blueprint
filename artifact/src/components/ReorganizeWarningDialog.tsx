import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type AppNode, type AppZoneNode } from "@/lib/types";
import { isNodeInsideZone } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

interface ReorganizeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  zones: AppZoneNode[];
  nodes: AppNode[];
}

export function ReorganizeWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  zones,
  nodes,
}: ReorganizeWarningDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // Calculate table counts and locked zones
  const { tablesInZones: tablesInZonesCount, tablesOutsideZones: tablesOutsideZonesCount, lockedZonesCount } = useMemo(() => {
    let inZones = 0;
    let outsideZones = 0;
    let lockedZones = 0;

    nodes.forEach(node => {
      let foundInZone = false;
      for (const zone of zones) {
        if (isNodeInsideZone(node, zone)) {
          foundInZone = true;
          break;
        }
      }
      if (foundInZone) {
        inZones++;
      } else {
        outsideZones++;
      }
    });

    // Count locked zones
    lockedZones = zones.filter(zone => zone.data?.isLocked).length;

    return { tablesInZones: inZones, tablesOutsideZones: outsideZones, lockedZonesCount: lockedZones };
  }, [zones, nodes]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Reorganize Tables Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-800 mb-2">
                This action will reorganize your tables and may affect their positions:
              </p>
              
              <ul className="text-sm text-yellow-700 space-y-1">
                {zones.length > 0 && (
                  <>
                    <li>• {tablesInZonesCount} table(s) inside {zones.length} zone(s) will be reorganized within their zones</li>
                    {lockedZonesCount > 0 && (
                      <li>• {lockedZonesCount} locked zone(s) will be preserved (tables inside will not be moved)</li>
                    )}
                  </>
                )}
                {tablesOutsideZonesCount > 0 && (
                  <li>• {tablesOutsideZonesCount} table(s) outside zones will have their positions reset</li>
                )}
                {zones.length === 0 && (
                  <li>• All {tablesOutsideZonesCount} tables will have their positions reset</li>
                )}
                <li>• Tables outside zones will not be moved into zones automatically</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> 
                {lockedZonesCount > 0 
                  ? ` ${lockedZonesCount} locked zone(s) will be preserved during reorganization. `
                  : ""
                }
                Tables outside zones will not be automatically moved into zones. 
                To move tables into zones, drag them manually.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continue with Reorganization
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}