import { Barlow_Condensed, Space_Grotesk } from "next/font/google";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const text = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-interface",
  display: "swap",
});

export const brandTypeface = `${display.variable} ${text.variable}`;
