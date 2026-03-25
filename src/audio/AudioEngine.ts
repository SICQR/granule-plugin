/**
 * AudioEngine — AudioContext setup, worklet loader, parameter bridge
 */

export type ParamName =
  | 'grain_size' | 'density' | 'position_scatter' | 'pitch_scatter'
  | 'shimmer' | 'reverse' | 'freeze'
  | 'size' | 'diffusion' | 'decay' | 'pre_delay' | 'er_amount'
  | 'mod_rate' | 'mod_depth' | 'mod_target' | 'mod_waveform'
  | 'mix' | 'width' | 'output_gain';

export interface GrainActivityData {
  data: Float32Array;
  activeCount: number;
}

type GrainActivityCallback = (data: GrainActivityData) => void;

export class AudioEngine {
  context: AudioContext | null = null;
  workletNode: AudioWorkletNode | null = null;
  inputNode: AudioNode | null = null;
  analyserIn: AnalyserNode | null = null;
  analyserOut: AnalyserNode | null = null;
  private _grainCallback: GrainActivityCallback | null = null;
  private _ready = false;

  get isReady() { return this._ready; }

  async init() {
    this.context = new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' });

    // Load worklet
    await this.context.audioWorklet.addModule('/GranularReverbProcessor.js');

    // Create worklet node (stereo in, stereo out)
    this.workletNode = new AudioWorkletNode(this.context, 'granular-reverb-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
    });

    // Analysers for VU meters
    this.analyserIn = this.context.createAnalyser();
    this.analyserIn.fftSize = 2048;
    this.analyserIn.smoothingTimeConstant = 0.8;

    this.analyserOut = this.context.createAnalyser();
    this.analyserOut.fftSize = 2048;
    this.analyserOut.smoothingTimeConstant = 0.8;

    // Connect: workletNode → analyserOut → destination
    this.workletNode.connect(this.analyserOut);
    this.analyserOut.connect(this.context.destination);

    // Listen for grain activity data
    this.workletNode.port.onmessage = (e) => {
      if (e.data.type === 'grainActivity' && this._grainCallback) {
        this._grainCallback({
          data: e.data.data,
          activeCount: e.data.activeCount,
        });
      }
    };

    this._ready = true;
  }

  connectSource(source: AudioNode) {
    if (!this.workletNode || !this.analyserIn) return;
    // Disconnect previous
    if (this.inputNode) {
      try { this.inputNode.disconnect(); } catch {}
    }
    this.inputNode = source;
    source.connect(this.analyserIn);
    this.analyserIn.connect(this.workletNode);
  }

  setParam(name: ParamName, value: number) {
    if (!this.workletNode) return;
    const param = this.workletNode.parameters.get(name);
    if (param) {
      // Use setTargetAtTime with short time constant to avoid zipper noise
      param.setTargetAtTime(value, this.context?.currentTime ?? 0, 0.01);
    }
  }

  getParam(name: ParamName): number {
    if (!this.workletNode) return 0;
    const param = this.workletNode.parameters.get(name);
    return param?.value ?? 0;
  }

  onGrainActivity(cb: GrainActivityCallback) {
    this._grainCallback = cb;
  }

  async resume() {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  async suspend() {
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
  }

  destroy() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this._ready = false;
  }
}

export const audioEngine = new AudioEngine();
