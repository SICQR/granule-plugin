/**
 * InputManager — Mic, file drop, demo tone routing
 */
import { audioEngine } from './AudioEngine';

export type InputMode = 'mic' | 'file' | 'demo';

class InputManager {
  private currentMode: InputMode = 'demo';
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private fileSource: AudioBufferSourceNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private oscillatorGain: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;

  get mode() { return this.currentMode; }

  async setMode(mode: InputMode) {
    this.stopCurrent();
    this.currentMode = mode;

    const ctx = audioEngine.context;
    if (!ctx) return;

    switch (mode) {
      case 'mic':
        await this.startMic(ctx);
        break;
      case 'file':
        if (this.audioBuffer) {
          this.startFilePlayback(ctx);
        }
        break;
      case 'demo':
        this.startDemo(ctx);
        break;
    }
  }

  private async startMic(ctx: AudioContext) {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      audioEngine.connectSource(this.micSource);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }

  private startFilePlayback(ctx: AudioContext) {
    if (!this.audioBuffer) return;
    this.fileSource = ctx.createBufferSource();
    this.fileSource.buffer = this.audioBuffer;
    this.fileSource.loop = true;
    audioEngine.connectSource(this.fileSource);
    this.fileSource.start();
  }

  private startDemo(ctx: AudioContext) {
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 440;
    this.oscillatorGain = ctx.createGain();
    this.oscillatorGain.gain.value = 0.3;
    this.oscillator.connect(this.oscillatorGain);
    audioEngine.connectSource(this.oscillatorGain);
    this.oscillator.start();
  }

  setDemoFrequency(freq: number) {
    if (this.oscillator) {
      this.oscillator.frequency.setValueAtTime(freq, audioEngine.context?.currentTime ?? 0);
    }
  }

  setDemoWaveform(type: OscillatorType) {
    if (this.oscillator) {
      this.oscillator.type = type;
    }
  }

  async loadFile(file: File) {
    const ctx = audioEngine.context;
    if (!ctx) return;
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    if (this.currentMode === 'file') {
      this.stopCurrent();
      this.startFilePlayback(ctx);
    }
  }

  private stopCurrent() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch {}
      this.micSource = null;
    }
    if (this.fileSource) {
      try { this.fileSource.stop(); this.fileSource.disconnect(); } catch {}
      this.fileSource = null;
    }
    if (this.oscillator) {
      try { this.oscillator.stop(); this.oscillator.disconnect(); } catch {}
      this.oscillator = null;
    }
    if (this.oscillatorGain) {
      try { this.oscillatorGain.disconnect(); } catch {}
      this.oscillatorGain = null;
    }
  }

  destroy() {
    this.stopCurrent();
    this.audioBuffer = null;
  }
}

export const inputManager = new InputManager();
