import React from "react";
import type { DeletionNotice } from "@/lib/deletion-notice";
import { Card } from "../../_components/admin-ui";

/**
 * What the list says after an account was deleted from its own page: that it
 * is done, and what was not. Each warning names what is left to do by hand.
 */
export function DeletedAccountNotice({ notice }: { notice: DeletionNotice }): React.ReactElement {
  return (
    <div style={{ marginBottom: 18 }} role="status">
      <Card title="Compte supprimé" pad>
        <div style={{ display: "grid", gap: 10 }}>
          <p className="a-form-notice">Le compte et ses données ont été effacés.</p>
          {notice.emailFailed && (
            <p className="a-form-error">
              L&apos;e-mail d&apos;information n&apos;a pas pu être envoyé : la personne n&apos;a
              pas été prévenue de la suppression.
            </p>
          )}
          {notice.authSurvived && (
            <p className="a-form-error">
              L&apos;identifiant de connexion a survécu à la suppression : il reste à le retirer à
              la main dans Supabase (Authentication, Users).
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
