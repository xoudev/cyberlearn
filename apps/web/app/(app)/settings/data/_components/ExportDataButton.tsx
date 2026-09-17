"use client";

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
      toast.error("Erreur lors de l'export. Réessaie plus tard.");
      console.error("[export] error:", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleExport();
      }}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 20px",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        background: "transparent",
        border: "1px solid #0024FF",
        color: loading ? "#44406B" : "#F5F5FA",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "color 150ms ease",
      }}
    >
      <span style={{ color: loading ? "#44406B" : "var(--cosmetic-accent)" }}>&#9656;</span>
      {loading ? "Chargement…" : "Télécharger l'export"}
    </button>
  );
}
