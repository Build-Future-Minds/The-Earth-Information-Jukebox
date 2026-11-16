// "Earth sound": what the Earth voice sounds like (audio/earthSound.ts). Only the sound changes,
// never the notes or their times. It sits with the Earth rhythm's own controls on Play along; the
// choice also applies wherever else the Earth voice plays (Compare, Globe).
import { EARTH_SOUNDS, type EarthSoundId } from '../audio/earthSound';

export function EarthSoundChoice({ value, onChange }: { value: EarthSoundId; onChange: (id: EarthSoundId) => void }) {
  return (
    <label>
      Earth sound{' '}
      <select value={value} onChange={(e) => onChange(e.target.value as EarthSoundId)}>
        {EARTH_SOUNDS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}
