// "Earth sound": what the Earth voice sounds like (audio/earthSound.ts). Only the sound changes,
// never the notes or their times. It sits with the Earth rhythm's own controls on Play along and in
// Compare's "What you hear now"; both change the same setting, which every page that plays the
// Earth voice follows.
import { EARTH_SOUNDS, type EarthSoundId } from '../audio/earthSound';

export function EarthSoundChoice({ value, onChange, className }: { value: EarthSoundId; onChange: (id: EarthSoundId) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="earth-sound-name">Earth sound</span>{' '}
      <select value={value} onChange={(e) => onChange(e.target.value as EarthSoundId)}>
        {EARTH_SOUNDS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}
