import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

// The token only ever travels to the POST below, so nothing here is cached.
export const dynamic = "force-dynamic";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Last step before an irreversible deletion. The emailed link lands here
 * instead of deleting straight away: a GET is followed by mail clients,
 * scanners and prefetchers, so the destructive call has to be a form the
 * account holder submits themselves.
 */
export default async function AccountDeleteConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  if (!TOKEN_PATTERN.test(token)) redirect("/account/delete/error?reason=invalid");

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#030219",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#0A0826",
          border: "1px solid #2A2560",
          borderTop: "2px solid #FF4757",
          padding: "32px 30px",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#FF4757",
            marginBottom: 18,
          }}
        >
          Suppression définitive
        </div>

        <h1
          style={{
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            margin: "0 0 14px",
          }}
        >
          Confirmer la suppression de ton compte
        </h1>

        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#B8B5D1", margin: "0 0 10px" }}>
          Ton profil, ta progression, tes badges, tes notes et tes certificats seront effacés.
          <b style={{ color: "#F5F5FA" }}> Cette action est irréversible.</b>
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#7F7BA9", margin: "0 0 26px" }}>
          Si tu n&apos;es pas à l&apos;origine de cette demande, ferme simplement cette page : rien
          ne sera supprimé.
        </p>

        <form
          method="POST"
          action="/api/me/delete/confirm"
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            style={{
              minHeight: 44,
              padding: "0 22px",
              background: "#FF4757",
              border: "1px solid #FF4757",
              color: "#fff",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Supprimer définitivement
          </button>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "0 22px",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Annuler
          </Link>
        </form>
      </div>
    </main>
  );
}
