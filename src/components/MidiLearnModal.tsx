/**
 * MidiLearnModal — Shows when MIDI learn is active, waiting for CC input
 */
import { midiManager } from '../audio/MidiManager';

interface MidiLearnModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MidiLearnModal({ visible, onClose }: MidiLearnModalProps) {
  if (!visible) return null;

  const handleCancel = () => {
    midiManager.cancelLearn();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a22] border border-panel-border rounded-lg p-6 text-center">
        <div className="w-8 h-8 border-2 border-knob-active border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#e8e8ec] mb-1">MIDI Learn Active</p>
        <p className="text-xs text-[#8888a0] mb-4">Move any MIDI CC control...</p>
        <button
          onClick={handleCancel}
          className="px-4 py-1.5 text-xs text-[#8888a0] border border-panel-border rounded hover:text-[#e8e8ec]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
