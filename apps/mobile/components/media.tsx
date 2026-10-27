import React, { useState } from "react";
import { Image, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
// The CSS-aware loader: uploaded icons (SVG Repo exports) hide their bounding
// square with a <style> rule that plain SvgUri ignores, drawing a grey block.
import { SvgCssUri } from "react-native-svg/css";
import { fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { SITE_URL } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * Resolve a stored asset path ("/badges/x.svg") to an absolute URL, on the
 * site the app is pointed at: the production address written in left the
 * icons of badges created on a staging or local site blank.
 */
function absolute(url: string): string {
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Glyph avatars are stored as "__glyph:<name>"; paths mirror the web's
// apps/web/lib/avatar/glyphs.ts (angular strokes: square caps, mitred joins).
const GLYPH_PATHS: Record<string, string> = {
  skull: "M7 3H17L20 6V13L17 16V20H7V16L4 13V6ZM8 9H11V12H8ZM13 9H16V12H13ZM10 16V20M14 16V20",
  ghost: "M5 21V8L10 3H14L19 8V21L15.5 17.5L12 21L8.5 17.5ZM9 9H11V12H9ZM13 9H15V12H13Z",
  matrix:
    "M4.5 3V7M4.5 10V12M4.5 15V21M9.5 3V5M9.5 8V14M9.5 17V19M14.5 3V9M14.5 12V14M14.5 17V21M19.5 5V11M19.5 14V18",
  circuit: "M8 8H16V16H8ZM10 3V8M14 3V8M10 16V21M14 16V21M3 10H8M3 14H8M16 10H21M16 14H21",
  bug: "M9 8H15L17 10V16L14 19H10L7 16V10ZM10 8V5H14V8M3 12H7M17 12H21M4 7L7 10M20 7L17 10M4 19L7 16M20 19L17 16",
  key: "M2.5 7.5H11.5V16.5H2.5ZM11.5 12H21.5M16.5 12V16M20 12V15.5",
  shield: "M4 3H20V12L12 20L4 12ZM8 7H16V10.5L12 14.5L8 10.5Z",
  wire: "M2 12H6L8.14 4L12.43 20L14.57 12H22",
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
  // Judged on the path alone: a signed upload URL also runs through an
  // "avatars" bucket (…/sign/avatars/…png?token=…) and is a raster image,
  // which SvgUri draws as nothing at all.
  const isSvg =
    !!avatarUrl &&
    !isGlyph &&
    ((avatarUrl.split("?")[0] ?? "").endsWith(".svg") || avatarUrl.startsWith("/avatars/"));
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
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <Path d={GLYPH_PATHS[avatarUrl.slice(8)]} />
        </Svg>
      ) : isSvg && avatarUrl && !failed ? (
        <SvgCssUri
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
    <SvgCssUri width={size} height={size} uri={absolute(iconUrl)} onError={() => setFailed(true)} />
  );
}
