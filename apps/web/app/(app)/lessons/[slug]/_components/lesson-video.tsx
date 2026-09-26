import { z } from "zod";

const lessonVideoPropsSchema = z.object({
  src: z.string().min(1),
  title: z.string().optional(),
  caption: z.string().optional(),
  /** 16/9 (default) | 4/3 | 1/1 */
  aspect: z.enum(["16/9", "4/3", "1/1"]).optional().default("16/9"),
});

type LessonVideoProps = z.input<typeof lessonVideoPropsSchema>;

const ASPECT_PADDING: Record<string, string> = {
  "16/9": "56.25%",
  "4/3": "75%",
  "1/1": "100%",
};

export function LessonVideo(rawProps: LessonVideoProps): React.JSX.Element {
  const result = lessonVideoPropsSchema.safeParse(rawProps);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[LessonVideo] invalid props:", result.error.flatten());
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
        [LessonVideo] prop invalide, vérifiez `src`
      </div>
    );
  }

  const { src, title, caption, aspect } = result.data;
  const paddingBottom = ASPECT_PADDING[aspect] ?? "56.25%";

  return (
    <figure
      style={{
        margin: "2rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            background: "rgba(5,4,26,0.85)",
            border: "1px solid #2A2560",
            borderLeft: "3px solid var(--cosmetic-accent)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            color: "#B8B5D1",
            letterSpacing: "0.03em",
          }}
        >
          <span style={{ color: "var(--cosmetic-accent)", fontSize: "9px" }}>▶</span>
          {title}
        </div>
      )}

      <div
        style={{
          position: "relative",
          paddingBottom,
          height: 0,
          overflow: "hidden",
          background: "#050419",
          border: "1px solid #1F1B47",
        }}
      >
        <video
          src={src}
          controls
          preload="metadata"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      </div>

      {caption && (
        <figcaption
          style={{
            fontSize: "12px",
            color: "#7F7BA9",
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
