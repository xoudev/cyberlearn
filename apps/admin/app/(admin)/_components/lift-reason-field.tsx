import React from "react";

/**
 * The optional reason given when a ban is lifted.
 *
 * One field for both places a ban is lifted from - the account's page and the
 * appeal's ticket - so the two forms ask the same thing, under the same bound
 * the actions hold it to (500 characters), and land in the same column.
 */
export function LiftReasonField(): React.ReactElement {
  return (
    <label className="a-field">
      <span className="a-label">
        Motif de la levée<span className="a-label-optional"> · optionnel</span>
      </span>
      <input
        name="reason"
        maxLength={500}
        className="a-input"
        placeholder="Appel accepté : faux positif"
      />
    </label>
  );
}
