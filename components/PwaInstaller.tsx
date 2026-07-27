"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstaller() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem("cm_install_dismissed") === "true"
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const wasDismissed = window.localStorage.getItem("cm_install_dismissed") === "true";

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      if (!wasDismissed) setDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent || dismissed) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      setDismissed(true);
    }
  }

  function dismiss() {
    window.localStorage.setItem("cm_install_dismissed", "true");
    setDismissed(true);
  }

  return (
    <aside className="pwa-install-card" aria-label="Pasang CaptureMoment">
      <span className="pwa-install-icon"><Download size={18} /></span>
      <div>
        <strong>Capture Pocket</strong>
        <p>Pasang di layar utama untuk akses lebih cepat.</p>
      </div>
      <button type="button" className="pwa-install-action" onClick={() => void install()}>
        Pasang
      </button>
      <button type="button" className="pwa-install-close" onClick={dismiss} aria-label="Tutup saran pemasangan">
        <X size={15} />
      </button>
    </aside>
  );
}
