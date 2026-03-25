import { useEffect, useState } from 'react';
import { PluginShell } from './components/PluginShell';
import { validateKey, getSavedKey, saveKey } from './license';

/* ── Demo Banner ─────────────────────────────────────────── */
function DemoBanner({ secondsLeft, onUnlock }: { secondsLeft: number; onUnlock: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2
                    bg-[#C8962C]/10 border-b border-[#C8962C]/20">
      <span className="text-xs text-[#C8962C] font-bold">
        DEMO MODE — {secondsLeft}s remaining
      </span>
      <button onClick={onUnlock}
        className="text-xs text-white/60 hover:text-white underline">
        Unlock full version →
      </button>
    </div>
  );
}

/* ── License Modal ───────────────────────────────────────── */
function LicenseModal({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');

  const handleSubmit = async () => {
    setStatus('checking');
    const valid = await validateKey(key.trim());
    if (valid) {
      saveKey(key.trim());
      setStatus('success');
      onUnlock();
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm
                    flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#111] border border-[#C8962C]/30
                      rounded-2xl p-8 text-center space-y-5">
        <h2 className="text-2xl font-black text-white">UNLOCK GRANULE</h2>
        <p className="text-sm text-white/40">
          Enter your license key from Gumroad
        </p>
        <input
          value={key}
          onChange={e => setKey(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && key.trim() && handleSubmit()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl
                     px-4 py-3 text-white text-center font-mono text-sm
                     focus:border-[#C8962C] outline-none"
        />
        {status === 'error' && (
          <p className="text-xs text-red-400">
            Key not recognised. Check your Gumroad receipt.
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={status === 'checking' || !key.trim()}
          className="w-full py-3 bg-[#C8962C] text-black font-black
                     rounded-xl disabled:opacity-40"
        >
          {status === 'checking' ? 'Checking...' : 'Unlock'}
        </button>
        <a
          href="https://smash-daddys.gumroad.com/l/granule"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-[#C8962C] hover:underline"
        >
          Buy a license — £15
        </a>
      </div>
    </div>
  );
}

/* ── App Root ────────────────────────────────────────────── */
export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [demoSecondsLeft, setDemoSecondsLeft] = useState(30);
  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check for saved license key on mount
  useEffect(() => {
    (async () => {
      const saved = getSavedKey();
      if (saved && await validateKey(saved)) {
        setIsUnlocked(true);
      }
      setChecking(false);
    })();
  }, []);

  // Demo countdown timer
  useEffect(() => {
    if (isUnlocked || checking) return;
    const interval = setInterval(() => {
      setDemoSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); setShowModal(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked, checking]);

  if (checking) return null;

  return (
    <div className="w-full h-screen bg-plugin-bg flex flex-col overflow-auto">
      {!isUnlocked && demoSecondsLeft > 0 && (
        <DemoBanner secondsLeft={demoSecondsLeft} onUnlock={() => setShowModal(true)} />
      )}
      {showModal && !isUnlocked && (
        <LicenseModal onUnlock={() => { setIsUnlocked(true); setShowModal(false); }} />
      )}
      <div className="flex-1 flex items-center justify-center">
        <PluginShell />
      </div>
      {/* Footer */}
      <footer className="text-xs text-white/20 text-center py-4">
        © 2026 Smash Daddys Ltd
        <span className="mx-2">·</span>
        <a href="https://smash-daddys.gumroad.com" target="_blank" rel="noopener noreferrer"
           className="text-[#C8962C]/60 hover:text-[#C8962C]">
          More tools
        </a>
      </footer>
    </div>
  );
}
