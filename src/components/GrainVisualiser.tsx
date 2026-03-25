/**
 * GrainVisualiser — Canvas showing real-time grain activity
 */
import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { usePluginStore } from '../store/pluginStore';

export function GrainVisualiser() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainDataRef = useRef<{ data: Float32Array; activeCount: number } | null>(null);
  const animFrameRef = useRef<number>(0);
  const freeze = usePluginStore(s => s.freeze);

  useEffect(() => {
    audioEngine.onGrainActivity((activity) => {
      grainDataRef.current = activity;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 10; i++) {
        const x = (i / 10) * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const y = (i / 4) * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw grains
      const grainData = grainDataRef.current;
      if (grainData && grainData.data) {
        for (let i = 0; i < grainData.data.length; i += 4) {
          const x = grainData.data[i]; // buffer position 0-1
          const y = grainData.data[i + 1]; // pitch offset
          const opacity = grainData.data[i + 2]; // window amplitude
          const age = grainData.data[i + 3]; // window phase

          if (x < 0) continue; // Inactive grain

          const px = x * w;
          const py = h / 2 - y * h * 0.4; // Center vertically, pitch offsets spread

          // Color: teal → gold gradient based on age
          const r = Math.round(62 + (201 - 62) * age);
          const g = Math.round(207 + (168 - 207) * age);
          const b = Math.round(207 + (76 - 207) * age);

          const radius = 2 + opacity * 4;
          const alpha = 0.3 + opacity * 0.7;

          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fill();

          // Glow
          if (opacity > 0.5) {
            ctx.beginPath();
            ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`;
            ctx.fill();
          }
        }
      }

      // Freeze border glow
      if (freeze) {
        ctx.strokeStyle = 'rgba(62, 207, 207, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [freeze]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={120}
      className="w-full h-[120px] rounded-md border border-panel-border"
    />
  );
}
