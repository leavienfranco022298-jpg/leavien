import {Download, X} from 'lucide-react';
import React, {useState} from 'react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Install Offline App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
        Offline Install
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#171942] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-install-title" className="text-lg font-semibold text-white">
                  Save LEAVIEN AI for Offline Use
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Service worker caching is active so all Grade 11 lessons, diagnostic questions, and practice quizzes run without internet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-[#0e102c] p-4 text-sm text-slate-200">
              {isIOS ? (
                <>
                  <p>1. Tap the <strong>Share</strong> icon in Safari’s toolbar.</p>
                  <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </>
              ) : (
                <>
                  <p>1. Open your browser menu (or click the install icon in the address bar).</p>
                  <p>2. Select <strong>Install LEAVIEN AI</strong> or <strong>Add to Home Screen</strong> to launch offline anytime.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
