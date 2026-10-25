import { WorkspaceLoading } from "@/components/workspace-loading";

export function BadgesSkeleton(): React.ReactElement {
  return <WorkspaceLoading variant="badges" label="Chargement : badges" />;
}
