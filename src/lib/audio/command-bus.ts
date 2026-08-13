export type AudioCommand = {
  type: "seek";
  sourceId: string;
  seconds: number;
};

export type AudioCommandListener = (command: AudioCommand) => void;

const listeners = new Set<AudioCommandListener>();

export function subscribeToAudioCommands(listener: AudioCommandListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestAudioSeek(sourceId: string, seconds: number) {
  if (!sourceId || !Number.isFinite(seconds)) return;
  const command: AudioCommand = {
    type: "seek",
    sourceId,
    seconds: Math.max(0, seconds),
  };
  listeners.forEach((listener) => listener(command));
}
