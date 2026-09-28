import { userRepository } from "@cyberlearn/db";

/**
 * Whether the reader skips the path lock: administrators do, so they can open
 * any lesson of the catalogue to review it without working through its path.
 *
 * The role is read from public.users on every call, never from the access
 * token's claim, for the reason given in packages/lib/src/auth/guards.ts: a
 * role taken away mid-session must stop opening lessons at once.
 */
export async function unlocksEveryLesson(userId: string): Promise<boolean> {
  const user = await userRepository.findRoleById(userId);
  return user?.role === "ADMIN";
}
