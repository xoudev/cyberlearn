import { z } from "zod";

const externalLinkPropsSchema = z.object({
  href: z.url(),
  children: z.string().optional(),
  /** Optional short description shown below the link label */
  description: z.string().optional(),
  /** "link" - inline text link | "card" (default) - standalone card block */
  variant: z.enum(["card", "link"]).optional().default("card"),
});

type ExternalLinkProps = z.input<typeof externalLinkPropsSchema> & {
  children?: React.ReactNode;
};

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

function isSafeUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return ALLOWED_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/** "owasp.org" for https://www.owasp.org/…: the source, as a reader names it. */
export function linkSource(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./u, "");
  } catch {
    return href;
  }
}

/** The way out: up and to the right, square-ended like the site's icons. */
function Arrow({ className }: { className: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.5l7-7M6 4.5h5.5V10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** Said after the link's name: it leaves the lesson for another tab. */
const NEW_TAB = "(s'ouvre dans un nouvel onglet)";

/**
 * A resource outside the lesson, most often in its "pour aller plus loin".
 *
 * The card is a row on the panel's surface: the source in the meta grey, the
 * title, the author's line about it, and an arrow that leans toward the
 * corner it leads out of on hover and on focus, where the edge takes the
 * accent. Its look is the stylesheet's (globals.css, `.lesson-link`): it used
 * to be inline, with a blue icon tile and a glow set from mouse handlers,
 * which made a client component of a link.
 */
export function ExternalLink(rawProps: ExternalLinkProps): React.JSX.Element {
  const { children, ...rest } = rawProps;
  const result = externalLinkPropsSchema.safeParse({
    ...rest,
    children: typeof children === "string" ? children : undefined,
  });

  if (!result.success || !isSafeUrl(result.data.href)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[ExternalLink] invalid props:",
        result.success ? "unsafe URL" : z.flattenError(result.error),
      );
    }
    return <span className="lesson-link-invalid">[ExternalLink] URL invalide</span>;
  }

  const { href, description, variant } = result.data;
  const label =
    typeof children === "string" && children.length > 0 ? children : (result.data.children ?? href);

  if (variant === "link") {
    return (
      <a className="lesson-link-inline" href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <Arrow className="lesson-link-inline__arrow" />
        <span className="sr-only"> {NEW_TAB}</span>
      </a>
    );
  }

  return (
    <a className="lesson-link" href={href} target="_blank" rel="noopener noreferrer">
      <span className="lesson-link__body">
        <span className="lesson-link__source">{linkSource(href)}</span>
        <span className="lesson-link__title">{label}</span>
        {description !== undefined && description !== "" && (
          <span className="lesson-link__description">{description}</span>
        )}
      </span>
      <Arrow className="lesson-link__arrow" />
      <span className="sr-only"> {NEW_TAB}</span>
    </a>
  );
}
