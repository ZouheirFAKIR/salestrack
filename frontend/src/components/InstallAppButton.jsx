import { useState, useEffect } from 'react';

const ACCENT = '#f86635';

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

const APK_URL = '/downloads/SalesTrack.apk';

function InstallAppButton({ variant = 'pill' }) {
  const [installed, setInstalled] = useState(isInstalled());
  const [canPrompt, setCanPrompt] = useState(!!window.deferredInstallPrompt);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onAvailable = () => setCanPrompt(true);
    const onInstalled = () => { setInstalled(true); window.deferredInstallPrompt = null; };
    window.addEventListener('install-available', onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('install-available', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (isAndroid()) {
      const a = document.createElement('a');
      a.href = APK_URL;
      a.download = 'SalesTrack.apk';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setHelpOpen(true);
      return;
    }
    const prompt = window.deferredInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      window.deferredInstallPrompt = null;
      setCanPrompt(false);
    } else {
      setHelpOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={variant === 'menu'
          ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium'
          : 'h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 shrink-0'}
        style={variant === 'menu' ? { color: ACCENT } : { border: `1.5px solid ${ACCENT}`, color: ACCENT }}
        aria-label="Installer l'application"
        title="Installer SalesTrack sur ton téléphone"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M12 7v7m0 0-3-3m3 3 3-3M10 18h4" />
        </svg>
        <span className={variant === 'menu' ? '' : 'hidden 2xl:inline'}>Installer l'app</span>
      </button>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={() => setHelpOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl" />
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Installer SalesTrack</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Accès direct depuis ton écran d'accueil</p>
              </div>
            </div>

            {isAndroid() ? (
              <ol className="text-sm flex flex-col gap-3 mb-5" style={{ color: 'var(--text-secondary)' }}>
                <li><b>1.</b> Le téléchargement de <b>SalesTrack.apk</b> a commencé</li>
                <li><b>2.</b> Ouvre le fichier (notification ou dossier <b>Téléchargements</b>)</li>
                <li><b>3.</b> Appuie sur <b>Installer</b></li>
                <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Samsung : si c'est bloqué, va dans <b>Paramètres → Sécurité et confidentialité → Bloqueur automatique</b>, désactive-le, installe, puis réactive-le.
                </li>
              </ol>
            ) : isIOS() ? (
              <ol className="text-sm flex flex-col gap-3 mb-5" style={{ color: 'var(--text-secondary)' }}>
                <li><b>1.</b> Ouvre ce site dans <b>Safari</b></li>
                <li><b>2.</b> Appuie sur le bouton <b>Partager</b> (carré avec une flèche ↑)</li>
                <li><b>3.</b> Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b></li>
              </ol>
            ) : (
              <ol className="text-sm flex flex-col gap-3 mb-5" style={{ color: 'var(--text-secondary)' }}>
                <li><b>Sur téléphone :</b> ouvre ce site dans <b>Chrome</b>, menu <b>⋮</b> → <b>Installer l'application</b></li>
                <li><b>Sur ordinateur :</b> clique sur l'icône d'installation à droite de la barre d'adresse</li>
              </ol>
            )}

            <button
              onClick={() => setHelpOpen(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallAppButton;