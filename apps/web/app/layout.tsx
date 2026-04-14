import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cyber Learn",
    template: "%s — Cyber Learn",
  },
  description: "Plateforme d'apprentissage interactif en cybersécurité, développement et réseaux.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
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
