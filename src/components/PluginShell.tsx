/**
 * PluginShell — Main plugin layout: header, 4 parameter sections, visualiser
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePluginStore } from '../store/pluginStore';
import { audioEngine } from '../audio/AudioEngine';
import { inputManager } from '../audio/InputManager';
import { midiManager } from '../audio/MidiManager';
import { KnobControl } from './KnobControl';
import { ToggleButton } from './ToggleButton';
import { SectionPanel } from './SectionPanel';
import { GrainVisualiser } from './GrainVisualiser';
import { VUMeter } from './VUMeter';
import { PresetBar } from './PresetBar';
import { MidiLearnModal } from './MidiLearnModal';
import { MOD_TARGETS, MOD_WAVEFORMS, QUICK_PRESETS, quickToFull } from '../presets/factory';

export function PluginShell() {
  const store = usePluginStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [midiLearning, setMidiLearning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeQuickPreset, setActiveQuickPreset] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Initialize audio engine on first interaction
  const handleInit = useCallback(async () => {
    if (isInitialized) return;
    try {
      await audioEngine.init();
      await midiManager.init();
      await inputManager.setMode(store.inputMode);
      store.setRunning(true);
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize audio:', err);
    }
  }, [isInitialized, store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        store.setParam('freeze', !store.freeze);
      } else if (e.code === 'KeyR') {
        store.setParam('reverse', !store.reverse);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // MIDI learn state polling
  useEffect(() => {
    const check = setInterval(() => {
      setMidiLearning(midiManager.learning);
    }, 100);
    return () => clearInterval(check);
  }, []);

  // File drop handling
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      await inputManager.loadFile(file);
      store.setInputMode('file');
      if (isInitialized) await inputManager.setMode('file');
    }
  };

  // Input mode switching
  const handleInputMode = async (mode: 'mic' | 'file' | 'demo') => {
    store.setInputMode(mode);
    if (isInitialized) await inputManager.setMode(mode);
  };

  // Suspend audio when tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) audioEngine.suspend();
      else if (isInitialized) audioEngine.resume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isInitialized]);

  if (!isInitialized) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-plugin-bg gap-6">
        <div className="flex flex-col items-center gap-2">
          {/* Logo */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-5xl font-black tracking-tight text-white">GRANULE</h1>
            <div className="flex items-center gap-3 mt-1 w-full max-w-[250px]">
              <div className="h-px flex-1 bg-[#C8962C]/40" />
              <p className="text-xs font-bold tracking-[0.25em] text-[#C8962C] uppercase">
                by SMASH DADDYS
              </p>
              <div className="h-px flex-1 bg-[#C8962C]/40" />
            </div>
          </div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#8888a0] mt-2">Infinite spaces from fractured moments</p>
        </div>
        <button
          onClick={handleInit}
          className="px-8 py-3 bg-knob-active/10 border border-knob-active/40 rounded-lg text-knob-active text-sm tracking-wider uppercase hover:bg-knob-active/20 transition-all"
        >
          Start Audio Engine
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dropRef}
      className={`w-full min-w-[900px] max-w-[1100px] mx-auto bg-plugin-bg p-4 flex flex-col gap-3 ${dragOver ? 'drop-zone-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight text-white" style={{ fontFamily: 'Clash Display, Inter, sans-serif' }}>
            GRANULE
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-px flex-1 bg-[#C8962C]/40" />
            <p className="text-[8px] font-bold tracking-[0.25em] text-[#C8962C] uppercase">
              by SMASH DADDYS
            </p>
            <div className="h-px flex-1 bg-[#C8962C]/40" />
          </div>
        </div>

        <PresetBar />

        {/* Input mode selector */}
        <div className="flex items-center gap-1">
          {(['mic', 'file', 'demo'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleInputMode(mode)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded transition-all ${
                store.inputMode === mode
                  ? 'bg-knob-active/20 text-knob-active border border-knob-active/40'
                  : 'text-[#8888a0] border border-transparent hover:text-[#e8e8ec]'
              }`}
            >
              {mode === 'mic' ? 'Mic' : mode === 'file' ? 'File' : 'Demo'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-access Preset Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => {
              const full = quickToFull(p);
              store.loadPreset(full);
              setActiveQuickPreset(p.name);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors ${
              activeQuickPreset === p.name
                ? 'bg-[#C8962C] text-black'
                : 'bg-zinc-800 text-white/60 hover:text-white'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Parameter Sections */}
      <div className="grid grid-cols-4 gap-3">
        {/* GRAIN Section */}
        <SectionPanel title="Grain">
          <div className="grid grid-cols-2 gap-4">
            <KnobControl paramName="grain_size" label="Size" value={store.grain_size} min={20} max={500} defaultValue={80} unit="ms" decimals={0} />
            <KnobControl paramName="density" label="Density" value={store.density} min={1} max={200} defaultValue={40} unit="/s" decimals={0} />
            <KnobControl paramName="position_scatter" label="Pos Scatter" value={store.position_scatter} min={0} max={100} defaultValue={30} unit="%" decimals={0} />
            <KnobControl paramName="pitch_scatter" label="Pitch Scat" value={store.pitch_scatter} min={0} max={24} defaultValue={0} unit="st" decimals={1} />
            <KnobControl paramName="shimmer" label="Shimmer" value={store.shimmer} min={0} max={100} defaultValue={0} unit="%" decimals={0} color="#a78bfa" />
          </div>
          <div className="flex gap-2 mt-3">
            <ToggleButton paramName="reverse" label="Reverse" active={store.reverse} />
            <ToggleButton paramName="freeze" label="Freeze" active={store.freeze} color="#3ecfcf" pulseWhenActive />
          </div>
        </SectionPanel>

        {/* SPACE Section */}
        <SectionPanel title="Space">
          <div className="grid grid-cols-2 gap-4">
            <KnobControl paramName="size" label="Size" value={store.size} min={0} max={100} defaultValue={50} unit="%" decimals={0} />
            <KnobControl paramName="diffusion" label="Diffusion" value={store.diffusion} min={0} max={100} defaultValue={60} unit="%" decimals={0} />
            <KnobControl paramName="decay" label="Decay" value={store.decay} min={0.1} max={20} defaultValue={4} unit="s" decimals={1} />
            <KnobControl paramName="pre_delay" label="Pre-Delay" value={store.pre_delay} min={0} max={200} defaultValue={10} unit="ms" decimals={0} />
            <KnobControl paramName="er_amount" label="Early Ref" value={store.er_amount} min={0} max={100} defaultValue={40} unit="%" decimals={0} />
          </div>
        </SectionPanel>

        {/* MODULATION Section */}
        <SectionPanel title="Modulation">
          <div className="grid grid-cols-2 gap-4">
            <KnobControl paramName="mod_rate" label="Rate" value={store.mod_rate} min={0.01} max={10} defaultValue={0.5} unit="Hz" decimals={2} />
            <KnobControl paramName="mod_depth" label="Depth" value={store.mod_depth} min={0} max={100} defaultValue={0} unit="%" decimals={0} />
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {/* Mod Target Dropdown */}
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[#8888a0] block mb-1">Target</label>
              <select
                value={store.mod_target}
                onChange={e => store.setParam('mod_target', e.target.value)}
                className="w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-xs text-[#e8e8ec] outline-none focus:border-knob-active appearance-none cursor-pointer"
              >
                {MOD_TARGETS.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            {/* Waveform Dropdown */}
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[#8888a0] block mb-1">Waveform</label>
              <select
                value={store.mod_waveform}
                onChange={e => store.setParam('mod_waveform', e.target.value)}
                className="w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-xs text-[#e8e8ec] outline-none focus:border-knob-active appearance-none cursor-pointer"
              >
                {MOD_WAVEFORMS.map(w => (
                  <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </SectionPanel>

        {/* OUTPUT Section */}
        <SectionPanel title="Output">
          <div className="grid grid-cols-2 gap-4">
            <KnobControl paramName="mix" label="Mix" value={store.mix} min={0} max={100} defaultValue={50} unit="%" decimals={0} />
            <KnobControl paramName="width" label="Width" value={store.width} min={0} max={200} defaultValue={100} unit="%" decimals={0} />
            <KnobControl paramName="output_gain" label="Gain" value={store.output_gain} min={-24} max={6} defaultValue={0} unit="dB" decimals={1} />
          </div>
          <div className="flex gap-3 mt-3 justify-center">
            <VUMeter analyser={audioEngine.analyserIn} label="IN" />
            <VUMeter analyser={audioEngine.analyserOut} label="OUT" />
          </div>
        </SectionPanel>
      </div>

      {/* Grain Visualiser */}
      <GrainVisualiser />

      {/* Footer */}
      <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#555566] px-1">
        <span>GRANULE v1.0</span>
        <span>Space = Freeze &middot; R = Reverse &middot; Right-click knob = MIDI Learn</span>
        <span>&copy; 2026 Smash Daddys Ltd</span>
      </div>

      {/* MIDI Learn Modal */}
      <MidiLearnModal visible={midiLearning} onClose={() => setMidiLearning(false)} />
    </div>
  );
}
