# Authentication architecture

CyberLearn uses one Supabase Auth identity across the public website, the admin
portal, and the native mobile application.

## User flow

- Registration uses email and password. The password must contain 12 to 128
  characters, at least one letter, and at least one number.
- GitHub OAuth remains available as an alternative sign-in method on the public
  website and the native mobile application.
- The email address must be verified before the first authenticated session.
  A sign-in with the right password on an unconfirmed address says so, instead
  of "wrong credentials", and offers **Renvoyer l'e-mail de confirmation**; the
  site's "check your inbox" step after registration offers it too, and so do
  the app's sign-in and registration screens. Supabase only reports
  `email_not_confirmed` once the password has matched, and the resend answers
  the same sentence whether or not an account waits at that address. On the
  site the action is rate-limited like the other auth actions.
- Password recovery sends one e-mail carrying both a link and a code. The link
  opens `cyberlearn.fr/auth/confirm`, which verifies it and drops a 15-minute
  recovery cookie before `/reset-password`. The code is for the native app: it
  verifies it with `verifyOtp({ type: "recovery" })`, which opens a session
  whose token records `recovery` in its `amr` claim, and asks for the new
  password on its own screen.
- A new password without the current one is accepted only right after that
  step: on the site with the recovery cookie, in the app when the token's
  `recovery` entry is under 15 minutes old (`bearerHasRecoveryGrant`). A
  stolen session alone must still supply the current password. With TOTP
  enabled, both require AAL2 first.
- TOTP MFA is optional for students. Once a verified factor exists, both the web
  and mobile route gates require AAL2 before mounting protected application UI.
  `/mfa` sends a session with no verified factor (`nextLevel !== "aal2"`) on to
  its destination rather than showing a code it cannot satisfy.
- Every screen that asks for a TOTP code (site challenge and enrolment, console
  challenge and enrolment, app challenge and enrolment) sends it on the sixth
  digit, once: a refused code is not sent again on its own, and Enter or the
  button insists on it. The rule is `@cyberlearn/lib/auth/otp-code`; the web
  field is `OtpCodeInput` in `@cyberlearn/ui`. A pasted "123 456" keeps its six
  digits.
- Password and TOTP settings are available on the website and in the native app.

## Admin flow

- Admins use email and password on `admin.cyberlearn.fr`.
- The `ADMIN` role is resolved from the database on the server. The login error
  does not reveal whether an address belongs to an administrator.
- A verified TOTP factor and an AAL2 session are mandatory for every admin page
  and every privileged server action.
- There is no GitHub, magic-link, or MFA bypass on the admin portal.
- The page that was asked for survives sign-in: the middleware sends a
  turned-away request to `/login?redirectTo=…`, then `/mfa?next=…` or
  `/mfa/setup?next=…`, and the last step lands there. Every hop validates the
  value with `authRedirectSchema` and refuses the sign-in steps themselves
  (`apps/admin/lib/auth-redirect.ts`). A session already at AAL2 that opens
  `/login` is sent on to that page.
- `/login?error=` explains why the middleware turned a request away:
  `session_expired`, or `auth_unavailable` when Supabase times out, cannot be
  reached or answers with a 5xx. The page checks the value against that list
  (`loginErrorSchema`); any other value gets a generic line.
- Both TOTP screens offer **Annuler et se déconnecter**. The enrolment starts
  from a button, so it runs once even under React's development double effects.

### Lost authenticator

Supabase TOTP has no backup codes. If an administrator loses every TOTP factor,
an operator holding the service role key removes them from a terminal:

```sh
pnpm --filter @cyberlearn/db db:reset-mfa admin@example.com
```

The script (`packages/db/prisma/reset-mfa.ts`) needs `DATABASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It prints the
account's UUID, role and number of TOTP factors, asks for the address to be
typed again, deletes the factors with `auth.admin.mfa.deleteFactor`, and writes
a `user.mfa.reset` row to `audit_logs` (no actor, `metadata.source = "cli"`).
If that row cannot be written once the factors are gone, the script says so,
prints the account UUID and time to record by hand, and exits non-zero: the
reset happened, do not run it again.
Deleting a verified factor ends every session of the account; the next sign-in
asks for a new enrolment. Check the person's identity out of band before
running it, and record it in the operational incident log. Do not add an
application-level backdoor.

The console refuses this on purpose (see below): one administrator removing
another's second factor is exactly what a single stolen admin session would
do. A two-person flow inside the console may replace this procedure later.

The refusal also covers an account that held the `ADMIN` role in the last 30
days, read from the `user.role.update` rows of the audit log (`previousRole`
or `newRole` equal to `ADMIN`). Without it, one stolen session would demote
the administrator, reset the factor of what is now a learner, promote them
back, and let the attacker enrol a new factor with the phished password
alone. Such an account goes through this procedure too. Role changes made
before the audit row carried `previousRole` only show up through their
`newRole`.

## Unblocking a learner from the console

The account page (`admin.cyberlearn.fr/users/<id>`) reads the sign-in state
from Supabase Auth through the service role: whether the address is
confirmed, the sign-in methods, the TOTP factors (finished or abandoned) and
the last sign-in. Under it, four gestures, each gated by `requireAdminAction`
and written to the audit log:

| Gesture | What it does | Audit action |
| --- | --- | --- |
| Reset the second factor | Deletes every TOTP factor (`auth.admin.mfa.deleteFactor`), which also signs the account out everywhere when a factor was verified. The administrator types the account's address to confirm. Refused on oneself, on any `ADMIN`, and on an account that was one in the last 30 days (break-glass above). The learner receives the `mfa-reset` mail, which carries no code and no sign-in link and says what to do if they asked for nothing | `admin.user.mfa_reset` (factors found, removed, complete) |
| Send a password reset link | The same recovery mail as **Forgot password** (`resetPasswordForEmail`, redirect to `/auth/callback?next=/reset-password`). The link goes to the mailbox only: the console never sees it, which is why it does not use `generateLink` | `admin.user.password_reset_sent` |
| Resend the confirmation mail | Only for an address not yet confirmed (`auth.resend({ type: "signup" })`) | `admin.user.confirmation_resent` |
| Confirm the address | Marks it confirmed without the mail (`email_confirm: true`), after a browser confirmation: for a mail that never arrives | `admin.user.email_confirmed` |

Supabase answers 429 when a mail went to the same address under a minute
ago; the console says so instead of failing.

The audit row is written once the gesture is done. If that write fails, the
gesture is still reported as done, since the account has changed or the mail
has left, and the page says the trace is missing; the failure is logged.

Role changes, on the users list, ask for confirmation first. An administrator
cannot demote themselves, and the last `ADMIN` cannot be demoted: the
repository locks every `ADMIN` row in the transaction that writes the role
(`userRepository.changeRole`), so two administrators demoting each other at
the same moment cannot both succeed. The `user.role.update` audit row, with
the previous role, is written in that same transaction: a role never changes
without its trace.

## Existing account migration

Existing passwordless users keep their Supabase user ID and application data.
They use **Forgot password** once to define their first password. Their existing
email must already be verified; otherwise verify it in Supabase before sending
the recovery email.

Admins follow the same recovery flow on `cyberlearn.fr`, then sign in through
the admin portal and enroll their mandatory TOTP factor.

## Google Play review account

Create a dedicated `STUDENT` account in the production Supabase project:

- use a stable mailbox controlled by CyberLearn;
- mark the email as verified;
- finish onboarding and pre-populate enough data to inspect the application;
- do not enroll MFA on this account;
- do not require payment, an email code, another device, or any expiring step;
- store the password only in the password manager and Google Play Console, never
  in this repository.

Suggested Play Console access instructions:

```text
1. Open CyberLearn.
2. Tap "Sign in".
3. Enter the email address and password provided above.
4. The account is already verified and onboarding is complete.
```

## Production Supabase checklist

In **Authentication > Providers > Email**:

- enable email/password sign-in and user registration;
- require email confirmation;
- set the minimum password length to 12;
- enable leaked-password protection when available on the project plan.

In **Authentication > Multi-Factor Authentication**:

- enable TOTP enrollment and verification;
- keep phone MFA disabled unless a separate threat model and SMS provider are
  approved.

In **Authentication > URL Configuration**:

- set the site URL to `https://cyberlearn.fr`;
- allow `https://cyberlearn.fr/auth/callback`;
- allow `https://www.cyberlearn.fr/auth/callback` during the `www` to apex
  domain transition;
- allow the exact `cyberlearn://auth-callback` PKCE return URL for installed
  iOS and Android builds;
- add the local callback URLs only to non-production projects.

In **Authentication > Providers > GitHub**:

- enable the GitHub provider with the OAuth application client ID and secret;
- configure the GitHub OAuth application callback with the Supabase callback
  URL shown by the provider panel;
- keep the website and mobile redirect URLs above in Supabase's allow list.

The custom email hook at `/api/auth/send-email` must remain configured with its
webhook signing secret so signup confirmation and recovery messages are sent
through the CyberLearn Resend template.

## Compatibility window

### OAuth returns to the homepage without signing in

If GitHub returns to `https://cyberlearn.fr/?code=...`, the PKCE code has reached
the Site URL instead of `/auth/callback`. Check the deployed client's `redirectTo`
and the production Supabase redirect allow list above. Keep the canonical host
consistent so the browser's PKCE verifier cookie is available to the callback.

The web middleware forwards root URLs containing a `code` to `/auth/callback`
before rendering the homepage or checking a session. The callback still performs
the normal PKCE exchange, MFA checks, and profile synchronization. The redirect
is not cached and suppresses the referrer. Start a new GitHub sign-in after
deploying; an old or already-used code cannot be reused.

### Legacy mobile builds

The web implicit-token confirmation route remains temporarily available for
already-installed mobile builds. New clients do not link to it. Remove it after
the supported legacy build window has ended.

`/api/mobile/send-otp`, the legacy sign-in code route, was removed on
27 September 2026. No build in use called it any more, and it was an
unauthenticated endpoint holding the service-role key that mailed a sign-in
code to any address it was given.
