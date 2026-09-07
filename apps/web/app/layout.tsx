import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cookies, headers } from "next/headers";
import { SplashScreen } from "@/components/splash-screen";
import { CookieBanner } from "@/components/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "./site-url";
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
  // Without a base, every relative canonical and Open Graph URL resolved
  // against nothing, so none of them were emitted.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CyberLearn — Apprendre la cybersécurité en pratique",
    template: "%s · CyberLearn",
  },
  // The previous description ("Plateforme d'apprentissage interactif en
  // cybersécurité, développement et réseaux") was generic enough that Google
  // discarded it and rewrote the snippet from the hero paragraph instead. This
  // one names what the platform concretely offers.
  description:
    "Plateforme française d'apprentissage : cybersécurité, développement et réseaux. Leçons interactives en sandbox isolé, parcours progressifs, certificats vérifiables.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "CyberLearn",
    title: "CyberLearn — Apprendre la cybersécurité en pratique",
    description:
      "Leçons interactives en sandbox isolé, parcours progressifs et certificats vérifiables, en cybersécurité, développement et réseaux.",
  },
  twitter: {
    card: "summary",
    title: "CyberLearn — Apprendre la cybersécurité en pratique",
    description:
      "Leçons interactives en sandbox isolé, parcours progressifs et certificats vérifiables.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CyberLearn",
  },
  // No `icons` block on purpose: it used to point every icon at
  // /icon_app.png, which is 1565x1537. Google requires a square favicon and
  // showed the generic globe instead. Next now picks up app/icon.png,
  // app/apple-icon.png and app/favicon.ico, which are square.
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
         * Dark-only for launch: the light theme isn't designed yet, so the
         * provider is pinned with forcedTheme="dark". This overrides any stored
         * value or setTheme() call, so the app always renders dark regardless of
         * the OS preference. suppressHydrationWarning is required because
         * next-themes sets the <html> class before hydration.
         */}
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          defaultTheme="dark"
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
