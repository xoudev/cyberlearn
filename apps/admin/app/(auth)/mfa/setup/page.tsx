import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMfaSetup } from "./admin-mfa-setup";
import styles from "../../auth.module.css";

export default async function AdminMfaSetupPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (!factors.error && factors.data.totp.length > 0) redirect("/mfa");

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>{"// protection obligatoire"}</span>
        <h1 className={styles.title}>Activer le MFA</h1>
        <p className={styles.description}>
          Scanne le QR code avec une application TOTP. Aucun accès administrateur n’est possible
          sans ce facteur.
        </p>
        <AdminMfaSetup />
      </section>
    </main>
  );
}
