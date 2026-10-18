import type { CronHealth } from "@cyberlearn/lib/cron/jobs";
import type { Crumb, Tone } from "../../_components/admin-ui";
import type { GridColumn } from "../../_components/data-grid";

/**
 * What the crons page and its loading state share: the header, the figures
 * and the columns. Written once here, so the skeleton cannot drift from the
 * page it stands in for.
 */

export const CRONS_HEADER = {
  crumbs: [{ label: "Système" }] as const satisfies readonly [Crumb],
  title: "Tâches planifiées",
  description:
    "Les tâches que Vercel lance chaque nuit, et celle que cron-job.org appelle toutes les 6 h. Chaque passage est consigné dans l'audit log sous cron.<nom> : le dernier, sa durée, ce qu'il a fait, et la dernière erreur.",
};

export const CRON_KPI_LABELS = ["En ordre", "En échec", "En retard", "Jamais vues"] as const;

export const CRON_COLUMNS: readonly GridColumn[] = [
  { label: "Tâche" },
  { label: "Planning" },
  { label: "Dernier passage" },
  { label: "Prochain passage" },
  { label: "État", align: "right" },
];

export const CRON_HEALTH_META: Record<CronHealth, { label: string; tone: Tone }> = {
  ok: { label: "En ordre", tone: "accent" },
  failed: { label: "En échec", tone: "danger" },
  late: { label: "En retard", tone: "warning" },
  never: { label: "Jamais vue", tone: "neutral" },
  unknown: { label: "Planning illisible", tone: "info" },
};
