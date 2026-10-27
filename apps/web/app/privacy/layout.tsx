import type { Metadata } from "next";
import { LegalDocumentLayout } from "@/components/legal-document-layout";
import { appShellReaderId } from "@/lib/auth/app-shell-reader";

export const metadata: Metadata = {
  title: {
    default: "Politique de confidentialité",
    template: "%s · Cyber Learn",
  },
};

/**
 * Signed in, the app's shell around the text; signed out, or still owing the
 * second-factor code, the public navbar and footer (components/legal-document-layout.tsx).
 */
export default async function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  return <LegalDocumentLayout readerId={await appShellReaderId()}>{children}</LegalDocumentLayout>;
}
