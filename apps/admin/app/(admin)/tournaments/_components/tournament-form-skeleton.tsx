import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card } from "../../_components/admin-ui";
import { FormSkeleton } from "../../_components/page-skeletons";
import { TOURNAMENT_FORM_CARDS } from "./tournament-head";

/**
 * The tournament form while its classes and challenges are read: its three
 * cards under their own titles, then the submit button.
 */
export function TournamentFormSkeleton(): React.ReactElement {
  return (
    <div className="a-form" style={{ display: "grid", gap: 18 }} aria-hidden="true">
      <Card title={TOURNAMENT_FORM_CARDS.tournament} pad>
        <FormSkeleton rows={[1, { height: 90 }, 2]} submit={0} />
      </Card>
      <Card title={TOURNAMENT_FORM_CARDS.teams} pad>
        <FormSkeleton rows={[1, { height: 120 }]} submit={0} />
      </Card>
      <Card title={TOURNAMENT_FORM_CARDS.challenges} pad>
        <div className="a-stack-tight">
          <Skeleton as="span" w="70%" h={10} />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} h={46} />
          ))}
        </div>
      </Card>
      <Skeleton w={170} h={40} />
    </div>
  );
}
