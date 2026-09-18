import { UI, type Tone } from "../_components/admin-ui";

export const THEME_META: Record<string, { label: string; tone: Tone }> = {
  BUG: { label: "Bug", tone: "danger" },
  QUESTION: { label: "Question", tone: "info" },
  FEATURE_REQUEST: { label: "Feature request", tone: "purple" },
  SECURITY: { label: "Sécurité", tone: "danger" },
  CONTENT_ERROR: { label: "Erreur de contenu", tone: "warning" },
  ESTABLISHMENT_REQUEST: { label: "Demande d'ajout d'établissement", tone: "info" },
  BAN_APPEAL: { label: "Appel d'un bannissement", tone: "danger" },
  OTHER: { label: "Autre", tone: "neutral" },
};

export const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: UI.danger },
  IN_PROGRESS: { label: "En cours", color: UI.warning },
  RESOLVED: { label: "Résolu", color: UI.turquoise },
  CLOSED: { label: "Fermé", color: UI.faint },
};
