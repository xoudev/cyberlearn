import NextImage from "next/image";
import { z } from "zod";

const lessonImagePropsSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
  width: z.coerce.number().int().positive().optional().default(1200),
  height: z.coerce.number().int().positive().optional().default(675),
  /** "default" — centered with border | "full" — full bleed | "inline" — float in text */
  variant: z.enum(["default", "full", "inline"]).optional().default("default"),
});

type LessonImageProps = z.input<typeof lessonImagePropsSchema>;

export function LessonImage(rawProps: LessonImageProps): React.JSX.Element {
  const result = lessonImagePropsSchema.safeParse(rawProps);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[LessonImage] invalid props:", result.error.flatten());
    }
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(255,71,87,0.07)",
          border: "1px solid rgba(255,71,87,0.3)",
          borderLeft: "3px solid #FF4757",
          color: "#FF4757",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          margin: "1.5rem 0",
        }}
      >
        [LessonImage] props invalides — vérifiez `src` et `alt`
      </div>
    );
  }

  const { src, alt, caption, width, height, variant } = result.data;

  const isExternal = src.startsWith("http://") || src.startsWith("https://");

  const figureStyle: React.CSSProperties =
    variant === "inline"
      ? { float: "right", margin: "0 0 1rem 1.5rem", maxWidth: "320px" }
      : variant === "full"
        ? { margin: "2rem -24px" }
        : { margin: "2rem 0" };

  return (
    <figure style={{ ...figureStyle, display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          background: "#050419",
          border: "1px solid #1F1B47",
          overflow: "hidden",
          lineHeight: 0,
        }}
      >
        {isExternal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        ) : (
          <NextImage
            src={src}
            alt={alt}
            width={width}
            height={height}
            style={{ width: "100%", height: "auto", display: "block" }}
            sizes="(max-width: 768px) 100vw, 800px"
          />
        )}
      </div>

      {caption && (
        <figcaption
          style={{
            fontSize: "12px",
            color: "#6B6890",
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.02em",
            padding: "0 4px",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
