import { createElement, type ComponentProps, type ComponentType, type ReactElement } from "react";
import type { LessonComponentName } from "@cyberlearn/lib/mdx-check";
import { type LessonComponentWidth, lessonComponentWidth } from "@cyberlearn/lib/mdx-components";
import { CodeBlock } from "./code-block";
import type { Quiz } from "./quiz";
import { QuizBlock } from "./quiz-block";
import { CodePlayground } from "./code-playground";
import { SimulatedTerminal } from "./simulated-terminal";
import { LinuxTerminal } from "./linux-terminal";
import { TwoMachineLab } from "./two-machine-lab";
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
import { JwtLab } from "./jwt-lab";
import { PasswordLab } from "./password-lab";
import { lessonBlockAttributes } from "./lesson-block";

/** How a component's props change its block, for the few whose variants do. */
interface BlockOptions<P> {
  /**
   * The props with which the component flows in a sentence or beside one, an
   * inline link or a floated image: those stay bare, since a block there would
   * break the paragraph (a <div> cannot sit in a <p>) or contain the float.
   */
  inline?: (props: P) => boolean;
  /**
   * The block's width for these props, where a variant asks for another than
   * the type's: a full-bleed image is drawn wider than the measure it would
   * otherwise sit in.
   */
  width?: (props: P) => LessonComponentWidth | undefined;
}

/**
 * A component in its block (lesson-block.ts): a size container, as wide as
 * the registry says (`width` in @cyberlearn/lib/mdx-components), or as its
 * props say where `options` tells how (see BlockOptions).
 *
 * A plain function, run on the server: what it returns is what the page gets.
 * That is why the Quiz has a block of its own making (quiz-block.tsx).
 */
function inLessonBlock<P extends object>(
  name: LessonComponentName,
  Component: ComponentType<P>,
  options: BlockOptions<P> = {},
): (props: P) => ReactElement {
  const registered = lessonComponentWidth(name);
  function LessonBlock(props: P): ReactElement {
    const element = createElement(Component, props);
    if (options.inline?.(props) === true) return element;
    const width = options.width?.(props) ?? registered;
    return createElement("div", lessonBlockAttributes(name, width), element);
  }
  LessonBlock.displayName = `LessonBlock(${name})`;
  return LessonBlock;
}

const QUIZ_WIDTH = lessonComponentWidth("Quiz");

function QuizInBlock(props: ComponentProps<typeof Quiz>): ReactElement {
  return createElement(QuizBlock, { ...props, blockWidth: QUIZ_WIDTH });
}

/**
 * What a lesson's MDX may name, bound to what draws it. One entry per name in
 * LESSON_COMPONENT_NAMES (@cyberlearn/lib/mdx-check), plus `pre` for fenced
 * code. Its own module because two pages render lessons with it: the lesson
 * page, and the editor's preview (app/preview), which has to draw a draft
 * exactly as the lesson page would, or it is not a preview.
 *
 * Each component comes in its block; `pre`, part of the prose, does not.
 */
export const LESSON_MDX_COMPONENTS = {
  pre: CodeBlock,
  Quiz: QuizInBlock,
  CodePlayground: inLessonBlock("CodePlayground", CodePlayground),
  SimulatedTerminal: inLessonBlock("SimulatedTerminal", SimulatedTerminal),
  LinuxTerminal: inLessonBlock("LinuxTerminal", LinuxTerminal),
  TwoMachineLab: inLessonBlock("TwoMachineLab", TwoMachineLab),
  LessonVideo: inLessonBlock("LessonVideo", LessonVideo),
  LessonImage: inLessonBlock("LessonImage", LessonImage, {
    inline: (props) => props.variant === "inline",
    // "full" bleeds past the margins (LESSON_AUTHORING_GUIDE.md, 5.6): in the
    // prose's measure it would be no wider than a default image.
    width: (props) => (props.variant === "full" ? "wide" : undefined),
  }),
  ExternalLink: inLessonBlock("ExternalLink", ExternalLink, {
    inline: (props) => props.variant === "link",
  }),
  Callout: inLessonBlock("Callout", Callout),
  Diagram: inLessonBlock("Diagram", Diagram),
  QuizGroup: inLessonBlock("QuizGroup", QuizGroup),
  PythonChallenge: inLessonBlock("PythonChallenge", PythonChallenge),
  FindTheFlaw: inLessonBlock("FindTheFlaw", FindTheFlaw),
  PhishingEmail: inLessonBlock("PhishingEmail", PhishingEmail),
  SqlPlayground: inLessonBlock("SqlPlayground", SqlPlayground),
  SqlInjectionLab: inLessonBlock("SqlInjectionLab", SqlInjectionLab),
  GitSandbox: inLessonBlock("GitSandbox", GitSandbox),
  PhotoOsint: inLessonBlock("PhotoOsint", PhotoOsint),
  NetworkLab: inLessonBlock("NetworkLab", NetworkLab),
  StepAnimation: inLessonBlock("StepAnimation", StepAnimation),
  PhpLab: inLessonBlock("PhpLab", PhpLab),
  SubnetDrill: inLessonBlock("SubnetDrill", SubnetDrill),
  PacketDissector: inLessonBlock("PacketDissector", PacketDissector),
  PutInOrder: inLessonBlock("PutInOrder", PutInOrder),
  MatchPairs: inLessonBlock("MatchPairs", MatchPairs),
  CryptoWorkshop: inLessonBlock("CryptoWorkshop", CryptoWorkshop),
  FirewallLab: inLessonBlock("FirewallLab", FirewallLab),
  LogHunt: inLessonBlock("LogHunt", LogHunt),
  HexEditor: inLessonBlock("HexEditor", HexEditor),
  IncidentStory: inLessonBlock("IncidentStory", IncidentStory),
  JwtLab: inLessonBlock("JwtLab", JwtLab),
  PasswordLab: inLessonBlock("PasswordLab", PasswordLab),
};
