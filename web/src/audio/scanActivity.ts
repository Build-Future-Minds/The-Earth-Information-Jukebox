// Whether any picture scan is playing right now. The Earth band listens to this: the scan plays its
// own chords on its own clock (scanScore.ts, rootNoteAt), and two sets of chords at different
// times would clash, so the band fades out while a scan plays and comes back when it stops.
// Only a signal: it never changes what either of them plays.

const playing = new Set<object>();
const listeners = new Set<(on: boolean) => void>();

/** A scan player reports its state here (scanPlayer.ts). */
export function setScanPlaying(player: object, on: boolean): void {
  const before = playing.size > 0;
  if (on) playing.add(player);
  else playing.delete(player);
  const after = playing.size > 0;
  if (after !== before) for (const fn of listeners) fn(after);
}

export function scanPlaying(): boolean {
  return playing.size > 0;
}

/** Be told when the first scan starts or the last one stops. Returns the way to stop listening. */
export function onScanPlaying(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
