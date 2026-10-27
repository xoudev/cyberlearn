import React from "react";
import { StandaloneFrame } from "@/components/standalone-frame";

export function KeepCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <StandaloneFrame>
      <p className="state-code">Inactivité du compte</p>
      <h1 id="standalone-title" className="state-title">
        {title}
      </h1>
      <div className="state-description">{children}</div>
    </StandaloneFrame>
  );
}
