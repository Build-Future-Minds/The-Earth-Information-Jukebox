// The beat visualizer: Student B's "Now playing" lane from tools/listening_game.html, brought into
// the app. Each pulse lights up when the real audio reaches it; a playhead and dot move across the
// region's loop. Drag the lane or use the arrow keys to move playback (playing or paused only).
// Marks follow DESIGN.md "Rhythm plot": a tall ink bar for the first pulse of each beat, a shorter
// signal bar for the second. The app's pitch is fixed, so height only tells the two pulses apart.
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EarthTrack } from '../audio/earthVoice';
import { dayLabels } from '../data/sources';
import type { PlayState } from '../audio/transport';

interface Props {
  track: EarthTrack;
  regionLabel: string;
  colour: CSSProperties;
  playState: PlayState;
  speed: number;
  /** Track seconds (speed 1) inside the loop, from the audio clock. */
  getPosition: () => number;
  onSeek: (trackSeconds: number) => void;
}

/** View-box units per second of track; the SVG stretches to the lane's width. */
const U = 20;
const LANE_H = 64;

export function BeatTrack({ track, regionLabel, colour, playState, speed, getPosition, onSeek }: Props) {
  const [pos, setPos] = useState(0);
  const laneRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const active = playState !== 'stopped';

  // Follow the audio clock while playing; hold still when paused; rewind when stopped.
  useEffect(() => {
    if (playState === 'stopped') {
      setPos(0);
      return;
    }
    let raf = 0;
    const frame = () => {
      setPos(getPosition());
      if (playState === 'playing') raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [playState, getPosition, track]);

  const length = track.length;
  // The model date under the first beat of each day (N2: the sound changes as the model moves on).
  const days = dayLabels(track);
  let currentDay = -1;
  if (active) days.forEach((d, i) => { if (d && track.steps[i].t <= pos + 1e-6) currentDay = i; });
  const notes = track.steps.flatMap((s) => s.events.map((e, i) => ({ t: e.t, second: i === 1 })));
  const beats = track.steps.map((s) => s.t);
  const W = length * U;
  const pct = (100 * pos) / length;
  const real = (s: number) => (s / speed).toFixed(1);
  const timeText = active ? `${real(pos)} / ${real(length)} s` : 'Press Play to hear the rhythm';

  const seekTo = (t: number) => {
    if (!active) return;
    onSeek(t);
    setPos(t);
  };
  const fromPointer = (clientX: number) => {
    const r = laneRef.current!.getBoundingClientRect();
    return (Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * length);
  };
  // Arrow keys move one beat; Home/End jump to the start or the last beat.
  const onKey = (e: React.KeyboardEvent) => {
    if (!active) return;
    let current = 0;
    beats.forEach((b, i) => {
      if (b <= pos + 1e-6) current = i;
    });
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = beats[Math.min(beats.length - 1, current + 1)];
    // Left: back to the start of this beat, or to the previous beat if already at its start.
    if (e.key === 'ArrowLeft') next = pos - beats[current] > 0.05 ? beats[current] : beats[Math.max(0, current - 1)];
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = beats[beats.length - 1];
    if (next === null) return;
    e.preventDefault();
    seekTo(next);
  };

  return (
    <section className="track" aria-label="Beat visualizer" style={colour}>
      {active && (
        <div className="track-head">
          <span>Now playing: {regionLabel}</span>
          <span>{timeText}</span>
        </div>
      )}
      {/* A two-mark legend instead of a sentence (team: less text). */}
      <p className="track-legend" aria-hidden="true">
        <span><i className="swatch lo" />First pulse</span>
        <span><i className="swatch hi" />Second pulse</span>
      </p>
      <span id="track-keys" className="sr-only">Drag, or use the left and right arrow keys, to move through the rhythm.</span>
      <div
        ref={laneRef}
        className={active ? 'track-lane' : 'track-lane idle'}
        tabIndex={0}
        role="slider"
        aria-label={`Rhythm timeline for ${regionLabel}`}
        aria-describedby="track-keys"
        aria-disabled={!active}
        aria-valuemin={0}
        aria-valuemax={Number(real(length))}
        aria-valuenow={Number(real(pos))}
        aria-valuetext={active ? `${real(pos)} of ${real(length)} seconds` : 'Not playing'}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (!active) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          seekTo(fromPointer(e.clientX));
        }}
        onPointerMove={(e) => dragging.current && seekTo(fromPointer(e.clientX))}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <svg viewBox={`0 0 ${W} ${LANE_H}`} preserveAspectRatio="none" aria-hidden="true">
          {track.steps.map((s) => (
            <g key={s.t}>
              <line className="beat" x1={s.t * U} x2={s.t * U} y1={0} y2={LANE_H} />
              {s.events.length === 0 && (
                <rect className="missing-beat" x={s.t * U + 1} y={6} width={s.dur * U - 2} height={LANE_H - 12} />
              )}
            </g>
          ))}
          {notes.map((n) => {
            const played = active && pos >= n.t;
            const live = played && pos < n.t + 0.15;
            return (
              <rect
                key={`${n.t}`}
                className={`note ${n.second ? 'hi' : 'lo'}${played ? ' played' : ''}${live ? ' live' : ''}`}
                x={n.t * U - 2}
                y={n.second ? 26 : 8}
                width={4}
                height={n.second ? LANE_H - 34 : LANE_H - 16}
              />
            );
          })}
        </svg>
        <span className="playline" style={{ left: `${pct}%` }} />
        {days.some(Boolean) && (
          <span className="track-days" aria-hidden="true">
            {days.map((d, i) =>
              d ? (
                <span key={i} className={i === currentDay ? 'day current' : 'day'} style={{ left: `${(100 * track.steps[i].t) / length}%` }}>
                  {d}
                </span>
              ) : null,
            )}
          </span>
        )}
        <span className="dot" style={{ left: `${pct}%` }} />
      </div>
    </section>
  );
}
