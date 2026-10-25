import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationFrame } from "../_components/verification-frame";

export default function VerifyLoading(): React.ReactElement {
  return (
    <div aria-busy="true" aria-label="Vérification du certificat en cours">
      <VerificationFrame detail>
        <div aria-hidden="true">
          <div className="verification-status verification-status--loading">
            <Skeleton w="55%" h={36} />
          </div>
          <div className="verification-document">
            <div className="verification-document__header">
              <Skeleton w="45%" h={44} />
              <Skeleton w="30%" h={20} />
            </div>
            <Skeleton w="30%" h={12} style={{ marginBottom: 20 }} />
            <Skeleton w="70%" h={64} style={{ marginBottom: 36 }} />
            <Skeleton w="85%" h={40} style={{ marginBottom: 32 }} />
            <div className="verification-document__facts">
              {[0, 1, 2].map((index) => (
                <div key={index}>
                  <Skeleton w="70%" h={12} style={{ marginBottom: 14 }} />
                  <Skeleton w="85%" h={28} />
                </div>
              ))}
            </div>
            <Skeleton w="90%" h={40} />
          </div>
          <div className="verification-metadata">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} w="85%" h={42} />
            ))}
          </div>
        </div>
      </VerificationFrame>
    </div>
  );
}
