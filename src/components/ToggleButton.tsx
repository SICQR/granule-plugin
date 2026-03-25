/**
 * ToggleButton — Illuminated toggle (Freeze / Reverse)
 */
import { usePluginStore } from '../store/pluginStore';

interface ToggleButtonProps {
  paramName: string;
  label: string;
  active: boolean;
  color?: string;
  pulseWhenActive?: boolean;
}

export function ToggleButton({
  paramName, label, active, color = '#c9a84c', pulseWhenActive = false,
}: ToggleButtonProps) {
  const setParam = usePluginStore(s => s.setParam);

  const handleClick = () => {
    setParam(paramName, !active);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-xs uppercase tracking-wider
        border transition-all duration-200
        ${active
          ? `border-transparent text-white ${pulseWhenActive ? 'freeze-pulse' : ''}`
          : 'border-panel-border text-[#8888a0] hover:border-[#3a3a48]'
        }
      `}
      style={{
        background: active ? `${color}22` : 'var(--panel-bg)',
        borderColor: active ? color : undefined,
        color: active ? color : undefined,
      }}
    >
      <span
        className="w-2 h-2 rounded-full transition-all"
        style={{
          background: active ? color : 'var(--knob-inactive)',
          boxShadow: active ? `0 0 8px ${color}` : 'none',
        }}
      />
      {label}
    </button>
  );
}
