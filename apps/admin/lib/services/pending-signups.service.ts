import { lastPage, userRepository } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";

/**
 * The sign-ups the console cannot find in its own tables.
 *
 * An account gets its row in users at its first sign-in (upsertFromAuth), and
 * a password sign-in needs a confirmed address. Somebody whose confirmation
 * mail never arrived therefore exists in Supabase Auth only: the account list
 * did not show them, and support could neither find them nor send the mail
 * again. They are read here, through the service role.
 *
 * Supabase hands its accounts out a page at a time, with no filter on the
 * confirmation, so the accounts are read up to a ceiling and filtered here.
 * Each page of accounts is checked against users in one query.
 */

export interface PendingSignUp {
  /** The Supabase Auth id, which becomes the profile's id at the first sign-in. */
  id: string;
  email: string;
  createdAt: Date;
  /** When the last confirmation mail left; null when none ever did. */
  confirmationSentAt: Date | null;
  /** How the account signs in, as Supabase names it ("email", "github"). */
  provider: string;
}

export interface PendingSignUpList {
  rows: PendingSignUp[];
  /** Pending sign-ups the search matches, over every page. */
  total: number;
  /** The page returned: one past the end falls back to the last. */
  page: number;
  /** True when Supabase holds more accounts than were read: some may be missing. */
  truncated: boolean;
}

/** The most accounts Supabase returns in one page. */
export const AUTH_PAGE_SIZE = 1000;
/** Pages read at most: 20 000 accounts, far past what the platform holds. */
export const AUTH_SCAN_PAGES = 20;

/** GoTrue leaves an unset date out of the user, or sends it as null: both mean none. */
function dateOrNull(value: string | null | undefined): Date | null {
  return value === undefined || value === null || value === "" ? null : new Date(value);
}

/**
 * One page of the sign-ups that never confirmed their address and have no
 * profile yet, newest first, narrowed to the addresses containing `q`.
 * Throws when Supabase cannot be read: the page says the list is unavailable.
 */
export async function listPendingSignUps(query: {
  q: string;
  page: number;
  pageSize: number;
}): Promise<PendingSignUpList> {
  const admin = createSupabaseAdminClient().auth.admin;
  const needle = query.q.trim().toLowerCase();
  const pending: PendingSignUp[] = [];
  let truncated = false;

  for (let page = 1; page <= AUTH_SCAN_PAGES; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error !== null) throw error;

    const unconfirmed = data.users.filter(
      (user): user is typeof user & { email: string } =>
        user.email !== undefined &&
        user.email !== "" &&
        dateOrNull(user.email_confirmed_at) === null &&
        user.is_anonymous !== true,
    );
    const known = await userRepository.existingIds(unconfirmed.map((user) => user.id));
    for (const user of unconfirmed) {
      if (known.has(user.id)) continue;
      if (needle !== "" && !user.email.toLowerCase().includes(needle)) continue;
      pending.push({
        id: user.id,
        email: user.email,
        createdAt: new Date(user.created_at),
        confirmationSentAt: dateOrNull(user.confirmation_sent_at),
        provider:
          typeof user.app_metadata.provider === "string" ? user.app_metadata.provider : "email",
      });
    }

    if (data.users.length < AUTH_PAGE_SIZE) break;
    if (page === AUTH_SCAN_PAGES) truncated = true;
  }

  pending.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const effective = Math.min(Math.max(1, query.page), lastPage(pending.length, query.pageSize));
  const start = (effective - 1) * query.pageSize;
  return {
    rows: pending.slice(start, start + query.pageSize),
    total: pending.length,
    page: effective,
    truncated,
  };
}
