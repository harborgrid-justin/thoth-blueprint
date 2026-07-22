import { useState } from 'react';
import { FeatureLineEngine, type FeatureLine, type PanoramaElevationEditorRow } from '@thoth/domain';

export function usePanoramaEditor() {
  const engine = new FeatureLineEngine();
  const [featureLine, setFeatureLine] = useState<FeatureLine>(() =>
    engine.createFeatureLine('site-1', 'Main Ridge Line', [
      { x: 100, y: 100, z: 50.0 },
      { x: 250, y: 100, z: 53.0 },
      { x: 400, y: 150, z: 59.0 },
      { x: 550, y: 200, z: 62.5 },
    ])
  );

  const [rows, setRows] = useState<PanoramaElevationEditorRow[]>(() =>
    engine.generatePanoramaElevationEditor(featureLine)
  );

  const [autoRebuild, setAutoRebuild] = useState(true);
  const [targetGrade, setTargetGrade] = useState<number>(4.0);

  const handleApplySlope = () => {
    const updated = engine.setGradeSlopeBetweenPoints(featureLine, 0, featureLine.points.length - 1, targetGrade);
    setFeatureLine(updated);
    setRows(engine.generatePanoramaElevationEditor(updated));
  };

  const handleDeletePI = (idx: number) => {
    if (featureLine.points.length <= 2) return;
    const updated = engine.deletePI(featureLine, idx);
    setFeatureLine(updated);
    setRows(engine.generatePanoramaElevationEditor(updated));
  };

  return {
    featureLine,
    rows,
    autoRebuild,
    setAutoRebuild,
    targetGrade,
    setTargetGrade,
    handleApplySlope,
    handleDeletePI,
  };
}
