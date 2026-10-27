import type { PlacementQuestionView } from "@/lib/onboarding/placement";

export const PLACEMENT_SAMPLE: PlacementQuestionView[] = [
  {
    id: "test-dev",
    category: "DEV",
    difficulty: "BEGINNER",
    question: "Quelle structure permet de répéter une instruction ?",
    options: [
      { id: "loop", text: "Une boucle" },
      { id: "constant", text: "Une constante" },
    ],
  },
  {
    id: "test-cyber",
    category: "CYBERSEC",
    difficulty: "INTERMEDIATE",
    question: "Que faut-il vérifier avant d’ouvrir une pièce jointe inattendue ?",
    options: [
      { id: "sender", text: "Son origine et le contexte du message" },
      { id: "name", text: "Uniquement le nom du fichier" },
    ],
  },
  {
    id: "test-network",
    category: "NETWORK",
    difficulty: "BEGINNER",
    question: "Quel service traduit un nom de domaine en adresse IP ?",
    options: [
      { id: "dns", text: "DNS" },
      { id: "dhcp", text: "DHCP" },
    ],
  },
];
