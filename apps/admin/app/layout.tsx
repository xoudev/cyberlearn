import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cyber Learn — Admin",
  description: "Administration dashboard for the CyberLearn platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
