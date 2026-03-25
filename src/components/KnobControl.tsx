/**
 * KnobControl — Custom SVG rotary knob with drag, double-click reset, right-click MIDI learn
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { midiManager } from '../audio/MidiManager';
import { PARAM_RANGES, usePluginStore } from '../store/pluginStore';
import type { ParamName } from '../audio/AudioEngine';

interface KnobControlProps {
  paramName: string;
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  step?: number;
  unit?: string;
  decimals?: number;
  color?: string;
  size?: number;
}

const ARC_START = 0.75 * Math.PI;
const ARC_END = 2.25 * Math.PI;
const ARC_RANGE = ARC_END - ARC_START;

export function KnobControl({
  paramName, label, value, min, max, defaultValue,
  step = 0.1, unit = '', decimals = 1, color = '#c9a84c', size = 56,
}: KnobControlProps) {
  const setParam = usePluginStore(s => s.setParam);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMidiMenu, setShowMidiMenu] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);
  const hasMidi = midiManager.hasMidiMapping(paramName as ParamName);

  const normalized = (value - min) / (max - min);
  const angle = ARC_START + normalized * ARC_RANGE;

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 6;

  // Arc path for active indicator
  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click handled separately
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;
    document.body.classList.add('knob-dragging');
  }, [value]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const sensitivity = e.shiftKey ? 0.001 : 0.005;
      const range = max - min;
      const newValue = Math.max(min, Math.min(max, dragStartValue.current + deltaY * sensitivity * range));
      setParam(paramName, Number(newValue.toFixed(decimals)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.classList.remove('knob-dragging');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, paramName, decimals, setParam]);

  const handleDoubleClick = () => {
    setParam(paramName, defaultValue);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMidiMenu(true);
  };

  const handleMidiLearn = () => {
    setShowMidiMenu(false);
    const range = PARAM_RANGES[paramName];
    if (!range) return;
    midiManager.startLearn((cc, channel) => {
      midiManager.addMapping({
        cc, channel,
        paramName: paramName as ParamName,
        min: range.min,
        max: range.max,
      });
    });
  };

  const handleClearMidi = () => {
    setShowMidiMenu(false);
    midiManager.removeMapping(paramName as ParamName);
  };

  const displayValue = decimals === 0 ? Math.round(value) : value.toFixed(decimals);

  return (
    <div
      className="flex flex-col items-center gap-1 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => { setShowTooltip(false); setShowMidiMenu(false); }}
    >
      {/* Tooltip */}
      <div className={`tooltip ${showTooltip && !isDragging ? 'tooltip-visible' : ''}`}>
        {label}: {displayValue}{unit}
      </div>

      {/* MIDI context menu */}
      {showMidiMenu && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a22] border border-panel-border rounded-md py-1 z-50 text-xs min-w-[120px]">
          <button
            className="w-full px-3 py-1.5 text-left hover:bg-panel-border/50 text-[#e8e8ec]"
            onClick={handleMidiLearn}
          >
            MIDI Learn
          </button>
          {hasMidi && (
            <button
              className="w-full px-3 py-1.5 text-left hover:bg-panel-border/50 text-red-400"
              onClick={handleClearMidi}
            >
              Clear MIDI
            </button>
          )}
        </div>
      )}

      {/* SVG Knob */}
      <svg
        width={size}
        height={size}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Background track */}
        <path
          d={arcPath(ARC_START, ARC_END, r)}
          fill="none"
          stroke="var(--knob-inactive)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Active track */}
        {normalized > 0.005 && (
          <path
            d={arcPath(ARC_START, angle, r)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {/* Pointer dot */}
        <circle
          cx={cx + (r - 2) * Math.cos(angle)}
          cy={cy + (r - 2) * Math.sin(angle)}
          r={3}
          fill={color}
        />
        {/* Center circle */}
        <circle cx={cx} cy={cy} r={r - 10} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={1} />
        {/* MIDI indicator */}
        {hasMidi && (
          <circle cx={cx + 14} cy={cy - 14} r={3} fill="#4ade80" />
        )}
      </svg>

      {/* Value */}
      <span className="text-[10px] font-mono text-knob-active tabular-nums">
        {displayValue}{unit}
      </span>

      {/* Label */}
      <span className="text-[9px] text-[#8888a0] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
