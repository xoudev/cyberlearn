const SVG_DATA_URI_PREFIX = "data:image/svg+xml";

/** Converts Supabase's TOTP QR data URI back to XML for react-native-svg. */
export function readTotpQrSvg(qrCode: string): string | null {
  if (qrCode.trimStart().startsWith("<svg")) return qrCode;
  if (!qrCode.startsWith(SVG_DATA_URI_PREFIX)) return null;

  const separatorIndex = qrCode.indexOf(",");
  if (separatorIndex === -1) return null;

  const payload = qrCode.slice(separatorIndex + 1);
  let xml = payload;
  try {
    xml = decodeURIComponent(payload);
  } catch {
    // Supabase currently returns raw XML after the data URI prefix.
  }

  return xml.trimStart().startsWith("<svg") ? xml : null;
}
