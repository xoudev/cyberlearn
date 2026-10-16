import type { Metadata } from "next";
import { pageAddress } from "@/app/page-metadata";

export const metadata: Metadata = {
  title: "Contact",
  description: "Signale un bug, une erreur de contenu ou envoie une suggestion à CyberLearn.",
  ...pageAddress("/contact"),
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
