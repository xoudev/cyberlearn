import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
    template: "%s — Cyber Learn",
  },
  description: "Plateforme d'apprentissage interactif en cybersécurité, développement et réseaux.",
  icons: {
    icon: "/icon_app.png",
    shortcut: "/icon_app.png",
    apple: "/icon_app.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
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
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
