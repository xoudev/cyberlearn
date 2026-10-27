import { Skeleton } from "@/components/ui/skeleton";
import "./profile-workspace.css";

export function ProfileLoading(): React.ReactElement {
  return (
    <div
      className="page-container learning-catalogue learning-workspace progression-workspace profile-workspace"
      aria-busy="true"
      aria-label="Chargement du profil"
    >
      <div aria-hidden="true">
        <div className="profile-page-heading">
          <Skeleton w={150} h={12} />
          <Skeleton w={180} h={12} />
        </div>
        <div className="profile-hero">
          <div className="profile-identity">
            <Skeleton w={110} h={130} />
            <div>
              <Skeleton w="80%" h={64} />
              <Skeleton w="60%" h={16} style={{ marginTop: 20 }} />
              <Skeleton w={120} h={28} style={{ marginTop: 20 }} />
            </div>
          </div>
          <div className="profile-actions">
            <Skeleton w="100%" h={44} />
            <Skeleton w="100%" h={44} />
            <Skeleton w="100%" h={44} />
          </div>
        </div>
        <div className="profile-progress">
          <Skeleton w={52} h={88} />
          <div>
            <Skeleton w="80%" h={32} />
            <Skeleton w="100%" h={10} style={{ marginTop: 24 }} />
            <Skeleton w="50%" h={12} style={{ marginTop: 16 }} />
          </div>
        </div>
        <div className="profile-totals">
          {[0, 1, 2, 3].map((index) => (
            <div key={index}>
              <Skeleton w="80%" h={12} />
              <Skeleton w={50} h={52} style={{ marginTop: 16 }} />
            </div>
          ))}
        </div>
        <Skeleton w={200} h={32} style={{ marginBlock: 28 }} />
        <Skeleton w="100%" h={240} />
        <div className="profile-tabs">
          <div className="progression-tools">
            <Skeleton w={90} h={44} />
            <Skeleton w={90} h={44} />
            <Skeleton w={110} h={44} />
          </div>
          <div className="profile-realizations">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} w="100%" h={200} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
