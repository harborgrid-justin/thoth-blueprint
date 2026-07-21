import * as React from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useErosionStore } from "@/store/erosionStore";
import { ErosionSimulator, type SimulationFrame } from "@thoth/domain";
import { checkErosionCompliance } from "../helpers/erosionHelpers";

export function useErosionSimulatorState() {
  const site = useWorkspaceStore((s) => s.site);
  const {
    currentFrame,
    isPlaying,
    activeStep,
    setFrame,
    setPlaying,
    setActiveStep,
  } = useErosionStore();

  const [frames, setFrames] = React.useState<SimulationFrame[]>([]);
  const [speed, setSpeed] = React.useState(100);
  const [soilType, setSoilType] = React.useState<
    "sand" | "silt" | "clay" | "loam"
  >("loam");

  React.useEffect(() => {
    if (!site) {
      return;
    }
    const sim = new ErosionSimulator(site, soilType);
    const recorded = sim.runSimulation(100);
    setFrames(recorded);
    if (recorded.length > 0) {
      setFrame(recorded[0]);
      setActiveStep(0);
    }
  }, [site, soilType, setFrame, setActiveStep]);

  React.useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      const currentStep = useErosionStore.getState().activeStep;
      const next = currentStep + 1;
      if (next >= frames.length) {
        setPlaying(false);
      } else {
        setActiveStep(next);
        setFrame(frames[next]);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, frames, speed, setFrame, setActiveStep, setPlaying]);

  const frame = currentFrame || frames[0];
  const maxStep = Math.max(0, frames.length - 1);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseInt(e.target.value, 10);
    setActiveStep(step);
    setFrame(frames[step]);
  };

  const togglePlay = () => setPlaying(!isPlaying);

  const handleReset = () => {
    setPlaying(false);
    setActiveStep(0);
    setFrame(frames[0]);
  };

  const stepForward = () => {
    if (activeStep < maxStep) {
      setActiveStep(activeStep + 1);
      setFrame(frames[activeStep + 1]);
    }
  };

  const stepBackward = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setFrame(frames[activeStep - 1]);
    }
  };

  const compliance = React.useMemo(
    () => (frame ? checkErosionCompliance(frame) : null),
    [frame],
  );

  return {
    site,
    frames,
    frame,
    maxStep,
    activeStep,
    isPlaying,
    speed,
    setSpeed,
    soilType,
    setSoilType,
    handleScrub,
    togglePlay,
    handleReset,
    stepForward,
    stepBackward,
    compliance,
  };
}
