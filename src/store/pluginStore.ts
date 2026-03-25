/**
 * Zustand store — all plugin parameters + preset management
 */
import { create } from 'zustand';
import { audioEngine, type ParamName } from '../audio/AudioEngine';
import { factoryPresets, MOD_TARGETS, MOD_WAVEFORMS, type Preset } from '../presets/factory';

export interface PluginState {
  // Grain params
  grain_size: number;
  density: number;
  position_scatter: number;
  pitch_scatter: number;
  shimmer: number;
  reverse: boolean;
  freeze: boolean;
  // Space params
  size: number;
  diffusion: number;
  decay: number;
  pre_delay: number;
  er_amount: number;
  // Modulation params
  mod_rate: number;
  mod_depth: number;
  mod_target: string;
  mod_waveform: string;
  // Output params
  mix: number;
  width: number;
  output_gain: number;
  // Preset state
  currentPresetName: string;
  presets: Preset[];
  userPresets: Preset[];
  // Audio state
  isRunning: boolean;
  inputMode: 'mic' | 'file' | 'demo';
  // Actions
  setParam: (name: string, value: number | boolean | string) => void;
  loadPreset: (preset: Preset) => void;
  saveUserPreset: (name: string) => void;
  deleteUserPreset: (name: string) => void;
  exportPreset: () => void;
  importPreset: (json: string) => void;
  setInputMode: (mode: 'mic' | 'file' | 'demo') => void;
  setRunning: (running: boolean) => void;
  getCurrentParams: () => Preset['params'];
}

// Param ranges for MIDI mapping
export const PARAM_RANGES: Record<string, { min: number; max: number }> = {
  grain_size: { min: 20, max: 500 },
  density: { min: 1, max: 200 },
  position_scatter: { min: 0, max: 100 },
  pitch_scatter: { min: 0, max: 24 },
  shimmer: { min: 0, max: 100 },
  size: { min: 0, max: 100 },
  diffusion: { min: 0, max: 100 },
  decay: { min: 0.1, max: 20 },
  pre_delay: { min: 0, max: 200 },
  er_amount: { min: 0, max: 100 },
  mod_rate: { min: 0.01, max: 10 },
  mod_depth: { min: 0, max: 100 },
  mix: { min: 0, max: 100 },
  width: { min: 0, max: 200 },
  output_gain: { min: -24, max: 6 },
};

function loadUserPresets(): Preset[] {
  try {
    const saved = localStorage.getItem('granule_user_presets');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveUserPresetsToStorage(presets: Preset[]) {
  try {
    localStorage.setItem('granule_user_presets', JSON.stringify(presets));
  } catch {}
}

const defaultPreset = factoryPresets[0];

export const usePluginStore = create<PluginState>((set, get) => ({
  // Initial values from default preset
  ...defaultPreset.params,
  reverse: false,
  freeze: false,
  mod_target: 'position_scatter',
  mod_waveform: 'sine',

  currentPresetName: 'Default',
  presets: factoryPresets,
  userPresets: loadUserPresets(),
  isRunning: false,
  inputMode: 'demo',

  setParam: (name, value) => {
    set({ [name]: value, currentPresetName: '(modified)' } as any);

    // Sync to audio engine
    if (typeof value === 'boolean') {
      audioEngine.setParam(name as ParamName, value ? 1 : 0);
    } else if (typeof value === 'number') {
      audioEngine.setParam(name as ParamName, value);
    } else if (name === 'mod_target') {
      const idx = MOD_TARGETS.indexOf(value as any);
      if (idx >= 0) audioEngine.setParam('mod_target', idx);
    } else if (name === 'mod_waveform') {
      const idx = MOD_WAVEFORMS.indexOf(value as any);
      if (idx >= 0) audioEngine.setParam('mod_waveform', idx);
    }
  },

  loadPreset: (preset) => {
    const { params, name } = preset;
    set({
      ...params,
      currentPresetName: name,
    } as any);

    // Sync all params to audio engine
    const numericParams: [ParamName, number][] = [
      ['grain_size', params.grain_size],
      ['density', params.density],
      ['position_scatter', params.position_scatter],
      ['pitch_scatter', params.pitch_scatter],
      ['shimmer', params.shimmer],
      ['reverse', params.reverse ? 1 : 0],
      ['freeze', params.freeze ? 1 : 0],
      ['size', params.size],
      ['diffusion', params.diffusion],
      ['decay', params.decay],
      ['pre_delay', params.pre_delay],
      ['er_amount', params.er_amount],
      ['mod_rate', params.mod_rate],
      ['mod_depth', params.mod_depth],
      ['mod_target', MOD_TARGETS.indexOf(params.mod_target as any)],
      ['mod_waveform', MOD_WAVEFORMS.indexOf((params.mod_waveform ?? 'sine') as any)],
      ['mix', params.mix],
      ['width', params.width],
      ['output_gain', params.output_gain],
    ];
    for (const [name, val] of numericParams) {
      audioEngine.setParam(name, val);
    }
  },

  getCurrentParams: () => {
    const s = get();
    return {
      grain_size: s.grain_size,
      density: s.density,
      position_scatter: s.position_scatter,
      pitch_scatter: s.pitch_scatter,
      shimmer: s.shimmer,
      reverse: s.reverse,
      freeze: s.freeze,
      size: s.size,
      diffusion: s.diffusion,
      decay: s.decay,
      pre_delay: s.pre_delay,
      er_amount: s.er_amount,
      mod_rate: s.mod_rate,
      mod_depth: s.mod_depth,
      mod_target: s.mod_target,
      mod_waveform: s.mod_waveform,
      mix: s.mix,
      width: s.width,
      output_gain: s.output_gain,
    };
  },

  saveUserPreset: (name) => {
    const params = get().getCurrentParams();
    const preset: Preset = { name, version: '1.0', params };
    const userPresets = [...get().userPresets.filter(p => p.name !== name), preset];
    saveUserPresetsToStorage(userPresets);
    set({ userPresets, currentPresetName: name });
  },

  deleteUserPreset: (name) => {
    const userPresets = get().userPresets.filter(p => p.name !== name);
    saveUserPresetsToStorage(userPresets);
    set({ userPresets });
  },

  exportPreset: () => {
    const params = get().getCurrentParams();
    const preset: Preset = {
      name: get().currentPresetName,
      version: '1.0',
      params,
    };
    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importPreset: (json) => {
    try {
      const preset: Preset = JSON.parse(json);
      if (preset.name && preset.params) {
        get().loadPreset(preset);
      }
    } catch (err) {
      console.error('Invalid preset JSON:', err);
    }
  },

  setInputMode: (mode) => set({ inputMode: mode }),
  setRunning: (running) => set({ isRunning: running }),
}));
