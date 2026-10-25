import { Skeleton } from "@/components/ui/skeleton";
import "./progression-workspace.css";

type WorkspaceVariant =
  | "revisions"
  | "challenges"
  | "notes"
  | "badges"
  | "certificates"
  | "locker"
  | "leaderboard";

export function WorkspaceLoading({
  variant,
  label,
}: {
  variant: WorkspaceVariant;
  label: string;
}): React.ReactElement {
  const rows = variant === "revisions" || variant === "leaderboard";
  const feature = variant === "challenges" || variant === "certificates";
  return (
    <div
      className="page-container learning-catalogue learning-workspace progression-workspace workspace-loading"
      aria-busy="true"
      aria-label={label}
    >
      <div aria-hidden="true">
        <div className="catalogue-masthead">
          <div>
            <Skeleton w={190} h={12} style={{ marginBottom: 20 }} />
            <Skeleton w="min(65vw,600px)" h={76} />
            <Skeleton w="min(65vw,420px)" h={14} style={{ marginTop: 20 }} />
          </div>
        </div>
        <div className="catalogue-ledger">
          <Skeleton w={110} h={28} />
          <Skeleton w={130} h={28} />
        </div>
        <div className="progression-tools">
          <Skeleton w={100} h={44} />
          <Skeleton w={100} h={44} />
          <Skeleton w={100} h={44} />
        </div>
        {feature && <Skeleton w="100%" h={280} style={{ marginTop: 28 }} />}
        <div className="workspace-loading__items" data-rows={rows}>
          {[0, 1, 2, 3].map((index) => (
            <div className="workspace-loading__item" key={index}>
              <Skeleton w={rows ? 40 : 80} h={rows ? 40 : 80} />
              <div>
                <Skeleton w="75%" h={28} />
                <Skeleton w="90%" h={12} style={{ marginTop: 18 }} />
                <Skeleton w="55%" h={12} style={{ marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
