/**
 * The site's tokens as concrete values, for code that cannot read CSS.
 *
 * Monaco's themes, xterm, a canvas and Mermaid are handed colours as strings
 * and parse them in JavaScript. `var(--color-bg-elevated)` is not a colour to
 * any of them: Monaco threw on it and took the lesson page down, xterm painted
 * its own defaults, Mermaid threw and every diagram fell back to its source.
 * Such a library gets a value read here from the cascade, or the token's hex
 * when there is nothing to read: on the server, in a test, a token undefined.
 */

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const COLOR_FUNCTION = /^(rgba?|color)\((.*)\)$/;
const SRGB_ARGUMENTS = /^\s*srgb\s+(.*)$/;

/**
 * A token's value as written, for a library that takes something other than
 * a colour: a font stack. A colour goes through cssColor instead, which also
 * resolves the var() a token can be defined with.
 */
export function cssToken(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === "" ? fallback : value;
}

/** One channel as a byte, from a number on `scale` (255 in rgb(), 1 in color()) or a percentage. */
function toByte(token: string, scale: number): number | null {
  const percent = token.endsWith("%");
  const number = Number(percent ? token.slice(0, -1) : token);
  if (token === "" || !Number.isFinite(number)) return null;
  const unit = percent ? number / 100 : number / scale;
  return Math.round(Math.min(1, Math.max(0, unit)) * 255);
}

function byteHex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

/**
 * A CSS colour as #rrggbb, or #rrggbbaa when it is not opaque: the one format
 * Monaco, xterm, a canvas and Mermaid all read. Takes hex and what browsers
 * compute a colour to (rgb(), rgba(), and color(srgb ...) for a color-mix());
 * anything else is null, for the caller to fall back.
 */
export function toHexColor(css: string): string | null {
  const value = css.trim().toLowerCase();
  const hex = HEX.exec(value)?.[1];
  if (hex !== undefined) {
    const full = hex.length > 4 ? hex : hex.replace(/[0-9a-f]/g, (digit) => digit + digit);
    return full.length === 8 && full.endsWith("ff") ? `#${full.slice(0, 6)}` : `#${full}`;
  }
  const call = COLOR_FUNCTION.exec(value);
  if (call === null) return null;
  const [, name, body = ""] = call;
  let args = body;
  let scale = 255;
  if (name === "color") {
    // Only sRGB: another space (display-p3) would need converting, not reading.
    const srgb = SRGB_ARGUMENTS.exec(body);
    if (srgb === null) return null;
    args = srgb[1] ?? "";
    scale = 1;
  }
  const parts = args.split(/[\s,/]+/).filter((part) => part !== "");
  if (parts.length < 3 || parts.length > 4) return null;
  const bytes: number[] = [];
  for (const [index, part] of parts.entries()) {
    // The alpha runs from 0 to 1 whatever the channels' scale.
    const byte = toByte(part, index === 3 ? 1 : scale);
    if (byte === null) return null;
    bytes.push(byte);
  }
  const [red = 0, green = 0, blue = 0, alpha = 255] = bytes;
  const opaque = `#${byteHex(red)}${byteHex(green)}${byteHex(blue)}`;
  return alpha === 255 ? opaque : opaque + byteHex(alpha);
}

/**
 * A colour token as #rrggbb (#rrggbbaa when translucent), for a library.
 *
 * Read off a probe element's computed `color`, which is where the browser has
 * resolved every var() the token is defined with. The probe goes under
 * `scope` when there is one: the equipped cosmetics are set on a wrapper
 * inside the page, so a token like --cosmetic-accent is only the reader's own
 * below it. Without a token to read, or with a value this cannot turn into
 * hex, the fallback - the token's own hex - is what the library gets.
 */
export function cssColor(name: string, fallback: string, scope?: Element | null): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.setProperty("color", `var(${name})`);
  (scope ?? document.body).appendChild(probe);
  try {
    const computed = getComputedStyle(probe);
    // An undefined token makes `color` invalid, and the probe would then
    // inherit its parent's text colour: a wrong value, not a missing one.
    if (computed.getPropertyValue(name).trim() === "") return fallback;
    return toHexColor(computed.color) ?? fallback;
  } finally {
    probe.remove();
  }
}
