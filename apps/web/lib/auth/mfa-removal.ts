import { canRemoveOwnTotp } from "@cyberlearn/lib/auth/mfa-factors";
import { userRepository } from "@cyberlearn/db";

/**
 * Whether this account's security panel offers to remove its second factor:
 * the site's (settings drawer) and the app's (/api/mobile/mfa-removal).
 *
 * The role is read from public.users on every call, never from the access
 * token's claim, for the reason given in packages/lib/src/auth/guards.ts. An
 * account that just became an administrator loses the control at once.
 */
export async function canDisableOwnMfa(userId: string): Promise<boolean> {
  const user = await userRepository.findRoleById(userId);
  return canRemoveOwnTotp(user?.role);
}
