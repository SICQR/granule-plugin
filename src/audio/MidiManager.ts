/**
 * MidiManager — Web MIDI API wrapper for MIDI learn
 */
import type { ParamName } from './AudioEngine';
import { audioEngine } from './AudioEngine';

export interface MidiMapping {
  cc: number;
  channel: number;
  paramName: ParamName;
  min: number;
  max: number;
}

type MidiLearnCallback = (cc: number, channel: number) => void;

class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private mappings: MidiMapping[] = [];
  private isLearning = false;
  private learnCallback: MidiLearnCallback | null = null;
  private _onMappingsChange: (() => void) | null = null;

  get learning() { return this.isLearning; }
  get currentMappings() { return [...this.mappings]; }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not available');
      return false;
    }
    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.midiAccess.inputs.forEach(input => {
        input.onmidimessage = this.handleMidiMessage.bind(this);
      });
      this.midiAccess.onstatechange = () => {
        this.midiAccess?.inputs.forEach(input => {
          input.onmidimessage = this.handleMidiMessage.bind(this);
        });
      };
      // Load saved mappings
      this.loadMappings();
      return true;
    } catch (err) {
      console.warn('MIDI access denied:', err);
      return false;
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const channel = data[0] & 0x0f;
    const cc = data[1];
    const value = data[2];

    // CC messages only
    if (status !== 0xb0) return;

    // Learning mode
    if (this.isLearning && this.learnCallback) {
      this.learnCallback(cc, channel);
      this.isLearning = false;
      this.learnCallback = null;
      return;
    }

    // Apply mappings
    for (const mapping of this.mappings) {
      if (mapping.cc === cc && mapping.channel === channel) {
        const normalized = value / 127;
        const paramValue = mapping.min + normalized * (mapping.max - mapping.min);
        audioEngine.setParam(mapping.paramName, paramValue);
      }
    }
  }

  startLearn(callback: MidiLearnCallback) {
    this.isLearning = true;
    this.learnCallback = callback;
  }

  cancelLearn() {
    this.isLearning = false;
    this.learnCallback = null;
  }

  addMapping(mapping: MidiMapping) {
    // Remove existing mapping for same param
    this.mappings = this.mappings.filter(m => m.paramName !== mapping.paramName);
    this.mappings.push(mapping);
    this.saveMappings();
    this._onMappingsChange?.();
  }

  removeMapping(paramName: ParamName) {
    this.mappings = this.mappings.filter(m => m.paramName !== paramName);
    this.saveMappings();
    this._onMappingsChange?.();
  }

  clearAll() {
    this.mappings = [];
    this.saveMappings();
    this._onMappingsChange?.();
  }

  hasMidiMapping(paramName: ParamName): boolean {
    return this.mappings.some(m => m.paramName === paramName);
  }

  onMappingsChange(cb: () => void) {
    this._onMappingsChange = cb;
  }

  private saveMappings() {
    try {
      localStorage.setItem('granule_midi_mappings', JSON.stringify(this.mappings));
    } catch {}
  }

  private loadMappings() {
    try {
      const saved = localStorage.getItem('granule_midi_mappings');
      if (saved) this.mappings = JSON.parse(saved);
    } catch {}
  }
}

export const midiManager = new MidiManager();
