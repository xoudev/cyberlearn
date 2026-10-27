import React from "react";
import Link from "next/link";
import { BastionLogo } from "./bastion-logo";
import "@/app/standalone-page.css";

export function StandaloneFrame({
  children,
  titleId = "standalone-title",
  danger = false,
  embedded = false,
}: {
  children: React.ReactNode;
  titleId?: string;
  danger?: boolean;
  embedded?: boolean;
}): React.ReactElement {
  const Root = embedded ? "section" : "main";
  return (
    <Root
      className={`standalone-page${danger ? " standalone-page--danger" : ""}${embedded ? " standalone-page--embedded" : ""}`}
    >
      <section className="standalone-page__card" aria-labelledby={titleId}>
        <header className="standalone-page__brandbar">
          <Link href="/" className="standalone-page__brand" aria-label="CyberLearn · accueil">
            <BastionLogo size={32} />
            <span>
              CyberLearn<b>.</b>
            </span>
          </Link>
        </header>
        <div className="standalone-page__body">{children}</div>
      </section>
    </Root>
  );
}
