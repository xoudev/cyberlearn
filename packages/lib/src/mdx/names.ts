/**
 * The components a lesson's MDX may name: one entry per component the lesson
 * page binds (apps/web, lesson-mdx-components.ts). Its own module, with
 * nothing behind it: the save-time check (check.ts) reads it next to the MDX
 * compiler, and the editor reads it in the browser, where the compiler and
 * the prop schemas have no business.
 */
export const LESSON_COMPONENT_NAMES = [
  "Quiz",
  "QuizGroup",
  "CodePlayground",
  "SimulatedTerminal",
  "LinuxTerminal",
  "LessonVideo",
  "LessonImage",
  "ExternalLink",
  "Callout",
  "Diagram",
  "PythonChallenge",
  "FindTheFlaw",
  "PhishingEmail",
  "SqlPlayground",
  "SqlInjectionLab",
  "GitSandbox",
  "PhotoOsint",
  "NetworkLab",
  "StepAnimation",
  "PhpLab",
  "SubnetDrill",
  "PacketDissector",
  "PutInOrder",
  "MatchPairs",
  "CryptoWorkshop",
  "FirewallLab",
  "LogHunt",
  "HexEditor",
  "IncidentStory",
  "PasswordLab",
] as const;

export type LessonComponentName = (typeof LESSON_COMPONENT_NAMES)[number];

export function isLessonComponentName(name: string): name is LessonComponentName {
  return (LESSON_COMPONENT_NAMES as readonly string[]).includes(name);
}
