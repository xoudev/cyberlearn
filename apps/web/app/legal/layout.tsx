import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";

export const metadata: Metadata = {
  title: {
    default: "Mentions légales",
    template: "%s · Cyber Learn",
  },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <LegalDocumentLayout>{children}</LegalDocumentLayout>;
}
