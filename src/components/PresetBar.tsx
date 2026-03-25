/**
 * PresetBar — Preset selector + save/load/export/import
 */
import { useState, useRef } from 'react';
import { usePluginStore } from '../store/pluginStore';

export function PresetBar() {
  const {
    currentPresetName, presets, userPresets,
    loadPreset, saveUserPreset, exportPreset, importPreset,
  } = usePluginStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPresets = [...presets, ...userPresets];

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importPreset(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (saveName.trim()) {
      saveUserPreset(saveName.trim());
      setShowSaveModal(false);
      setSaveName('');
    }
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Preset Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 bg-panel-bg border border-panel-border rounded-md text-xs hover:border-[#3a3a48] transition-colors min-w-[160px]"
        >
          <span className="text-[#e8e8ec] truncate">{currentPresetName}</span>
          <svg className="w-3 h-3 text-[#8888a0] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 bg-[#1a1a22] border border-panel-border rounded-md py-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
            <div className="px-3 py-1 text-[8px] uppercase tracking-widest text-[#8888a0]">Factory</div>
            {presets.map(p => (
              <button
                key={p.name}
                onClick={() => { loadPreset(p); setShowDropdown(false); }}
                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-panel-border/50 ${
                  currentPresetName === p.name ? 'text-knob-active' : 'text-[#e8e8ec]'
                }`}
              >
                {p.name}
              </button>
            ))}
            {userPresets.length > 0 && (
              <>
                <div className="border-t border-panel-border my-1" />
                <div className="px-3 py-1 text-[8px] uppercase tracking-widest text-[#8888a0]">User</div>
                {userPresets.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { loadPreset(p); setShowDropdown(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-panel-border/50 ${
                      currentPresetName === p.name ? 'text-knob-active' : 'text-[#e8e8ec]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={() => { setShowSaveModal(true); setSaveName(currentPresetName === '(modified)' ? '' : currentPresetName); }}
        className="px-2.5 py-1.5 bg-panel-bg border border-panel-border rounded-md text-[10px] uppercase tracking-wider text-[#8888a0] hover:text-[#e8e8ec] hover:border-[#3a3a48] transition-colors"
      >
        Save
      </button>

      {/* Export */}
      <button
        onClick={exportPreset}
        className="px-2.5 py-1.5 bg-panel-bg border border-panel-border rounded-md text-[10px] uppercase tracking-wider text-[#8888a0] hover:text-[#e8e8ec] hover:border-[#3a3a48] transition-colors"
      >
        Export
      </button>

      {/* Import */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2.5 py-1.5 bg-panel-bg border border-panel-border rounded-md text-[10px] uppercase tracking-wider text-[#8888a0] hover:text-[#e8e8ec] hover:border-[#3a3a48] transition-colors"
      >
        Import
      </button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveModal(false)}>
          <div className="bg-[#1a1a22] border border-panel-border rounded-lg p-4 w-[280px]" onClick={e => e.stopPropagation()}>
            <h4 className="text-xs uppercase tracking-wider text-[#8888a0] mb-3">Save Preset</h4>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Preset name..."
              className="w-full bg-panel-bg border border-panel-border rounded px-3 py-2 text-sm text-[#e8e8ec] outline-none focus:border-knob-active"
              autoFocus
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-[#8888a0] hover:text-[#e8e8ec]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-knob-active/20 text-knob-active rounded hover:bg-knob-active/30"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
