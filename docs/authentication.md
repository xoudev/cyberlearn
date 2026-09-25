# Authentication architecture

CyberLearn uses one Supabase Auth identity across the public website, the admin
portal, and the native mobile application.

## User flow

- Registration uses email and password. The password must contain 12 to 128
  characters, at least one letter, and at least one number.
- GitHub OAuth remains available as an alternative sign-in method on the public
  website and the native mobile application.
- The email address must be verified before the first authenticated session.
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
- Password and TOTP settings are available on the website and in the native app.

## Admin flow

- Admins use email and password on `admin.cyberlearn.fr`.
- The `ADMIN` role is resolved from the database on the server. The login error
  does not reveal whether an address belongs to an administrator.
- A verified TOTP factor and an AAL2 session are mandatory for every admin page
  and every privileged server action.
- There is no GitHub, magic-link, or MFA bypass on the admin portal.

If an administrator loses every TOTP factor, recovery must be performed by an
authorized operator in the Supabase dashboard. Do not add an application-level
backdoor. Record the factor removal in the operational incident log.

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

`/api/mobile/send-otp` and the web implicit-token confirmation route remain
temporarily available for already-installed mobile builds. New clients do not
link to them. Remove both after the supported legacy build window has ended.
