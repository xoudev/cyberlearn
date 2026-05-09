import React from "react";
export type EmailActionType = "magiclink" | "signup" | "recovery" | "invite" | "email_change";
interface MagicLinkEmailProps {
  magicLink: string;
  type?: EmailActionType;
}
export declare function MagicLinkEmail({
  magicLink,
  type,
}: MagicLinkEmailProps): React.ReactElement;
export declare function getMagicLinkSubject(type: EmailActionType | string): string;
interface SendMagicLinkOptions {
  apiKey: string;
  from: string;
  to: string;
  magicLink: string;
  type?: EmailActionType;
}
export declare function sendMagicLinkEmail({
  apiKey,
  from,
  to,
  magicLink,
  type,
}: SendMagicLinkOptions): Promise<void>;
export {};
//# sourceMappingURL=magic-link.d.ts.map
