import { create } from "zustand";
import { type SimulationFrame } from "@thoth/domain";

interface ErosionState {
  currentFrame: SimulationFrame | null;
  isPlaying: boolean;
  activeStep: number;
  setFrame: (frame: SimulationFrame | null) => void;
  setPlaying: (playing: boolean) => void;
  setActiveStep: (step: number) => void;
}

export const useErosionStore = create<ErosionState>((set) => ({
  currentFrame: null,
  isPlaying: false,
  activeStep: 0,
  setFrame: (frame) => set({ currentFrame: frame }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setActiveStep: (step) => set({ activeStep: step }),
}));
