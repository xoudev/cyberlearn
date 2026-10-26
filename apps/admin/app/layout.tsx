import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono } from "next/font/google";
import { brandTypeface } from "@cyberlearn/ui/brand-typeface";
import { AdminSplashScreen } from "@/components/splash-screen";
import "@/components/splash-screen.css";
import "./globals.css";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ADMIN · Console · CyberLearn", template: "ADMIN · %s · CyberLearn" },
  description: "Administration dashboard · CyberLearn Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  // Set by the middleware for this request. Reading it makes every page render
  // per request, which a nonce needs: a prerendered page would carry a nonce
  // that no response's policy matches.
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`dark ${brandTypeface} ${jetbrains.variable}`}
    >
      <body>
        <AdminSplashScreen nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
