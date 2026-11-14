// Types mirroring contracts/*.schema.json. If a schema changes, change these in the same PR.

export interface Region {
  id: string;
  name: string;
  box_px: [number, number, number, number];
  mask?: string | null;
  description: string;
}

export interface Scene {
  schema_version: '0.1';
  is_mock: boolean;
  source: {
    svs_id: number | null;
    url: string;
    title: string;
    credit: string;
    data_kind: 'model_output' | 'observation' | 'artistic_rendering' | 'synthetic_test_input';
    model_or_instrument?: string;
    data_start?: string | null;
    data_end?: string | null;
    limitations: string[];
  };
  frames: {
    width: number;
    height: number;
    count: number;
    pattern: string;
    timestamps?: string[];
    camera_static_check?: string;
  };
  legend?: {
    quantity?: string;
    units?: string;
    stops?: { colour: string; value: string }[];
  };
  regions: Region[];
}

export type Step =
  | { t: number; frame?: number; source_time?: string | null; region: string; status: 'ok'; alignment: number; reason: null }
  | { t: number; frame?: number; source_time?: string | null; region: string; status: 'missing'; alignment: null; reason: string };

export interface Features {
  schema_version: '0.2';
  is_mock: boolean;
  scene: string;
  step_seconds: number;
  normalisation: {
    gradient_threshold: number;
    min_usable_fraction: number;
    smoothing_alpha: number;
  };
  steps: Step[];
}

export interface Why {
  region: string;
  alignment: number;
  long_fraction: number;
  rule: string;
}

export interface MusicEvent {
  t: number;
  voice: 'earth' | 'user';
  pitch: number;
  dur: number;
  vel: number;
  why?: Why;
}
