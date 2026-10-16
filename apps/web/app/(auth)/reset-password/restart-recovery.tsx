import Link from "next/link";
import { restartPasswordRecovery } from "../_actions/password-auth";
import styles from "../_components/auth-shell.module.css";

/**
 * The way out of a recovery window that has closed: sign out, then ask for a
 * new link on /forgot-password. A form of its own, beside the reset form
 * rather than inside it: forms do not nest.
 *
 * Somebody who opened /reset-password while signed in normally, and still
 * knows their password, changes it from the settings instead.
 */
export function RestartRecovery({ message }: { message: string }): React.JSX.Element {
  return (
    <div className={styles.form}>
      <p className={[styles.message, styles.warning].join(" ")} role="alert">
        {message}
      </p>
      <form className={styles.form} action={restartPasswordRecovery}>
        <button className={styles.submit} type="submit">
          Demander un nouveau lien
        </button>
      </form>
      <Link className={styles.link} href="/settings/account">
        Tu connais ton mot de passe actuel ? Change-le depuis tes réglages
      </Link>
    </div>
  );
}
