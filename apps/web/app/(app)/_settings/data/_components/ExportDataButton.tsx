"use client";

// The browser downloads the authenticated export response without a navigation.

import { useState } from "react";
import { toast } from "sonner";

export function ExportDataButton(): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const response = await fetch("/api/me/export");

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 60;
        toast.error(`Limite atteinte - réessaie dans ${String(minutes)} min`, {
          description: "1 export autorisé par 24h (Art. 20 RGPD).",
          duration: 8000,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cyberlearn-export-${String(Date.now())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // The route gives back the day's export when it fails to build it, so
      // trying again soon is real advice rather than a 24-hour refusal.
      toast.error("L'export n'a pas pu être préparé. Réessaie dans un moment.");
      console.error("[export] error:", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="settings-button"
      type="button"
      onClick={() => {
        void handleExport();
      }}
      disabled={loading}
    >
      {loading ? "Chargement…" : "Télécharger l'export"}
    </button>
  );
}
