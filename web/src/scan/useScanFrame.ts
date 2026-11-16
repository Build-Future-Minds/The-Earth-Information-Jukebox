// The picture scan's drawing loop, shared by every view that shows the scan. Each frame it asks the
// player where the line is (the audio clock), works out the levels under the line, moves the bars
// and the readout beside the picture, and hands the moment to the view, which draws its own line
// (the flat picture: SVG; the globe: its shader).
import { useEffect, useRef } from 'react';
import type { Region } from '../data/types';
import { noteName, rootNoteAt, type ScanGrid } from '../audio/scanScore';
import { longitude, type Scan } from './useScan';

/** One moment of the scan, for a view to draw. */
export interface ScanMoment {
  /** How far through the sweep the line is, 0 to 1 (whole seconds only under reduced motion). */
  position: number;
  /** Level of each band under the line right now, gliding from one column to the next as the sound does. */
  levels: Float32Array;
  grid: ScanGrid;
  region: Region | undefined;
  frame: { width: number; height: number };
  playing: boolean;
}

/**
 * Draw with the sound. One loop runs for as long as the scan is on the page, and on every frame
 * it asks the player itself where the line is. It must not wait for React to report "playing":
 * choosing another scan while one plays stops and restarts the player within one tick, React
 * sees "playing" before and after and re-renders nothing, and a loop tied to that change was
 * never restarted. The notes played and the needle stood still (found and fixed 15 Nov).
 */
export function useScanFrame(scan: Scan, drawView: (moment: ScanMoment) => void) {
  const { score, state, region, frame, worldMap, reducedMotion, player, side, setTraces } = scan;
  const view = useRef(drawView);
  view.current = drawView;
  const drawFrame = useRef<(now: number) => void>(() => {});
  /** Set whenever something other than the moving line changes what should be on screen. */
  const redraw = useRef(true);
  const drawn = useRef({ position: 0, textAt: 0, levels: new Float32Array(0) });
  useEffect(() => {
    redraw.current = true;
    drawFrame.current = (now: number) => {
      const p = player.current;
      if (!score || !p) return;
      const playing = p.getState() === 'playing';
      if (!playing && !redraw.current) return; // nothing is moving: leave the picture as it is
      redraw.current = false;
      const grid = score.grid;
      const cyclic = score.shape === 'radar';
      if (drawn.current.levels.length !== grid.bands) drawn.current.levels = new Float32Array(grid.bands);
      const levels = drawn.current.levels;

      let position = p.position();
      // Reduced motion: the line jumps once a second instead of gliding.
      if (reducedMotion) position = Math.floor(position * grid.seconds) / grid.seconds;
      // A new sweep starts with a clean picture.
      if (position < drawn.current.position - 0.5) setTraces([]);
      drawn.current.position = position;

      // Levels under the line right now, gliding from one column to the next as the sound does.
      const at = position * grid.columns;
      const c0 = Math.min(grid.columns - 1, Math.floor(at));
      const c1 = cyclic ? (c0 + 1) % grid.columns : Math.min(grid.columns - 1, c0 + 1);
      const mix = reducedMotion ? 0 : at - c0;
      let sounding = 0;
      let mean = 0;
      for (let band = 0; band < grid.bands; band++) {
        const level = score.levels[c0 * grid.bands + band] * (1 - mix) + score.levels[c1 * grid.bands + band] * mix;
        levels[band] = level;
        mean += level / grid.bands;
        if (level > 0) sounding++;
        side.bars.current[band]?.style.setProperty('--level', level.toFixed(3));
      }
      side.rootBar.current?.style.setProperty('--level', Math.min(1, mean * 2).toFixed(3));

      view.current({ position, levels, grid, region, frame, playing });

      // Text a few times a second is enough, and easier to read than a blur of digits.
      if (now - drawn.current.textAt > 240 || !playing) {
        drawn.current.textAt = now;
        const root = noteName(rootNoteAt(grid, c0));
        if (side.rootName.current) side.rootName.current.textContent = root;
        if (side.readout.current) {
          const where = region
            ? `line at ${Math.round(position * 360)}° (0° is east, turning anticlockwise)`
            : worldMap
              ? `line at about ${longitude(position)}`
              : `line ${Math.round(position * 100)}% of the way across`;
          side.readout.current.textContent = `${where} · ${sounding} of ${grid.bands} bands sounding · low note ${root}`;
        }
      }
    };
  }, [score, state, region, frame.width, frame.height, worldMap, reducedMotion]);
  useEffect(() => {
    let raf = requestAnimationFrame(function tick(now) {
      drawFrame.current(now);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return redraw;
}
