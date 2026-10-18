"use client";

import React, { useActionState } from "react";
import { MAX_FREEZES } from "@cyberlearn/lib";
import { Select } from "@cyberlearn/ui";
import { keepFormInput, useSuccessKey } from "@/lib/form-input";
import {
  MAX_STREAK_DAYS,
  MAX_XP_ADJUSTMENT,
  REASON_MAX,
  REASON_MIN,
} from "@/lib/gamification-corrections";
import {
  adjustXpAction,
  correctStreakAction,
  grantBadgeAction,
  revokeBadgeAction,
  type GamificationActionState,
} from "../../../_actions/gamification-actions";

/**
 * The forms of the XP, streak and badge corrections. Client-side for two
 * things only, the confirmation and the outcome; the panel around them is
 * read on the server.
 *
 * Each one asks before it runs, in a sentence that names the account and the
 * figure, and then says what it did. The outcome sits outside the form: a
 * correction that worked starts its form over (useSuccessKey), for the next
 * one, without taking the sentence with it. A refusal keeps what was typed.
 */

const CHOICE_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--a-fg-2)",
  cursor: "pointer",
};

const FIELDSET: React.CSSProperties = { border: "none", padding: 0, margin: 0 };

const succeeded = (state: GamificationActionState): boolean => state.ok === true;

function Outcome({ state }: { state: GamificationActionState }): React.ReactElement | null {
  if (state.error !== undefined) return <p className="a-form-error">{state.error}</p>;
  if (state.notice === undefined) return null;
  return <p className="a-form-notice">{state.notice}</p>;
}

function ReasonField({ placeholder }: { placeholder: string }): React.ReactElement {
  return (
    <label className="a-field">
      <span className="a-label">Motif</span>
      <textarea
        name="reason"
        required
        minLength={REASON_MIN}
        maxLength={REASON_MAX}
        rows={2}
        className="a-textarea"
        placeholder={placeholder}
      />
      <span className="a-field-hint">
        Obligatoire, inscrit au journal d&apos;audit. La personne ne le voit pas.
      </span>
    </label>
  );
}

/** XP added, or taken back, as a line of the ledger. */
export function XpAdjustForm({
  userId,
  handle,
}: {
  userId: string;
  handle: string;
}): React.ReactElement {
  const [state, action, pending] = useActionState<GamificationActionState, FormData>(
    adjustXpAction,
    {},
  );
  const formKey = useSuccessKey(state, succeeded);

  return (
    <div className="a-form">
      <form
        key={formKey}
        action={action}
        onReset={keepFormInput}
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const amount = Number(data.get("amount"));
          const question =
            data.get("direction") === "remove"
              ? `Retirer ${amount.toLocaleString("fr-FR")} XP à ${handle} ? Son total ne descend pas sous zéro, et son niveau peut baisser. Personne n'est notifié.`
              : `Ajouter ${amount.toLocaleString("fr-FR")} XP à ${handle} ? Son niveau peut monter, sans notification.`;
          // Cancelling the native submit also cancels the action.
          if (!window.confirm(question)) event.preventDefault();
        }}
        className="a-form"
      >
        <input type="hidden" name="userId" value={userId} />

        <fieldset className="a-field" style={FIELDSET}>
          <legend className="a-label">Sens</legend>
          <label style={CHOICE_ROW}>
            <input type="radio" name="direction" value="add" defaultChecked />
            Ajouter de l&apos;XP
          </label>
          <label style={CHOICE_ROW}>
            <input type="radio" name="direction" value="remove" />
            Retirer de l&apos;XP
          </label>
        </fieldset>

        <label className="a-field">
          <span className="a-label">XP</span>
          <input
            name="amount"
            type="number"
            required
            min={1}
            max={MAX_XP_ADJUSTMENT}
            step={1}
            inputMode="numeric"
            className="a-input"
            placeholder="50"
          />
        </label>

        <ReasonField placeholder="Quiz de la leçon 4 corrigé après coup : XP non versés." />

        <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
          {pending ? "Correction…" : "Corriger l'XP"}
        </button>
      </form>
      <Outcome state={state} />
    </div>
  );
}

/** The streak, its record and the freezes in reserve, set by hand. */
export function StreakCorrectionForm({
  userId,
  handle,
  streakDays,
  longestStreak,
  streakFreezes,
}: {
  userId: string;
  handle: string;
  streakDays: number;
  longestStreak: number;
  streakFreezes: number;
}): React.ReactElement {
  const [state, action, pending] = useActionState<GamificationActionState, FormData>(
    correctStreakAction,
    {},
  );
  // Started over after a correction, so the fields show the figures it left.
  const formKey = useSuccessKey(state, succeeded);

  return (
    <div className="a-form">
      <form
        key={formKey}
        action={action}
        onReset={keepFormInput}
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const days = Number(data.get("streakDays"));
          // The record the correction leaves: never under the streak.
          const record = Math.max(days, Number(data.get("longestStreak")));
          const freezes = Number(data.get("streakFreezes"));
          const question = `Mettre la série de ${handle} à ${String(days)} jour${days > 1 ? "s" : ""}, record ${String(record)}, avec ${String(freezes)} gel${freezes > 1 ? "s" : ""} en réserve ?`;
          if (!window.confirm(question)) event.preventDefault();
        }}
        className="a-form"
      >
        <input type="hidden" name="userId" value={userId} />

        <label className="a-field">
          <span className="a-label">Série, en jours</span>
          <input
            name="streakDays"
            type="number"
            required
            min={0}
            max={MAX_STREAK_DAYS}
            step={1}
            inputMode="numeric"
            defaultValue={streakDays}
            className="a-input"
          />
          <span className="a-field-hint">
            Une série rendue après une interruption compte aujourd&apos;hui comme jour actif. Les
            badges et quêtes de série ne sont pas réévalués.
          </span>
        </label>

        <label className="a-field">
          <span className="a-label">Record, en jours</span>
          <input
            name="longestStreak"
            type="number"
            required
            min={0}
            max={MAX_STREAK_DAYS}
            step={1}
            inputMode="numeric"
            defaultValue={longestStreak}
            className="a-input"
          />
          <span className="a-field-hint">
            Suit une série mise au-dessus. Ne descend que si tu le changes, jamais sous la série :
            pour une série gonflée par une erreur, puisqu&apos;il s&apos;affiche sur le profil
            public et dans le Wrapped.
          </span>
        </label>

        <label className="a-field">
          <span className="a-label">Gels en réserve</span>
          <input
            name="streakFreezes"
            type="number"
            required
            min={0}
            max={MAX_FREEZES}
            step={1}
            inputMode="numeric"
            defaultValue={streakFreezes}
            className="a-input"
          />
        </label>

        <ReasonField placeholder="Série coupée par la panne du 11 octobre." />

        <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
          {pending ? "Correction…" : "Corriger la série"}
        </button>
      </form>
      <Outcome state={state} />
    </div>
  );
}

/** A badge granted by hand: paid and notified as one earned. */
export function BadgeGrantForm({
  userId,
  handle,
  badges,
}: {
  userId: string;
  handle: string;
  /** Active badges the account does not hold. */
  badges: { id: string; name: string; xpReward: number }[];
}): React.ReactElement {
  const [state, action, pending] = useActionState<GamificationActionState, FormData>(
    grantBadgeAction,
    {},
  );
  const formKey = useSuccessKey(state, succeeded);

  return (
    <div className="a-form">
      {badges.length === 0 ? (
        <p className="a-field-hint">Ce compte a déjà tous les badges actifs.</p>
      ) : (
        <form
          key={formKey}
          action={action}
          onReset={keepFormInput}
          onSubmit={(event) => {
            const data = new FormData(event.currentTarget);
            const badge = badges.find((entry) => entry.id === data.get("badgeId"));
            if (badge === undefined) return;
            const xp =
              badge.xpReward > 0
                ? ` Il rapporte ${badge.xpReward.toLocaleString("fr-FR")} XP.`
                : "";
            const question = `Attribuer « ${badge.name} » à ${handle} ?${xp} La personne reçoit la notification d'un badge obtenu.`;
            if (!window.confirm(question)) event.preventDefault();
          }}
          className="a-form"
        >
          <input type="hidden" name="userId" value={userId} />
          <label className="a-field">
            <span className="a-label">Badge à attribuer</span>
            <Select
              name="badgeId"
              required
              defaultValue=""
              placeholder="Choisir un badge…"
              aria-label="Badge à attribuer"
              options={badges.map((badge) => ({
                value: badge.id,
                label: badge.name,
                hint: `${badge.xpReward.toLocaleString("fr-FR")} XP`,
              }))}
            />
          </label>
          <ReasonField placeholder="Leçon terminée pendant la panne : badge jamais attribué." />
          <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
            {pending ? "Attribution…" : "Attribuer le badge"}
          </button>
        </form>
      )}
      <Outcome state={state} />
    </div>
  );
}

/** A badge taken away, and with it, when asked, the XP it paid. */
export function BadgeRevokeForm({
  userId,
  handle,
  badges,
}: {
  userId: string;
  handle: string;
  /** Badges the account holds, with the XP each one paid. */
  badges: { id: string; name: string; xpCredited: number }[];
}): React.ReactElement | null {
  const [state, action, pending] = useActionState<GamificationActionState, FormData>(
    revokeBadgeAction,
    {},
  );
  const formKey = useSuccessKey(state, succeeded);

  // Mounted while it has something to say: revoking the last badge empties
  // the list, and the sentence saying so has to stay.
  if (badges.length === 0) return <Outcome state={state} />;

  return (
    <div className="a-form">
      <form
        key={formKey}
        action={action}
        onReset={keepFormInput}
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const badge = badges.find((entry) => entry.id === data.get("badgeId"));
          if (badge === undefined) return;
          const xp =
            data.get("takeBackXp") === "on" && badge.xpCredited > 0
              ? ` Les ${badge.xpCredited.toLocaleString("fr-FR")} XP qu'il a rapportés sont repris.`
              : " Les XP qu'il a rapportés restent acquis.";
          const question = `Retirer « ${badge.name} » à ${handle} ?${xp} Refusé si son critère est encore rempli : il reviendrait tout seul.`;
          if (!window.confirm(question)) event.preventDefault();
        }}
        className="a-form"
      >
        <input type="hidden" name="userId" value={userId} />
        <label className="a-field">
          <span className="a-label">Badge à retirer</span>
          <Select
            name="badgeId"
            required
            defaultValue=""
            placeholder="Choisir un badge obtenu…"
            aria-label="Badge à retirer"
            options={badges.map((badge) => ({
              value: badge.id,
              label: badge.name,
              hint: `a rapporté ${badge.xpCredited.toLocaleString("fr-FR")} XP`,
            }))}
          />
          <span className="a-field-hint">
            Rien ne marque un badge comme retiré : tant que le compte remplit son critère, le badge
            revient à la prochaine visite de ses badges, XP compris, et le retrait est refusé.
            Corrige d&apos;abord ce qui le remplit, ou le critère, ou désactive le badge.
          </span>
        </label>
        <label style={CHOICE_ROW}>
          <input type="checkbox" name="takeBackXp" />
          Reprendre les XP que le badge a rapportés
        </label>
        <ReasonField placeholder="Attribué par erreur : critère mal réglé." />
        <button type="submit" disabled={pending} className="a-btn a-btn--danger">
          {pending ? "Retrait…" : "Retirer le badge"}
        </button>
      </form>
      <Outcome state={state} />
    </div>
  );
}
