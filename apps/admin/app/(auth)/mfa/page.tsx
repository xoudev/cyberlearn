import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMfaChallenge } from "./admin-mfa-challenge";
import styles from "../auth.module.css";

export default async function AdminMfaPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error || factors.data.totp.length === 0) redirect("/mfa/setup");
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!assurance.error && assurance.data.currentLevel === "aal2") redirect("/dashboard");

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>{"// second facteur"}</span>
        <h1 className={styles.title}>Code MFA</h1>
        <p className={styles.description}>
          Entre le code à six chiffres de ton application d’authentification.
        </p>
        <AdminMfaChallenge />
      </section>
    </main>
  );
}
