import { CodeBlock } from "./code-block";
import { Quiz } from "./quiz";
import { CodePlayground } from "./code-playground";
import { SimulatedTerminal } from "./simulated-terminal";
import { LinuxTerminal } from "./linux-terminal";
import { LessonVideo } from "./lesson-video";
import { LessonImage } from "./lesson-image";
import { ExternalLink } from "./external-link";
import { Callout } from "./callout";
import { Diagram } from "./diagram";
import { QuizGroup } from "./quiz-group";
import { PythonChallenge } from "./python-challenge";
import { FindTheFlaw } from "./find-the-flaw";
import { PhishingEmail } from "./phishing-email";
import { SqlInjectionLab } from "./sql-injection-lab";
import { SqlPlayground } from "./sql-playground";
import { GitSandbox } from "./git-sandbox";
import { PhotoOsint } from "./photo-osint";
import { NetworkLab } from "./network-lab";
import { StepAnimation } from "./step-animation";
import { PhpLab } from "./php-lab";
import { SubnetDrill } from "./subnet-drill";
import { PacketDissector } from "./packet-dissector";
import { PutInOrder } from "./put-in-order";
import { MatchPairs } from "./match-pairs";
import { CryptoWorkshop } from "./crypto-workshop";
import { FirewallLab } from "./firewall-lab";
import { LogHunt } from "./log-hunt";
import { HexEditor } from "./hex-editor";
import { IncidentStory } from "./incident-story";

/**
 * What a lesson's MDX may name, bound to what draws it. One entry per name in
 * LESSON_COMPONENT_NAMES (@cyberlearn/lib/mdx-check), plus `pre` for fenced
 * code. Its own module because two pages render lessons with it: the lesson
 * page, and the editor's preview (app/preview), which has to draw a draft
 * exactly as the lesson page would, or it is not a preview.
 */
export const LESSON_MDX_COMPONENTS = {
  pre: CodeBlock,
  Quiz,
  CodePlayground,
  SimulatedTerminal,
  LinuxTerminal,
  LessonVideo,
  LessonImage,
  ExternalLink,
  Callout,
  Diagram,
  QuizGroup,
  PythonChallenge,
  FindTheFlaw,
  PhishingEmail,
  SqlPlayground,
  SqlInjectionLab,
  GitSandbox,
  PhotoOsint,
  NetworkLab,
  StepAnimation,
  PhpLab,
  SubnetDrill,
  PacketDissector,
  PutInOrder,
  MatchPairs,
  CryptoWorkshop,
  FirewallLab,
  LogHunt,
  HexEditor,
  IncidentStory,
};
