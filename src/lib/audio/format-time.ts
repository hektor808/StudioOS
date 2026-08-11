export function formatPlaybackTime(seconds: number): string {
  const wholeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  const paddedSeconds = remainingSeconds.toString().padStart(2, "0");

  if (hours === 0) {
    return `${minutes}:${paddedSeconds}`;
  }

  return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
}
