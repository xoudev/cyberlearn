import React from "react";
import { Card, PageHeader } from "../_components/admin-ui";
import { DefRowsSkeleton, LineSkeleton } from "../_components/page-skeletons";
import { SETTINGS_CARDS, SETTINGS_HEADER } from "./_components/settings-head";

/** The settings while the counts are read: the variables beside the volumes, the platform under them. */
export default function SettingsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={SETTINGS_HEADER.crumbs}
        title={SETTINGS_HEADER.title}
        description={SETTINGS_HEADER.description}
      />

      <div className="admin-settings-grid">
        <Card title={SETTINGS_CARDS.env} action={<LineSkeleton width={90} height={18} />}>
          <DefRowsSkeleton count={7} />
        </Card>

        <Card title={SETTINGS_CARDS.database}>
          <DefRowsSkeleton count={7} />
        </Card>

        <div style={{ gridColumn: "1 / -1" }}>
          <Card title={SETTINGS_CARDS.platform}>
            <DefRowsSkeleton count={4} />
          </Card>
        </div>
      </div>
    </main>
  );
}
