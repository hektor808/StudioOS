import { create } from "zustand";

export type PlaybackSource = {
  sourceId: string;
  trackId: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  playbackUrl: string;
};

export type AudioState = {
  source: PlaybackSource | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
};

export type AudioActions = {
  selectSource: (source: PlaybackSource) => void;
  clearSource: () => void;
  setVolume: (volume: number) => void;
  reportPlaying: (isPlaying: boolean) => void;
  reportCurrentTime: (seconds: number) => void;
  reportDuration: (seconds: number) => void;
};

export type AudioStore = AudioState & AudioActions;

export const initialAudioState: AudioState = {
  source: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
};

function finiteNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export const useAudioStore = create<AudioStore>((set) => ({
  ...initialAudioState,
  selectSource: (source) =>
    set((state) => {
      const preservesTelemetry =
        state.source?.sourceId === source.sourceId &&
        state.source.playbackUrl === source.playbackUrl;

      return preservesTelemetry
        ? { source }
        : {
            source,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          };
    }),
  clearSource: () =>
    set((state) => ({
      ...initialAudioState,
      volume: state.volume,
    })),
  setVolume: (volume) =>
    set({ volume: clamp(finiteNonNegative(volume), 0, 1) }),
  reportPlaying: (isPlaying) => set({ isPlaying }),
  reportCurrentTime: (seconds) =>
    set((state) => {
      const nextTime = finiteNonNegative(seconds);
      return {
        currentTime:
          state.duration > 0 ? clamp(nextTime, 0, state.duration) : nextTime,
      };
    }),
  reportDuration: (seconds) =>
    set((state) => {
      const duration = finiteNonNegative(seconds);
      return {
        duration,
        currentTime:
          duration > 0 ? clamp(state.currentTime, 0, duration) : state.currentTime,
      };
    }),
}));

export function resetAudioStore() {
  useAudioStore.setState(initialAudioState);
}
