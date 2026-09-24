import React from "react";
import { type ColorValue } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

interface IconProps {
  size?: number;
  color: ColorValue;
  strokeWidth?: number;
}

function Base({
  size = 22,
  color,
  strokeWidth = 1.5,
  children,
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function HomeIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Path d="M2.5 7.5 L8 2.5 L13.5 7.5 V13.5 H2.5 Z" />
      <Path d="M6 13.5 V9.5 H10 V13.5" />
    </Base>
  );
}

export function RouteIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Circle cx="4" cy="3" r="1.5" />
      <Circle cx="12" cy="13" r="1.5" />
      <Path d="M4 4.5 V8 C4 10 6 10 8 10 C10 10 12 10 12 11.5" />
    </Base>
  );
}

export function BookIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Path d="M2.5 3 H8 V13 H3.5 C3 13 2.5 13.5 2.5 14 V3 Z" />
      <Path d="M13.5 3 H8 V13 H12.5 C13 13 13.5 13.5 13.5 14 V3 Z" />
    </Base>
  );
}

export function UserIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Circle cx="8" cy="5" r="2.5" />
      <Path d="M2.5 14 C2.5 11 4.5 10 8 10 C11.5 10 13.5 11 13.5 14" />
    </Base>
  );
}

export function BellIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Path d="M4 7 C4 4.8 5.8 3 8 3 C10.2 3 12 4.8 12 7 V10 L13 12 H3 L4 10 Z" />
      <Path d="M6.5 12 C6.5 13 7.2 13.5 8 13.5 C8.8 13.5 9.5 13 9.5 12" />
    </Base>
  );
}

export function ChevronRight(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Polyline points="6,3 11,8 6,13" />
    </Base>
  );
}

export function CheckIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Polyline points="3,8.5 6.5,12 13,4" />
    </Base>
  );
}

export function LockIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Path d="M4.5 7.5 V5.5 a3.5 3.5 0 0 1 7 0 V7.5" />
      <Path d="M3.5 7.5 h9 v6 h-9 z" />
    </Base>
  );
}

export function ChevronLeft(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Polyline points="10,3 5,8 10,13" />
    </Base>
  );
}

export function CrossIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Path d="M4 4 L12 12 M12 4 L4 12" />
    </Base>
  );
}

export function ClockIcon(p: IconProps): React.JSX.Element {
  return (
    <Base {...p}>
      <Circle cx="8" cy="8.8" r="5.2" />
      <Path d="M8 6.2 V8.8 L9.8 10.1 M6.2 2.2 H9.8" />
    </Base>
  );
}
