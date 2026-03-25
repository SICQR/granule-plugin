/**
 * Factory presets for GRANULE
 */

export interface Preset {
  name: string;
  version: string;
  params: {
    grain_size: number;
    density: number;
    position_scatter: number;
    pitch_scatter: number;
    shimmer: number;
    reverse: boolean;
    freeze: boolean;
    size: number;
    diffusion: number;
    decay: number;
    pre_delay: number;
    er_amount: number;
    mod_rate: number;
    mod_depth: number;
    mod_target: string;
    mod_waveform?: string;
    mix: number;
    width: number;
    output_gain: number;
  };
}

export const MOD_TARGETS = ['position_scatter', 'grain_size', 'pitch_scatter', 'density'] as const;
export const MOD_WAVEFORMS = ['sine', 'triangle', 'random_sh', 'slow_random'] as const;

/** Quick-access preset pills — simplified params mapped to full preset format */
export interface QuickPreset {
  name: string;
  grainSize: number;
  density: number;
  spread: number;
  wet: number;
  freeze: boolean;
}

export const QUICK_PRESETS: QuickPreset[] = [
  { name: 'CLOUD',   grainSize: 200, density: 0.8, spread: 0.3, wet: 0.6, freeze: false },
  { name: 'SHIMMER', grainSize: 80,  density: 0.9, spread: 0.5, wet: 0.7, freeze: false },
  { name: 'DEBRIS',  grainSize: 30,  density: 0.4, spread: 0.8, wet: 0.5, freeze: false },
  { name: 'FROZEN',  grainSize: 400, density: 1.0, spread: 0.1, wet: 0.9, freeze: true  },
  { name: 'SCATTER', grainSize: 15,  density: 0.6, spread: 0.9, wet: 0.4, freeze: false },
];

/** Convert a QuickPreset to a full Preset */
export function quickToFull(qp: QuickPreset): Preset {
  return {
    name: qp.name,
    version: '1.0',
    params: {
      grain_size: qp.grainSize,
      density: Math.round(qp.density * 200),
      position_scatter: Math.round(qp.spread * 100),
      pitch_scatter: qp.name === 'SHIMMER' ? 4 : qp.name === 'SCATTER' ? 8 : 0,
      shimmer: qp.name === 'SHIMMER' ? 60 : qp.name === 'CLOUD' ? 20 : 0,
      reverse: false,
      freeze: qp.freeze,
      size: Math.round(qp.wet * 80 + 20),
      diffusion: 65,
      decay: qp.freeze ? 15 : Math.round(qp.wet * 10 + 2),
      pre_delay: 10,
      er_amount: 30,
      mod_rate: 0.4,
      mod_depth: 15,
      mod_target: 'position_scatter',
      mod_waveform: 'slow_random',
      mix: Math.round(qp.wet * 100),
      width: 120,
      output_gain: 0,
    },
  };
}

export const factoryPresets: Preset[] = [
  {
    name: 'Default',
    version: '1.0',
    params: {
      grain_size: 80, density: 40, position_scatter: 30, pitch_scatter: 0,
      shimmer: 0, reverse: false, freeze: false,
      size: 50, diffusion: 60, decay: 4, pre_delay: 10, er_amount: 40,
      mod_rate: 0.5, mod_depth: 0, mod_target: 'position_scatter', mod_waveform: 'sine',
      mix: 50, width: 100, output_gain: 0,
    },
  },
  {
    name: 'Shimmer Hall',
    version: '1.0',
    params: {
      grain_size: 120, density: 60, position_scatter: 40, pitch_scatter: 0,
      shimmer: 75, reverse: false, freeze: false,
      size: 85, diffusion: 70, decay: 8, pre_delay: 20, er_amount: 20,
      mod_rate: 0.3, mod_depth: 15, mod_target: 'position_scatter', mod_waveform: 'sine',
      mix: 55, width: 130, output_gain: 0,
    },
  },
  {
    name: 'Freeze Pad',
    version: '1.0',
    params: {
      grain_size: 200, density: 80, position_scatter: 50, pitch_scatter: 2,
      shimmer: 20, reverse: false, freeze: false,
      size: 75, diffusion: 80, decay: 12, pre_delay: 5, er_amount: 15,
      mod_rate: 0.2, mod_depth: 30, mod_target: 'position_scatter', mod_waveform: 'slow_random',
      mix: 70, width: 150, output_gain: -3,
    },
  },
  {
    name: 'Grain Storm',
    version: '1.0',
    params: {
      grain_size: 35, density: 150, position_scatter: 80, pitch_scatter: 5,
      shimmer: 10, reverse: false, freeze: false,
      size: 40, diffusion: 45, decay: 3, pre_delay: 5, er_amount: 60,
      mod_rate: 2.5, mod_depth: 40, mod_target: 'position_scatter', mod_waveform: 'random_sh',
      mix: 60, width: 160, output_gain: -2,
    },
  },
  {
    name: 'Reverse Bloom',
    version: '1.0',
    params: {
      grain_size: 150, density: 30, position_scatter: 25, pitch_scatter: 1,
      shimmer: 15, reverse: true, freeze: false,
      size: 65, diffusion: 55, decay: 6, pre_delay: 30, er_amount: 35,
      mod_rate: 0.4, mod_depth: 20, mod_target: 'grain_size', mod_waveform: 'triangle',
      mix: 50, width: 120, output_gain: 0,
    },
  },
  {
    name: 'Pitch Clouds',
    version: '1.0',
    params: {
      grain_size: 100, density: 50, position_scatter: 35, pitch_scatter: 12,
      shimmer: 30, reverse: false, freeze: false,
      size: 80, diffusion: 75, decay: 10, pre_delay: 15, er_amount: 25,
      mod_rate: 0.15, mod_depth: 25, mod_target: 'pitch_scatter', mod_waveform: 'slow_random',
      mix: 55, width: 140, output_gain: -1,
    },
  },
  {
    name: 'Micro Grains',
    version: '1.0',
    params: {
      grain_size: 20, density: 180, position_scatter: 20, pitch_scatter: 1,
      shimmer: 15, reverse: false, freeze: false,
      size: 55, diffusion: 65, decay: 5, pre_delay: 8, er_amount: 45,
      mod_rate: 1.0, mod_depth: 10, mod_target: 'density', mod_waveform: 'sine',
      mix: 45, width: 110, output_gain: 0,
    },
  },
  {
    name: 'Room Scatter',
    version: '1.0',
    params: {
      grain_size: 60, density: 35, position_scatter: 15, pitch_scatter: 0,
      shimmer: 0, reverse: false, freeze: false,
      size: 30, diffusion: 40, decay: 2, pre_delay: 12, er_amount: 65,
      mod_rate: 0.8, mod_depth: 5, mod_target: 'position_scatter', mod_waveform: 'sine',
      mix: 35, width: 100, output_gain: 0,
    },
  },
];
