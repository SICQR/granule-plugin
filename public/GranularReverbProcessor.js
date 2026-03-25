/**
 * GRANULE — Granular Reverb AudioWorklet Processor
 * by SMASH DADDYS
 *
 * Real-time granular reverb DSP engine.
 * Signal flow: Input → Pre-Delay → Grain Engine → Diffusion → Early Reflections → Stereo Width → Dry/Wet Mix → Output
 */

const BUFFER_SECONDS = 4;
const MAX_GRAINS = 256;
const ALLPASS_STAGES = 8;
const COMB_FILTERS = 4;

// Prime-number delay times (ms) for diffusion — avoids comb filtering artefacts
const ALLPASS_DELAYS_MS = [13, 19, 29, 41, 59, 71, 83, 101];
// Comb filter delay times (ms) for early reflections
const COMB_DELAYS_MS = [17, 23, 31, 37];

// LFO waveforms
const LFO_SINE = 0;
const LFO_TRIANGLE = 1;
const LFO_RANDOM_SH = 2;
const LFO_SLOW_RANDOM = 3;

function hannWindow(phase) {
  return 0.5 * (1.0 - Math.cos(2.0 * Math.PI * phase));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

class AllpassFilter {
  constructor(delaySamples) {
    this.maxDelay = Math.ceil(delaySamples * 2) + 1;
    this.buffer = new Float32Array(this.maxDelay);
    this.writeIndex = 0;
    this.delay = Math.floor(delaySamples);
  }

  setDelay(samples) {
    this.delay = Math.min(Math.floor(samples), this.maxDelay - 1);
  }

  process(input, feedback) {
    const readIndex = (this.writeIndex - this.delay + this.maxDelay) % this.maxDelay;
    const delayed = this.buffer[readIndex];
    const output = delayed - feedback * input;
    this.buffer[this.writeIndex] = input + feedback * delayed;
    this.writeIndex = (this.writeIndex + 1) % this.maxDelay;
    return output;
  }
}

class CombFilter {
  constructor(delaySamples) {
    this.maxDelay = Math.ceil(delaySamples * 2) + 1;
    this.buffer = new Float32Array(this.maxDelay);
    this.writeIndex = 0;
    this.delay = Math.floor(delaySamples);
  }

  setDelay(samples) {
    this.delay = Math.min(Math.floor(samples), this.maxDelay - 1);
  }

  process(input, feedback) {
    const readIndex = (this.writeIndex - this.delay + this.maxDelay) % this.maxDelay;
    const delayed = this.buffer[readIndex];
    const output = input + delayed * feedback;
    this.buffer[this.writeIndex] = output;
    this.writeIndex = (this.writeIndex + 1) % this.maxDelay;
    return delayed;
  }
}

class GranularReverbProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    const sr = sampleRate;

    // Circular input buffer (4 seconds, stereo)
    this.bufferLength = Math.floor(sr * BUFFER_SECONDS);
    this.inputBufferL = new Float32Array(this.bufferLength);
    this.inputBufferR = new Float32Array(this.bufferLength);
    this.writePointer = 0;

    // Pre-delay buffer (max 200ms)
    this.preDelayMax = Math.floor(sr * 0.2);
    this.preDelayBufferL = new Float32Array(this.preDelayMax + 1);
    this.preDelayBufferR = new Float32Array(this.preDelayMax + 1);
    this.preDelayWritePtr = 0;

    // Grain pool
    this.grains = [];
    for (let i = 0; i < MAX_GRAINS; i++) {
      this.grains.push({
        active: false,
        startSample: 0,
        readPosition: 0,
        length: 0,
        playbackRate: 1.0,
        reversed: false,
        windowPhase: 0,
        gain: 1.0,
        pan: 0,
        isShimmer: false,
      });
    }

    // Grain scheduler state
    this.grainTimer = 0;

    // Allpass diffusion network (stereo)
    this.allpassL = [];
    this.allpassR = [];
    for (let i = 0; i < ALLPASS_STAGES; i++) {
      const delaySamples = (ALLPASS_DELAYS_MS[i] / 1000) * sr;
      this.allpassL.push(new AllpassFilter(delaySamples));
      // Slightly offset right channel for stereo decorrelation
      this.allpassR.push(new AllpassFilter(delaySamples * 1.08));
    }

    // Comb filter bank for early reflections (stereo)
    this.combL = [];
    this.combR = [];
    for (let i = 0; i < COMB_FILTERS; i++) {
      const delaySamples = (COMB_DELAYS_MS[i] / 1000) * sr * 0.3;
      this.combL.push(new CombFilter(delaySamples));
      this.combR.push(new CombFilter(delaySamples * 1.12));
    }

    // LFO state
    this.lfoPhase = 0;
    this.lfoValue = 0;
    this.shValue = 0;
    this.shTimer = 0;
    this.smoothRandom = 0;
    this.smoothRandomTarget = 0;

    // Grain activity data for visualiser (sent to main thread)
    this.grainActivityData = new Float32Array(MAX_GRAINS * 4); // [x, y, opacity, age] per grain
    this.frameCounter = 0;

    // Message handling for non-audio params
    this.port.onmessage = (e) => {
      if (e.data.type === 'getGrainActivity') {
        this._sendGrainActivity();
      }
    };
  }

  static get parameterDescriptors() {
    return [
      // Grain params
      { name: 'grain_size', defaultValue: 80, minValue: 20, maxValue: 500, automationRate: 'k-rate' },
      { name: 'density', defaultValue: 40, minValue: 1, maxValue: 200, automationRate: 'k-rate' },
      { name: 'position_scatter', defaultValue: 30, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'pitch_scatter', defaultValue: 0, minValue: 0, maxValue: 24, automationRate: 'k-rate' },
      { name: 'shimmer', defaultValue: 0, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'reverse', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'freeze', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // Space params
      { name: 'size', defaultValue: 50, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'diffusion', defaultValue: 60, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'decay', defaultValue: 4, minValue: 0.1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'pre_delay', defaultValue: 10, minValue: 0, maxValue: 200, automationRate: 'k-rate' },
      { name: 'er_amount', defaultValue: 40, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      // Modulation params
      { name: 'mod_rate', defaultValue: 0.5, minValue: 0.01, maxValue: 10, automationRate: 'k-rate' },
      { name: 'mod_depth', defaultValue: 0, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'mod_target', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      { name: 'mod_waveform', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      // Output params
      { name: 'mix', defaultValue: 50, minValue: 0, maxValue: 100, automationRate: 'a-rate' },
      { name: 'width', defaultValue: 100, minValue: 0, maxValue: 200, automationRate: 'k-rate' },
      { name: 'output_gain', defaultValue: 0, minValue: -24, maxValue: 6, automationRate: 'k-rate' },
    ];
  }

  _getParam(parameters, name, index) {
    const p = parameters[name];
    return p.length > 1 ? p[index] : p[0];
  }

  _updateLFO(rate, waveform, blockSize) {
    const phaseInc = rate / sampleRate * blockSize;
    this.lfoPhase = (this.lfoPhase + phaseInc) % 1.0;

    switch (Math.round(waveform)) {
      case LFO_SINE:
        this.lfoValue = Math.sin(2 * Math.PI * this.lfoPhase);
        break;
      case LFO_TRIANGLE:
        this.lfoValue = 2 * Math.abs(2 * this.lfoPhase - 1) - 1;
        break;
      case LFO_RANDOM_SH:
        this.shTimer += blockSize;
        if (this.shTimer >= sampleRate / rate) {
          this.shValue = Math.random() * 2 - 1;
          this.shTimer = 0;
        }
        this.lfoValue = this.shValue;
        break;
      case LFO_SLOW_RANDOM:
        this.shTimer += blockSize;
        if (this.shTimer >= sampleRate / rate) {
          this.smoothRandomTarget = Math.random() * 2 - 1;
          this.shTimer = 0;
        }
        this.smoothRandom += (this.smoothRandomTarget - this.smoothRandom) * 0.001;
        this.lfoValue = this.smoothRandom;
        break;
    }
    return this.lfoValue;
  }

  _spawnGrain(grainSizeSamples, posScatter, pitchScatter, isReversed, shimmerAmt) {
    // Find an inactive grain slot
    let grain = null;
    for (let i = 0; i < MAX_GRAINS; i++) {
      if (!this.grains[i].active) {
        grain = this.grains[i];
        break;
      }
    }
    if (!grain) return; // All slots full

    grain.active = true;
    grain.length = grainSizeSamples;
    grain.windowPhase = 0;

    // Position scatter: random offset into the buffer
    const scatterRange = Math.floor((posScatter / 100) * this.bufferLength * 0.5);
    const scatter = Math.floor(Math.random() * scatterRange);
    grain.startSample = (this.writePointer - grainSizeSamples - scatter + this.bufferLength) % this.bufferLength;

    // Pitch scatter
    if (pitchScatter > 0) {
      const semitones = (Math.random() * 2 - 1) * pitchScatter;
      grain.playbackRate = Math.pow(2, semitones / 12);
    } else {
      grain.playbackRate = 1.0;
    }

    // Shimmer: chance of octave-up grain
    grain.isShimmer = false;
    if (shimmerAmt > 0 && Math.random() * 100 < shimmerAmt) {
      grain.playbackRate *= 2.0;
      grain.isShimmer = true;
    }

    grain.reversed = isReversed;
    if (grain.reversed) {
      grain.readPosition = grain.startSample + grainSizeSamples;
    } else {
      grain.readPosition = grain.startSample;
    }

    // Random pan for stereo spread
    grain.pan = Math.random() * 2 - 1;

    // Normalisation gain
    grain.gain = 1.0;
  }

  _processGrain(grain, outputL, outputR, blockSize) {
    for (let i = 0; i < blockSize; i++) {
      if (!grain.active) break;

      // Advance window phase
      grain.windowPhase += 1.0 / grain.length;
      if (grain.windowPhase >= 1.0) {
        grain.active = false;
        break;
      }

      const window = hannWindow(grain.windowPhase);

      // Read from circular buffer with interpolation
      const readPos = grain.readPosition;
      const readIndex = Math.floor(readPos);
      const frac = readPos - readIndex;

      const idx0 = ((readIndex % this.bufferLength) + this.bufferLength) % this.bufferLength;
      const idx1 = (idx0 + 1) % this.bufferLength;

      // Linear interpolation
      const sampleL = this.inputBufferL[idx0] * (1 - frac) + this.inputBufferL[idx1] * frac;
      const sampleR = this.inputBufferR[idx0] * (1 - frac) + this.inputBufferR[idx1] * frac;

      const out = window * grain.gain;

      // Pan law (constant power)
      const panR = (grain.pan + 1) * 0.5;
      const panL = 1 - panR;
      const gainL = Math.cos(panR * Math.PI * 0.5);
      const gainR = Math.sin(panR * Math.PI * 0.5);

      outputL[i] += sampleL * out * gainL;
      outputR[i] += sampleR * out * gainR;

      // Advance read position
      if (grain.reversed) {
        grain.readPosition -= grain.playbackRate;
      } else {
        grain.readPosition += grain.playbackRate;
      }
    }
  }

  _sendGrainActivity() {
    let idx = 0;
    let activeCount = 0;
    for (let i = 0; i < MAX_GRAINS; i++) {
      const g = this.grains[i];
      if (g.active) {
        // x = position in buffer (0-1)
        const bufPos = ((g.readPosition % this.bufferLength) + this.bufferLength) % this.bufferLength;
        this.grainActivityData[idx] = bufPos / this.bufferLength;
        // y = pitch offset (normalised)
        this.grainActivityData[idx + 1] = Math.log2(g.playbackRate) / 2;
        // opacity = window amplitude
        this.grainActivityData[idx + 2] = hannWindow(g.windowPhase);
        // age = window phase
        this.grainActivityData[idx + 3] = g.windowPhase;
        activeCount++;
      } else {
        this.grainActivityData[idx] = -1;
        this.grainActivityData[idx + 1] = 0;
        this.grainActivityData[idx + 2] = 0;
        this.grainActivityData[idx + 3] = 0;
      }
      idx += 4;
    }
    this.port.postMessage({
      type: 'grainActivity',
      data: this.grainActivityData.slice(0, idx),
      activeCount,
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const blockSize = output[0].length;

    if (!input || !input[0]) {
      // No input — output silence
      for (let ch = 0; ch < output.length; ch++) {
        output[ch].fill(0);
      }
      return true;
    }

    const inputL = input[0];
    const inputR = input.length > 1 ? input[1] : input[0];
    const outputL = output[0];
    const outputR = output.length > 1 ? output[1] : output[0];

    // Get parameters
    const grainSizeMs = this._getParam(parameters, 'grain_size', 0);
    const density = this._getParam(parameters, 'density', 0);
    const posScatter = this._getParam(parameters, 'position_scatter', 0);
    const pitchScatter = this._getParam(parameters, 'pitch_scatter', 0);
    const shimmer = this._getParam(parameters, 'shimmer', 0);
    const isReversed = this._getParam(parameters, 'reverse', 0) > 0.5;
    const isFrozen = this._getParam(parameters, 'freeze', 0) > 0.5;

    const size = this._getParam(parameters, 'size', 0) / 100;
    const diffusion = this._getParam(parameters, 'diffusion', 0) / 100;
    const decay = this._getParam(parameters, 'decay', 0);
    const preDelayMs = this._getParam(parameters, 'pre_delay', 0);
    const erAmount = this._getParam(parameters, 'er_amount', 0) / 100;

    const modRate = this._getParam(parameters, 'mod_rate', 0);
    const modDepth = this._getParam(parameters, 'mod_depth', 0) / 100;
    const modTarget = Math.round(this._getParam(parameters, 'mod_target', 0));
    const modWaveform = this._getParam(parameters, 'mod_waveform', 0);

    const width = this._getParam(parameters, 'width', 0) / 100;
    const outputGainDb = this._getParam(parameters, 'output_gain', 0);
    const outputGainLin = Math.pow(10, outputGainDb / 20);

    // LFO
    const lfoVal = this._updateLFO(modRate, modWaveform, blockSize);
    let effectivePosScatter = posScatter;
    let effectiveGrainSize = grainSizeMs;
    let effectivePitchScatter = pitchScatter;
    let effectiveDensity = density;

    if (modDepth > 0) {
      const mod = lfoVal * modDepth;
      switch (modTarget) {
        case 0: effectivePosScatter = clamp(posScatter + mod * 50, 0, 100); break;
        case 1: effectiveGrainSize = clamp(grainSizeMs + mod * 200, 20, 500); break;
        case 2: effectivePitchScatter = clamp(pitchScatter + mod * 12, 0, 24); break;
        case 3: effectiveDensity = clamp(density + mod * 100, 1, 200); break;
      }
    }

    const grainSizeSamples = Math.floor((effectiveGrainSize / 1000) * sampleRate);
    const samplesPerGrain = Math.floor(sampleRate / effectiveDensity);

    // Pre-delay in samples
    const preDelaySamples = Math.min(Math.floor((preDelayMs / 1000) * sampleRate), this.preDelayMax);

    // 1. Write input to circular buffer (if not frozen)
    if (!isFrozen) {
      for (let i = 0; i < blockSize; i++) {
        this.inputBufferL[this.writePointer] = inputL[i];
        this.inputBufferR[this.writePointer] = inputR[i];
        this.writePointer = (this.writePointer + 1) % this.bufferLength;
      }
    }

    // 2. Grain scheduler
    this.grainTimer += blockSize;
    while (this.grainTimer >= samplesPerGrain) {
      this.grainTimer -= samplesPerGrain;
      this._spawnGrain(grainSizeSamples, effectivePosScatter, effectivePitchScatter, isReversed, shimmer);
    }

    // 3. Process all active grains → grain bus
    const grainBusL = new Float32Array(blockSize);
    const grainBusR = new Float32Array(blockSize);

    for (let i = 0; i < MAX_GRAINS; i++) {
      if (this.grains[i].active) {
        this._processGrain(this.grains[i], grainBusL, grainBusR, blockSize);
      }
    }

    // Normalise grain output to prevent loudness explosion at high densities
    const normFactor = 1.0 / Math.sqrt(effectiveDensity / 20);
    for (let i = 0; i < blockSize; i++) {
      grainBusL[i] *= normFactor;
      grainBusR[i] *= normFactor;
    }

    // 4. Pre-delay
    const preDelayedL = new Float32Array(blockSize);
    const preDelayedR = new Float32Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      this.preDelayBufferL[this.preDelayWritePtr] = grainBusL[i];
      this.preDelayBufferR[this.preDelayWritePtr] = grainBusR[i];
      const readPtr = (this.preDelayWritePtr - preDelaySamples + this.preDelayMax + 1) % (this.preDelayMax + 1);
      preDelayedL[i] = this.preDelayBufferL[readPtr];
      preDelayedR[i] = this.preDelayBufferR[readPtr];
      this.preDelayWritePtr = (this.preDelayWritePtr + 1) % (this.preDelayMax + 1);
    }

    // 5. Early reflections (comb filter bank)
    const erBusL = new Float32Array(blockSize);
    const erBusR = new Float32Array(blockSize);
    const erFeedback = 0.3 * erAmount;
    const sizeScalar = 0.3 + size * 1.7;

    for (let c = 0; c < COMB_FILTERS; c++) {
      const delaySamples = (COMB_DELAYS_MS[c] / 1000) * sampleRate * 0.3 * sizeScalar;
      this.combL[c].setDelay(delaySamples);
      this.combR[c].setDelay(delaySamples * 1.12);

      for (let i = 0; i < blockSize; i++) {
        erBusL[i] += this.combL[c].process(preDelayedL[i], erFeedback) * 0.25;
        erBusR[i] += this.combR[c].process(preDelayedR[i], erFeedback) * 0.25;
      }
    }

    // 6. Diffusion network (allpass chain)
    const diffBusL = new Float32Array(blockSize);
    const diffBusR = new Float32Array(blockSize);
    const diffFeedback = diffusion * 0.7;

    // Start with pre-delayed grain bus + early reflections
    for (let i = 0; i < blockSize; i++) {
      diffBusL[i] = preDelayedL[i] + erBusL[i] * erAmount;
      diffBusR[i] = preDelayedR[i] + erBusR[i] * erAmount;
    }

    for (let a = 0; a < ALLPASS_STAGES; a++) {
      const delaySamples = (ALLPASS_DELAYS_MS[a] / 1000) * sampleRate * sizeScalar;
      this.allpassL[a].setDelay(delaySamples);
      this.allpassR[a].setDelay(delaySamples * 1.08);

      for (let i = 0; i < blockSize; i++) {
        diffBusL[i] = this.allpassL[a].process(diffBusL[i], diffFeedback);
        diffBusR[i] = this.allpassR[a].process(diffBusR[i], diffFeedback);
      }
    }

    // Apply decay envelope (simple feedback-like attenuation)
    const decayCoeff = Math.pow(0.001, 1.0 / (decay * sampleRate / blockSize));
    for (let i = 0; i < blockSize; i++) {
      diffBusL[i] *= decayCoeff;
      diffBusR[i] *= decayCoeff;
    }

    // 7. Stereo width (mid-side processing)
    const wetL = new Float32Array(blockSize);
    const wetR = new Float32Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      const mid = (diffBusL[i] + diffBusR[i]) * 0.5;
      const side = (diffBusL[i] - diffBusR[i]) * 0.5;
      wetL[i] = mid + side * width;
      wetR[i] = mid - side * width;
    }

    // 8. Dry/wet mix + output gain
    for (let i = 0; i < blockSize; i++) {
      const mixVal = this._getParam(parameters, 'mix', i) / 100;
      const dryGain = 1.0 - mixVal;
      const wetGain = mixVal;

      outputL[i] = (inputL[i] * dryGain + wetL[i] * wetGain) * outputGainLin;
      outputR[i] = (inputR[i] * dryGain + wetR[i] * wetGain) * outputGainLin;
    }

    // Send grain activity every ~16 frames (~60fps at 128 buffer)
    this.frameCounter++;
    if (this.frameCounter >= 16) {
      this._sendGrainActivity();
      this.frameCounter = 0;
    }

    return true;
  }
}

registerProcessor('granular-reverb-processor', GranularReverbProcessor);
