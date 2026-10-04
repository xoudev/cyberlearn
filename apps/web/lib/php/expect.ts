import type { PhpExpect } from "@cyberlearn/types";
import { describeFinding, type ExecutableFinding, findExecutableContent } from "./executable";

/** What a PHP page answered: as the worker sends it. */
export interface PhpResponse {
  status: number;
  /** As headers_list() gives them: "Location: /x". */
  headers: string[];
  body: string;
  /** PHP died before it could answer (out of memory, fatal error). */
  fatal: boolean;
}

/** A header of the response, by name whatever its case. */
export function headerValue(response: PhpResponse, name: string): string | null {
  const wanted = name.toLowerCase();
  for (const line of response.headers) {
    const colon = line.indexOf(":");
    if (colon > 0 && line.slice(0, colon).trim().toLowerCase() === wanted) {
      return line.slice(colon + 1).trim();
    }
  }
  return null;
}

/** PHP sends text/html unless the page says otherwise. */
export function isHtml(response: PhpResponse): boolean {
  const type = headerValue(response, "content-type");
  return type === null || /html/iu.test(type);
}

/** What a browser would run in the answer: nothing, if the page did not say it was HTML. */
export function executableIn(response: PhpResponse): ExecutableFinding[] {
  return isHtml(response) ? findExecutableContent(response.body) : [];
}

function wantedStatuses(status: number | number[]): number[] {
  return Array.isArray(status) ? status : [status];
}

/** Whether a response is what an exercise expects, and if not, what is off. */
export function checkExpectation(
  expectation: PhpExpect,
  response: PhpResponse,
): { ok: true } | { ok: false; reason: string } {
  if (expectation.status !== undefined) {
    const wanted = wantedStatuses(expectation.status);
    if (!wanted.includes(response.status)) {
      return {
        ok: false,
        reason: `Statut ${String(response.status)} au lieu de ${wanted.map(String).join(" ou ")}.`,
      };
    }
  }
  if (expectation.contains !== undefined && !response.body.includes(expectation.contains)) {
    return { ok: false, reason: `La page ne contient pas « ${expectation.contains} ».` };
  }
  if (expectation.notContains !== undefined && response.body.includes(expectation.notContains)) {
    return { ok: false, reason: `La page contient encore « ${expectation.notContains} ».` };
  }
  if (expectation.executable !== undefined) {
    const found = executableIn(response);
    if (expectation.executable && found.length === 0) {
      return { ok: false, reason: "La page ne contient aucun code exécutable." };
    }
    if (!expectation.executable && found.length > 0) {
      return {
        ok: false,
        reason: `La page contient encore du code exécutable : ${found.map(describeFinding).join(", ")}.`,
      };
    }
  }
  return { ok: true };
}
