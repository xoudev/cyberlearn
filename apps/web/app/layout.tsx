import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cookies, headers } from "next/headers";
import { SplashScreen } from "@/components/splash-screen";
import { CookieBanner } from "@/components/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cyber Learn",
    template: "%s · Cyber Learn",
  },
  description: "Plateforme d'apprentissage interactif en cybersécurité, développement et réseaux.",
  icons: {
    icon: "/icon_app.png",
    shortcut: "/icon_app.png",
    apple: "/icon_app.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const consentCookie = cookieStore.get("cl_consent");
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="font-sans antialiased">
        {/*
         * next-themes injects a script in <head> before hydration to prevent
         * the flash-of-wrong-theme. defaultTheme="dark" + class strategy adds
         * class="dark" to <html> by default.
         * suppressHydrationWarning is required because next-themes modifies
         * the <html> class attribute server → client.
         */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
          nonce={nonce}
        >
          <SplashScreen />
          {children}
          <CookieBanner initialConsent={consentCookie?.value} />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
