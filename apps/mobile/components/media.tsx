import React, { useState } from "react";
import { Image, View } from "react-native";
import Svg, { Path, Polygon, SvgUri } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

const WEB_ORIGIN = "https://cyberlearn.fr";

/** Resolve a stored asset path ("/badges/x.svg") to an absolute URL. */
function absolute(url: string): string {
  if (url.startsWith("http")) return url;
  return `${WEB_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Glyph avatars are stored as "__glyph:<name>"; paths mirror the web profile.
const GLYPH_PATHS: Record<string, string> = {
  skull:
    "M12 4a6 6 0 0 0-6 6c0 2.1 1 4 2.6 5.2V17h6.8v-1.8A6 6 0 0 0 12 4zm-1.5 13v1.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V17h-3zM9 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0z",
  ghost:
    "M12 3a7 7 0 0 0-7 7v9l2-2 2 2 2-2 2 2 2-2 2 2v-9a7 7 0 0 0-7-7zm-2 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  matrix:
    "M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm8 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zM8 16h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z",
  circuit:
    "M2 12h3M19 12h3M12 2v3M12 19v3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  bug: "M9 3h6l-1 3H10zm3 4a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0v-1a5 5 0 0 0-5-5zM4 10H2m20 0h-2M4 7l2 2m12-2-2 2M4 17l2-2m12 2-2-2",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield:
    "M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4zm0 4l5 2.5v4.5c0 3-2 5.8-5 6.75-3-.95-5-3.75-5-6.75V8.5L12 6z",
  wire: "M4 12h4l3-8 4 16 3-8h2",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * User avatar rendered inside a hexagon ring. Handles the three storage forms:
 * "__glyph:<name>" (vector glyph), an SVG preset / uploaded URL, or none
 * (initials fallback).
 */
export function Avatar({
  avatarUrl,
  displayName,
  size = 96,
  color,
}: {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
  color?: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [failed, setFailed] = useState(false);
  const inner = size * 0.62;
  const contentColor = color ?? theme.accent;
  const isGlyph = avatarUrl?.startsWith("__glyph:");
  const isSvg =
    !!avatarUrl && !isGlyph && (avatarUrl.endsWith(".svg") || avatarUrl.includes("/avatars/"));
  const isRaster = !!avatarUrl && !isGlyph && !isSvg && avatarUrl.startsWith("http");

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Hex ring */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }}>
        {theme.frame.strokeWidth > 0 ? (
          <Polygon
            points="50,1 94,25 94,75 50,99 6,75 6,25"
            fill="none"
            stroke={theme.frame.color}
            strokeWidth={theme.frame.strokeWidth + 3}
            opacity={theme.frame.glowOpacity}
          />
        ) : null}
        {theme.hex.glowOpacity > 0 ? (
          <Polygon
            points="50,3 90,26 90,74 50,97 10,74 10,26"
            fill="none"
            stroke={theme.accent}
            strokeWidth={8}
            opacity={theme.hex.glowOpacity}
          />
        ) : null}
        <Polygon
          points="50,3 90,26 90,74 50,97 10,74 10,26"
          fill={theme.accent}
          fillOpacity={theme.hex.fillOpacity}
          stroke={theme.accent}
          strokeWidth={theme.hex.strokeWidth}
          strokeDasharray={theme.hex.dash}
        />
        {theme.frame.strokeWidth > 0 ? (
          <Polygon
            points="50,1 94,25 94,75 50,99 6,75 6,25"
            fill="none"
            stroke={theme.frame.color}
            strokeWidth={theme.frame.strokeWidth}
          />
        ) : null}
      </Svg>

      {avatarUrl && isGlyph && GLYPH_PATHS[avatarUrl.slice(8)] ? (
        <Svg
          width={inner}
          height={inner}
          viewBox="0 0 24 24"
          fill="none"
          stroke={contentColor}
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d={GLYPH_PATHS[avatarUrl.slice(8)]} />
        </Svg>
      ) : isSvg && avatarUrl && !failed ? (
        <SvgUri
          width={inner}
          height={inner}
          uri={absolute(avatarUrl)}
          onError={() => setFailed(true)}
        />
      ) : isRaster && avatarUrl && !failed ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            fontFamily: `${fonts.sans}_800ExtraBold`,
            fontSize: size * 0.3,
            color: contentColor,
          }}
        >
          {initialsOf(displayName)}
        </Text>
      )}
    </View>
  );
}

/**
 * Badge medallion: the real SVG from /badges/*.svg, falling back to a
 * rarity-tinted hexagon if the icon is missing or fails to load.
 */
export function BadgeIcon({
  iconUrl,
  color,
  size = 40,
}: {
  iconUrl: string | null | undefined;
  color: string;
  size?: number;
}): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (!iconUrl || failed) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,6 88,28 88,72 50,94 12,72 12,28"
          fill={`${color}22`}
          stroke={color}
          strokeWidth={4}
        />
        <Polygon points="50,30 68,40 68,60 50,70 32,60 32,40" fill={color} opacity={0.55} />
      </Svg>
    );
  }
  return (
    <SvgUri width={size} height={size} uri={absolute(iconUrl)} onError={() => setFailed(true)} />
  );
}
