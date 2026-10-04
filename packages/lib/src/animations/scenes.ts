import type { AnimationSceneId } from "@cyberlearn/types";

/**
 * The scenes of <StepAnimation>: what each step shows and says, and how long
 * it lasts. The site draws them (Remotion, apps/web); the app lists the
 * steps, so a lesson reads whole on a phone. Frames are counted at the
 * scene's fps: 30 frames, one second.
 */

export interface AnimationStep {
  readonly title: string;
  /** What the learner should see happening, in French. */
  readonly text: string;
  readonly frames: number;
}

export interface AnimationScene {
  readonly id: AnimationSceneId;
  readonly title: string;
  readonly fps: number;
  readonly steps: readonly AnimationStep[];
}

export const ANIMATION_SCENES: Readonly<Record<AnimationSceneId, AnimationScene>> = {
  "tcp-handshake": {
    id: "tcp-handshake",
    title: "La poignée de main TCP",
    fps: 30,
    steps: [
      {
        title: "Avant la connexion",
        frames: 60,
        text: "Le serveur écoute sur le port 443 (LISTEN). Le client n'a encore rien envoyé : aucune connexion n'existe, et aucun octet de données ne peut circuler.",
      },
      {
        title: "SYN",
        frames: 90,
        text: "Le client demande l'ouverture : un segment SYN, avec son numéro de séquence de départ (seq=100). Il passe en SYN-SENT et attend.",
      },
      {
        title: "SYN-ACK",
        frames: 90,
        text: "Le serveur répond en un seul segment : il accuse réception (ack=101, le numéro du client plus un) et envoie sa propre demande (SYN, seq=300). Il passe en SYN-RECEIVED.",
      },
      {
        title: "ACK",
        frames: 90,
        text: "Le client confirme (ack=301). Chaque côté sait maintenant que l'autre entend et répond : la connexion est ESTABLISHED des deux côtés.",
      },
      {
        title: "Les données circulent",
        frames: 90,
        text: "Seulement maintenant, les données partent : une requête, puis sa réponse, chaque segment numéroté pour être remis dans l'ordre et réémis s'il se perd.",
      },
    ],
  },
  "symmetric-encryption": {
    id: "symmetric-encryption",
    title: "Le chiffrement symétrique",
    fps: 30,
    steps: [
      {
        title: "Le message en clair",
        frames: 60,
        text: "Alice veut écrire à Bob : « RENDEZ-VOUS 18H ». Sur le chemin, Ève écoute tout ce qui passe. Envoyé tel quel, le message se lit.",
      },
      {
        title: "Une seule clé, partagée",
        frames: 75,
        text: "Alice et Bob possèdent la même clé secrète, échangée à l'avance par un autre canal. Ève ne l'a pas. C'est tout le pari du symétrique : une clé, deux usages.",
      },
      {
        title: "Chiffrer",
        frames: 90,
        text: "Alice passe le clair dans l'algorithme avec la clé. Il en sort le chiffré : un charabia qui ne ressemble à rien, pas même aux espaces entre les mots.",
      },
      {
        title: "En transit",
        frames: 105,
        text: "Le chiffré traverse le réseau. Ève le capte en entier, mais sans la clé elle n'en tire rien : essayer toutes les clés d'AES prendrait plus que l'âge de l'univers.",
      },
      {
        title: "Déchiffrer",
        frames: 90,
        text: "Bob applique la même clé dans l'autre sens, et le clair réapparaît, intact. Une seule clé, qui ferme et qui ouvre : c'est la serrure du symétrique.",
      },
    ],
  },
  "call-stack": {
    id: "call-stack",
    title: "La pile d'appels",
    fps: 30,
    steps: [
      {
        title: "Le programme démarre",
        frames: 60,
        text: "Python lit le fichier de haut en bas. Les deux def enseignent des fonctions sans rien exécuter. La dernière ligne appelle somme_carres(3, 4) : c'est là que tout commence.",
      },
      {
        title: "somme_carres entre dans la pile",
        frames: 75,
        text: "Un appel empile un cadre : un espace à lui, avec ses paramètres a=3 et b=4. La ligne qui a appelé attend son résultat.",
      },
      {
        title: "carre(3) s'empile par-dessus",
        frames: 75,
        text: "Pour calculer carre(a) + carre(b), Python appelle d'abord carre(3). Nouveau cadre, n=3, au-dessus du précédent : somme_carres est en pause.",
      },
      {
        title: "carre(3) renvoie 9",
        frames: 75,
        text: "return 9 : le cadre de carre disparaît, sa variable n avec lui, et le 9 redescend à l'appelant, qui le garde en attendant l'autre moitié.",
      },
      {
        title: "carre(4) renvoie 16",
        frames: 75,
        text: "Même chose pour carre(4) : un cadre, n=4, puis return 16 et le cadre s'en va. Chaque appel a eu son propre n, sans se mélanger avec l'autre.",
      },
      {
        title: "somme_carres renvoie 25",
        frames: 90,
        text: "9 + 16 = 25 : return 25, le cadre de somme_carres disparaît à son tour, et resultat reçoit 25. La pile est vide : a, b et n n'existent plus.",
      },
    ],
  },
};

export function sceneById(id: string): AnimationScene | undefined {
  return Object.values(ANIMATION_SCENES).find((s) => s.id === id);
}

export function totalFrames(scene: AnimationScene): number {
  return scene.steps.reduce((sum, step) => sum + step.frames, 0);
}

/** The first frame of a step, and the first frame after it. */
export function stepBounds(scene: AnimationScene, index: number): { from: number; to: number } {
  let from = 0;
  for (let i = 0; i < index; i++) from += scene.steps[i]?.frames ?? 0;
  return { from, to: from + (scene.steps[index]?.frames ?? 0) };
}

/** The step a frame belongs to. */
export function stepAt(scene: AnimationScene, frame: number): number {
  let at = 0;
  for (let i = 0; i < scene.steps.length; i++) {
    if (frame >= stepBounds(scene, i).from) at = i;
  }
  return at;
}
