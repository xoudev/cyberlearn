-- CreateTable
CREATE TABLE "class_invitations" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "invitedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "class_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_invitations_email_acceptedAt_idx" ON "class_invitations"("email", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "class_invitations_classId_email_key" ON "class_invitations"("classId", "email");

-- AddForeignKey
ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- An invitation names a person who has no account yet, so there is no one it
-- could be shown to through the Data API: the address it holds is the whole
-- content, and it belongs to someone who cannot be authenticated as themselves
-- until they sign up - at which point the row is redeemed and a membership
-- exists instead. RLS is therefore enabled with a policy for administrators
-- only; every other read goes through Prisma, which connects as the table owner
-- and is scoped in its where clause.
ALTER TABLE "class_invitations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_invitations_select_admin" ON public.class_invitations FOR SELECT
  USING (public.current_user_role() = 'ADMIN');
