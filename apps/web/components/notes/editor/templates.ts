/**
 * Ready-made skeletons the editor's "Modèle" menu inserts at the cursor: the
 * kinds of notes the three domains call for. Plain markdown, French content.
 */
export interface NoteTemplate {
  id: string;
  label: string;
  description: string;
  body: string;
}

export const NOTE_TEMPLATES: readonly NoteTemplate[] = [
  {
    id: "revision",
    label: "Fiche de révision",
    description: "L'essentiel, les pièges, des cartes",
    body: [
      "## L'essentiel",
      "",
      "- ",
      "",
      "> [!attention] Pièges",
      "> ",
      "",
      "## Cartes",
      "",
      "Question ? :: Réponse",
    ].join("\n"),
  },
  {
    id: "writeup",
    label: "Write-up de CTF",
    description: "Reconnaissance, exploitation, flag",
    body: [
      "## Contexte",
      "",
      "- Cible : ",
      "- Catégorie : ",
      "",
      "## Reconnaissance",
      "",
      "```bash",
      "nmap -sV ",
      "```",
      "",
      "## Exploitation",
      "",
      "1. ",
      "",
      "## Flag",
      "",
      "`FLAG{...}`",
      "",
      "> [!astuce] Ce que je retiens",
      "> ",
    ].join("\n"),
  },
  {
    id: "cheatsheet",
    label: "Aide-mémoire",
    description: "Commandes et options en tableau",
    body: [
      "## Commandes",
      "",
      "| Commande | Effet |",
      "| --- | --- |",
      "| `` | |",
      "",
      "## Exemples",
      "",
      "```bash",
      "",
      "```",
    ].join("\n"),
  },
  {
    id: "lab",
    label: "Compte rendu de lab",
    description: "Objectif, étapes, résultat",
    body: [
      "## Objectif",
      "",
      "",
      "## Étapes",
      "",
      "- [ ] ",
      "",
      "## Résultat",
      "",
      "",
      "## Questions ouvertes",
      "",
      "- ",
    ].join("\n"),
  },
];
