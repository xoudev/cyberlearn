import type React from "react";

export function SectionHead({ label, hint }: { label: string; hint?: string }): React.JSX.Element {
  const title = label.charAt(0) + label.slice(1).toLocaleLowerCase("fr-FR");
  return (
    <header className="settings-section-heading">
      <p>Paramètres / Ton espace</p>
      <h2>
        {title}
        <span aria-hidden="true">.</span>
      </h2>
      {hint && <p>{hint}</p>}
    </header>
  );
}
interface SettingsCardProps {
  title?: string;
  desc?: string;
  info?: React.ReactNode;
  variant?: "key" | "danger";
  children: React.ReactNode;
}
export function SettingsCard({
  title,
  desc,
  info,
  variant,
  children,
}: SettingsCardProps): React.JSX.Element {
  return (
    <section className="settings-card" data-variant={variant}>
      {title && (
        <h3>
          {title}
          {info}
        </h3>
      )}
      {desc && <p className="settings-card__description">{desc}</p>}
      {children}
    </section>
  );
}
