import React from "react";
import { notFound } from "next/navigation";
import { XpHeroCard } from "../(app)/dashboard/_components/xp-hero-card";
import { PathsCollection, type SerializedPath } from "../(app)/paths/_components/paths-collection";
import {
  TeacherClasses,
  type TaughtEstablishment,
} from "../(app)/my-class/_components/teacher-classes";
import { Quiz } from "../(app)/lessons/[slug]/_components/quiz";
import "../globals.css";

/**
 * The source of the screenshots in the marketing renders.
 *
 * It mounts the product's own components, with the product's own CSS, against
 * sample data, so a capture of this page is a photograph of the real interface
 * rather than a drawing of it. The marketing app used drawings first; they
 * looked right and were a lie, because a drawing stops matching the product
 * the moment somebody moves a button and nobody notices.
 *
 * Sample data rather than a real class, deliberately: a roster on a public
 * video publishes real students' names, and most of them are minors.
 *
 * Development only. It is a real route and would otherwise be a public URL, so
 * it refuses to exist in a production build. Nothing here is secret - fake
 * data and components anybody can see by signing up - but a page that exists
 * for a screenshot has no business answering requests on the live site.
 *
 * To regenerate: `pnpm --filter @cyberlearn/web dev`, then capture the three
 * `#cap-*` elements. apps/marketing/README.md has the procedure.
 */

export const dynamic = "force-dynamic";

const PATHS: SerializedPath[] = [
  {
    id: "p1",
    slug: "fondamentaux-cybersecurite",
    refCode: "CL-PTH-001",
    title: "Fondamentaux de la cybersécurité",
    description:
      "Comprendre les attaques courantes, les surfaces exposées et les réflexes qui les referment.",
    category: "CYBERSEC",
    track: "SECURITY",
    difficulty: "INTERMEDIATE",
    estimatedHours: 9,
    xpTotal: 1950,
    lessonCount: 13,
    hasCert: true,
    status: "inprog",
    progressDone: 8,
    progressTotal: 13,
    rating: null,
    nextLesson: {
      n: "09",
      title: "Sécuriser une API REST",
      slug: "securiser-une-api-rest",
      xpReward: 150,
      estimatedMinutes: 25,
    },
  },
  {
    id: "p2",
    slug: "reseaux-du-cable-au-paquet",
    refCode: "CL-PTH-002",
    title: "Réseaux : du câble au paquet",
    description: "Le modèle OSI couche par couche, et ce qui se passe vraiment sur le fil.",
    category: "NETWORK",
    track: "NETWORK",
    difficulty: "BEGINNER",
    estimatedHours: 7,
    xpTotal: 1500,
    lessonCount: 12,
    hasCert: true,
    status: "inprog",
    progressDone: 3,
    progressTotal: 12,
    rating: null,
    nextLesson: {
      n: "04",
      title: "Le routage, sans le folklore",
      slug: "le-routage",
      xpReward: 120,
      estimatedMinutes: 20,
    },
  },
  {
    id: "p3",
    slug: "developper-proprement",
    refCode: "CL-PTH-003",
    title: "Développer proprement",
    description: "Écrire du code qu'une autre personne peut reprendre six mois plus tard.",
    category: "DEV",
    track: "DEV",
    difficulty: "BEGINNER",
    estimatedHours: 8,
    xpTotal: 1700,
    lessonCount: 14,
    hasCert: false,
    status: "idle",
    progressDone: 0,
    progressTotal: 14,
    rating: null,
    nextLesson: null,
  },
  {
    id: "p4",
    slug: "cryptographie-appliquee",
    refCode: "CL-PTH-004",
    title: "Cryptographie appliquée",
    description: "Ce qu'on chiffre, ce qu'on signe, et pourquoi ce n'est pas la même chose.",
    category: "CYBERSEC",
    track: "SECURITY",
    difficulty: "ADVANCED",
    estimatedHours: 11,
    xpTotal: 2400,
    lessonCount: 15,
    hasCert: true,
    status: "done",
    progressDone: 15,
    progressTotal: 15,
    rating: null,
    nextLesson: null,
  },
];

const WORK = [
  {
    lessonId: "l1",
    slug: "securiser-une-api-rest",
    title: "Sécuriser une API REST",
    instructions: "Lis la leçon en entier avant le quiz, il porte sur la fin.",
    dueAt: "2026-09-18T22:00:00.000Z",
    dueLabel: "18 septembre",
    overdue: true,
    doneCount: 12,
    totalCount: 28,
  },
  {
    lessonId: "l2",
    slug: "modele-osi",
    title: "Le modèle OSI, couche par couche",
    instructions: null,
    dueAt: "2026-09-26T22:00:00.000Z",
    dueLabel: "26 septembre",
    overdue: false,
    doneCount: 21,
    totalCount: 28,
  },
  {
    lessonId: "l3",
    slug: "bases-du-chiffrement",
    title: "Les bases du chiffrement",
    instructions: null,
    dueAt: null,
    dueLabel: null,
    overdue: false,
    doneCount: 26,
    totalCount: 28,
  },
];

const LESSONS = [
  {
    id: "l4",
    title: "Injection SQL, de la théorie à la paramétrisation",
    category: "CYBERSEC",
    search: "injection sql",
  },
  {
    id: "l5",
    title: "TCP : la poignée de main en trois temps",
    category: "NETWORK",
    search: "tcp",
  },
];

// Invented names, deliberately: a real roster on a public video publishes real
// students' names, and most of them are minors.
const ESTABLISHMENTS: TaughtEstablishment[] = [
  {
    id: "e1",
    name: "Lycée Jean-Moulin",
    city: "Lyon",
    promotions: [
      {
        id: "pr1",
        name: "2025-2026",
        startYear: 2025,
        classes: [
          {
            id: "c1",
            name: "SIO1-A · Cybersécurité",
            students: [
              {
                id: "s5",
                name: "Lina Mercier",
                username: "lina",
                level: 3,
                completed: 4,
                activeThisWeek: false,
              },
              {
                id: "s4",
                name: "Théo Roy",
                username: "theo",
                level: 4,
                completed: 7,
                activeThisWeek: false,
              },
              {
                id: "s3",
                name: "Ines Ba",
                username: "ines",
                level: 6,
                completed: 14,
                activeThisWeek: true,
              },
              {
                id: "s2",
                name: "Sacha Martin",
                username: "sacha",
                level: 7,
                completed: 19,
                activeThisWeek: true,
              },
              {
                id: "s1",
                name: "Amélie Durand",
                username: "amelie",
                level: 9,
                completed: 26,
                activeThisWeek: true,
              },
            ],
            work: WORK,
            ownLessons: [],
            ownPaths: [],
            resources: [],
            assignmentOptions: [],
          },
        ],
      },
    ],
  },
];

function Frame({ id, children }: { id: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      id={id}
      style={{ width: 1440, padding: 40, background: "var(--bg-base, #030219)" }}
      className="page-container"
    >
      {children}
    </div>
  );
}

export default function ShotCapture(): React.JSX.Element {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div style={{ background: "#030219" }}>
      <Frame id="cap-paths">
        <div style={{ marginBottom: 28 }}>
          <XpHeroCard
            level={7}
            rankName="Argent"
            nextRank="Or"
            xpCurrent={1840}
            xpNeeded={2000}
            xpPercent={92}
            xpNeededToNext={160}
            userRank={34}
          />
        </div>
        <PathsCollection
          paths={PATHS}
          inProgCount={2}
          doneCount={1}
          totalXp={7550}
          totalHours={35}
        />
      </Frame>

      <Frame id="cap-quiz">
        <Quiz
          id="q1"
          question="Où doit voyager un jeton d'accès ?"
          options={[
            "Dans l'URL, en paramètre de requête",
            "Dans l'en-tête Authorization",
            "Dans un cookie non signé",
          ]}
          correct={1}
          questionNumber={2}
          questionCount={5}
        />
      </Frame>

      <Frame id="cap-class">
        <TeacherClasses establishments={ESTABLISHMENTS} lessons={LESSONS} />
      </Frame>
    </div>
  );
}
