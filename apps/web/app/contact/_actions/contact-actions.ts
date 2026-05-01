"use server";

import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";

const contactSchema = z.object({
  subject: z.string().trim().min(5).max(200),
  theme: z.enum(["BUG", "QUESTION", "FEATURE_REQUEST", "SECURITY", "CONTENT_ERROR", "OTHER"]),
  message: z.string().trim().min(20).max(5000),
  email: z.string().email(),
});

export type ContactFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof contactSchema>, string>>;
};

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    subject: formData.get("subject"),
    theme: formData.get("theme"),
    message: formData.get("message"),
    email: formData.get("email"),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const key = field as keyof typeof fieldErrors;
      if (errs?.[0]) fieldErrors[key] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { subject, theme, message, email } = parsed.data;

  // Get logged-in user if any (contact is also available to guests)
  const authUser = await getRequestUser();

  await prisma.contactTicket.create({
    data: {
      subject,
      theme,
      message,
      email,
      userId: authUser?.id ?? null,
      status: "OPEN",
    },
  });

  return { success: true };
}
