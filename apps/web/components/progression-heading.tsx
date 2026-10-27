export function ProgressionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <header className="catalogue-masthead">
      <div className="catalogue-masthead__title">
        <p className="catalogue-masthead__eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
