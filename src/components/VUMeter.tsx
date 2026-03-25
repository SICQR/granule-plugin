/**
 * VUMeter — Vertical level meter (Canvas, 60fps)
 */
import { useEffect, useRef } from 'react';

interface VUMeterProps {
  analyser: AnalyserNode | null;
  label: string;
  width?: number;
  height?: number;
}

export function VUMeter({ analyser, label, width = 24, height = 80 }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const peakRef = useRef(0);
  const peakDecay = 0.995;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = () => {
      analyser.getFloatTimeDomainData(dataArray);

      // RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Convert to dB (0dBFS = 1.0)
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      const normalised = Math.max(0, Math.min(1, (db + 60) / 60));

      // Peak hold
      if (normalised > peakRef.current) {
        peakRef.current = normalised;
      } else {
        peakRef.current *= peakDecay;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, w, h);

      // Meter segments
      const segments = 20;
      const segHeight = h / segments - 1;

      for (let i = 0; i < segments; i++) {
        const segNorm = (segments - i) / segments;
        const active = segNorm <= normalised;

        let color = '#2a2a35';
        if (active) {
          if (segNorm > 0.9) color = '#ef4444'; // Red
          else if (segNorm > 0.75) color = '#c9a84c'; // Gold
          else color = '#3ecfcf'; // Teal
        }

        const y = i * (segHeight + 1);
        ctx.fillStyle = color;
        ctx.fillRect(1, y, w - 2, segHeight);
      }

      // Peak marker
      const peakY = h - peakRef.current * h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, peakY, w, 1);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyser]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-sm"
      />
      <span className="text-[8px] uppercase tracking-wider text-[#8888a0]">{label}</span>
    </div>
  );
}
