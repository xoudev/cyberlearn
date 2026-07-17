import React from "react";
import Image from "next/image";

function CheckIcon(): React.ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 1.5 L13.5 4 V8 C13.5 11.5 11 13.5 8 14.5 C5 13.5 2.5 11.5 2.5 8 V4 Z" />
      <path d="M5.8 8 L7.3 9.5 L10.2 6.5" />
    </svg>
  );
}

/** Split-panel shell for the admin auth screens (login, MFA challenge, MFA setup). */
export function AdminAuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="a-auth">
      <aside className="a-auth-brand">
        <div>
          <Image
            src="/Admin_logo.png"
            alt="CyberLearn Admin"
            width={170}
            height={36}
            style={{ width: "auto", height: 36, objectFit: "contain" }}
            priority
          />
          <h2 className="a-auth-tagline">
            La console qui pilote
            <br />
            <em>cyberlearn.fr</em>
          </h2>
        </div>

        <ul className="a-auth-points">
          <li>
            <CheckIcon />
            Accès réservé au rôle ADMIN
          </li>
          <li>
            <CheckIcon />
            Double authentification obligatoire
          </li>
          <li>
            <CheckIcon />
            Chaque action est journalisée dans l&apos;audit log
          </li>
        </ul>
      </aside>

      <section className="a-auth-panel">
        <div className="a-auth-card">
          <div className="a-eyebrow">{eyebrow}</div>
          <h1 className="a-h1" style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>
            {title}
          </h1>
          <p className="a-sub">{description}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
