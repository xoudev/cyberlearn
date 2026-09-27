import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { AdminSplashScreen } from "@/components/splash-screen";
import "@/components/splash-screen.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin · Cyber Learn", template: "%s · Admin" },
  description: "Administration dashboard · CyberLearn Platform",
  icons: {
    icon: "/Admin_logo.png",
    shortcut: "/Admin_logo.png",
    apple: "/Admin_logo.png",
  },
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
      data-scroll-behavior="smooth"
      className={`dark ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body>
        <AdminSplashScreen nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
