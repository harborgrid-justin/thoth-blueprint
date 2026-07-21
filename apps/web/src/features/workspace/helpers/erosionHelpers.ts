import { type SimulationFrame } from "@thoth/domain";
import { formatNumber, formatPercent, formatRatio } from "@/lib/format";

export function checkErosionCompliance(frame: SimulationFrame) {
  const highSoilLoss = frame.totalSoilLostKg > 50;
  const barrierOverflow = frame.barrierStats.some((b) => b.loadRatio >= 0.9);
  const complies = !highSoilLoss && !barrierOverflow;

  const formattedSoilLost = formatNumber(frame.totalSoilLostKg, 1);
  const formattedWaterRunoff = formatNumber(frame.totalWaterRunoffLiters, 0);
  const soilLossRatio = formatRatio(frame.totalSoilLostKg / 50);

  return {
    highSoilLoss,
    barrierOverflow,
    complies,
    formattedSoilLost,
    formattedWaterRunoff,
    soilLossRatio,
  };
}

export function formatBarrierCapacity(loadRatio: number) {
  return {
    percentText: formatPercent(loadRatio, 0),
    ratioText: formatRatio(loadRatio),
  };
}
