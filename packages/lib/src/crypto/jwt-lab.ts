import type { JwtClaims, JwtLevel } from "@cyberlearn/types";
import { JWT_ATTACK_LEVELS } from "@cyberlearn/types";
import { fromHex, toHex, utf8Encode } from "./bytes";
import {
  base64UrlDecode,
  decodePart,
  ecPublicKeyPem,
  joinToken,
  readClaims,
  readHeader,
  readJsonObject,
  type RsaPublicKey,
  rsaPublicKeyPem,
  signToken,
  signingInput,
  splitToken,
  verifyEs256,
  verifyHs256,
  verifyRs256,
} from "./jwt";
import { sha256 } from "./sha256";

/**
 * <JwtLab>: the sandbox's services, with the flaw each one is set up with and
 * the correction of each, the tokens they hand out, and what each says of the
 * token it is sent. The keys, the secrets and the tokens are the platform's,
 * made for this lab and used nowhere else; the lab never sends anything
 * anywhere. The words the lab says live here too, so that the site and the
 * app say them alike.
 */

// ── the sandbox ──────────────────────────────────────────────────────────────

/** The sandbox clock: 1 January 2026, 00:10 UTC. Fixed, so that a token is never "expired" for the wrong reason. */
export const SANDBOX_NOW = 1_767_226_200;
export const SANDBOX_CLOCK = "1er janvier 2026, 00 h 10 UTC";
const ISSUER = "cyberlearn-sandbox";
const AUDIENCE = "sandbox-api";

/** What alice's tokens say: user, valid for an hour. Compact JSON, so that the bytes are the same everywhere. */
const CLAIMS_TEXT = `{"sub":"alice","role":"user","iss":"${ISSUER}","aud":"${AUDIENCE}","iat":1767225600,"exp":1767229200}`;
const ADMIN_CLAIMS_TEXT = CLAIMS_TEXT.replace('"role":"user"', '"role":"admin"');
const HEADER_TEXT = {
  HS256: '{"alg":"HS256","typ":"JWT"}',
  RS256: '{"alg":"RS256","typ":"JWT"}',
  ES256: '{"alg":"ES256","typ":"JWT"}',
} as const;

/** The lifetime of alice's tokens, in seconds: the answer of the first step. */
export const LIFETIME_SECONDS = 3600;

/**
 * Service B's secret: a word somebody chose by hand. It is in the dictionary
 * below, which is the point.
 */
export const WEAK_SECRET = "soleil";

/** The dictionary of the attack on service B: forty of the secrets people choose. */
export const WORDLIST: readonly string[] = [
  "123456",
  "password",
  "azerty",
  "qwerty",
  "admin",
  "secret",
  "changeme",
  "letmein",
  "motdepasse",
  "bonjour",
  "dragon",
  "football",
  "monkey",
  "master",
  "login",
  "welcome",
  "abc123",
  "iloveyou",
  "trustno1",
  "supersecret",
  "jwtsecret",
  "default",
  "test",
  "token",
  "passw0rd",
  "123456789",
  "soleil",
  "111111",
  "azerty123",
  "marseille",
  "doudou",
  "chocolat",
  "princesse",
  "camille",
  "cyberlearn",
  "mykey",
  "hs256",
  "secretkey",
  "motdepasse1",
  "jesuisadmin",
];

/**
 * The public keys of service C, and the signature of the token each signed.
 * The private keys were made once, used to sign these two tokens, and thrown
 * away: nothing in this repository can sign for service C, which is exactly
 * what the lesson says of a public key.
 */
const RSA_MODULUS_HEX =
  "e7a871d3bd3ed8c22de01dc4e30ed2808c8c1984fe9851744f011d914c1f973019c595f837444930cd6009f3ed20273d041e13c5e00e859607ce708dbf821d25a275ad183c1a234def47b9e965918955e1298eb1e6d822d809f1103c63e8e046384b95f3ff8bda61ae54b18b96a5487f00d15f93d04a59c365d50648359d94059c4b19b93a33a1fdf49f267c02e5e593ca6807d26584e431d5f01005e1928e9f919470bcadcf455192e2a244ec782d66ec89e6e09fd34c78b4438c920f611e5ad154fdf9f5cea5cc1d96349d7d6b4d0e67a7eb5f4c30e9eb287b76a10650353cbd306d48760934b3f27261b28a45acbfb2edfa21cd09b2db04e5454c34f3fd29";
const RSA_SIGNATURE =
  "A80eKsoo5pLIjv9MAZ22-knT381CQkswYo9yrjBR5qw8S3wjyuK0m9i5YITqu-BRZEEK-e9bZaxteSTbvHgapbpvNtVmY2TjGi_wMo0CfNM0-TsDbdEkyR0UBDgThHeSD-NdYttTrsPl2ea5gXx8GF0JTiVN_tOr67SRo_hxjlWaI80u7gzIXSmEBC9Z4tdi2GWGKVdadyBFh7qL4U5B_3EyZMIttAhwBGpFlMqRZPbt5ENbCpZE_wt1kIk3pj8Deqrv-sbN2OTEy4c9CJE9pzECUglz0AUYDhLwAFUSiUWMamWU-8TfcMKHfN9ZbqKPbjtmbxTYPhnO8v6hxZ8vNQ";
const EC_POINT_HEX =
  "046df465b2990997ab663370084304f9196a532bbb0fdd6d437ddb1773e86a5c9890b6ba1d86898d01732bb82cfbe4512a3f7d07695dd9ec3499743420c8e3f24c";
const EC_SIGNATURE =
  "Y_eptVJHUQmLARTbjbP_AJlO2uS6eBVu1kWQ5tYahld_nGSB8Yqwh8_gB-oWkoW2nBBA15Q6gIu0wvONfSeMnQ";

const RSA_KEY: RsaPublicKey = { modulus: fromHex(RSA_MODULUS_HEX) ?? [], exponent: 65537 };
const EC_POINT: number[] = fromHex(EC_POINT_HEX) ?? [];

/** A secret that is not in any dictionary: the digest of a phrase of the platform's, which no word list holds. */
function strongSecret(label: string): number[] {
  return sha256(utf8Encode(`cyberlearn-sandbox/${label}`));
}

// ── the services ─────────────────────────────────────────────────────────────

/** Service A trusts the header, B has a weak secret, C is confused about its algorithm (RSA key, then EC key). */
export type ServiceId = "trusting" | "weak" | "rsa" | "ec";
export type Mode = "vulnerable" | "patched";
export type KeyFamily = "rsa" | "ec";

export const SERVICE_NAMES: Record<ServiceId, string> = {
  trusting: "Service A",
  weak: "Service B",
  rsa: "Service C (clé RSA)",
  ec: "Service C (clé EC)",
};

/** The attack steps of the lab, and the services each one is played against. */
export const LEVEL_SERVICES = {
  none: ["trusting"],
  "weak-secret": ["weak"],
  confusion: ["rsa", "ec"],
} as const satisfies Record<(typeof JWT_ATTACK_LEVELS)[number], readonly ServiceId[]>;

export type AttackLevel = keyof typeof LEVEL_SERVICES;

export function isAttackLevel(level: JwtLevel): level is AttackLevel {
  return (JWT_ATTACK_LEVELS as readonly string[]).includes(level);
}

/** The public key of service C, as the PEM file it publishes. */
export function publicKeyPem(family: KeyFamily): string {
  return family === "rsa" ? rsaPublicKeyPem(RSA_KEY) : ecPublicKeyPem(EC_POINT);
}

/** What to show of a public key: a title, a few lines, and the PEM. */
export function publicKeyFacts(family: KeyFamily): {
  title: string;
  lines: readonly string[];
  pem: string;
} {
  const hex = (bytes: readonly number[]): string => toHex(bytes).replace(/ /gu, "");
  if (family === "rsa") {
    const modulus = hex(RSA_KEY.modulus);
    return {
      title: "Clé publique RSA, 2048 bits (RS256)",
      lines: [
        `Exposant public : ${String(RSA_KEY.exponent)}`,
        `Module : ${modulus.slice(0, 24)}… (${String(RSA_KEY.modulus.length)} octets)`,
        "Signature : 256 octets",
      ],
      pem: publicKeyPem("rsa"),
    };
  }
  return {
    title: "Clé publique EC, courbe P-256 (ES256)",
    lines: [
      `x : ${hex(EC_POINT.slice(1, 33)).slice(0, 24)}… (32 octets)`,
      `y : ${hex(EC_POINT.slice(33)).slice(0, 24)}… (32 octets)`,
      "Signature : 64 octets",
    ],
    pem: publicKeyPem("ec"),
  };
}

// ── the tokens ───────────────────────────────────────────────────────────────

/**
 * The token a service hands alice: user, valid for an hour. Once corrected,
 * service B signs with its new secret, so the token it hands out changes.
 */
export function receivedToken(service: ServiceId, mode: Mode = "vulnerable"): string {
  switch (service) {
    case "trusting":
      return signToken(HEADER_TEXT.HS256, CLAIMS_TEXT, strongSecret("service-a"));
    case "weak":
      return signToken(
        HEADER_TEXT.HS256,
        CLAIMS_TEXT,
        mode === "vulnerable" ? utf8Encode(WEAK_SECRET) : strongSecret("service-b"),
      );
    case "rsa":
      return joinToken(HEADER_TEXT.RS256, CLAIMS_TEXT, RSA_SIGNATURE);
    case "ec":
      return joinToken(HEADER_TEXT.ES256, CLAIMS_TEXT, EC_SIGNATURE);
  }
}

/** The way out the lesson has in mind for each service: the token whose forging each step teaches. */
export function canonicalAttack(service: ServiceId): string {
  switch (service) {
    case "trusting":
      return joinToken('{"alg":"none","typ":"JWT"}', ADMIN_CLAIMS_TEXT, "");
    case "weak":
      return signToken(HEADER_TEXT.HS256, ADMIN_CLAIMS_TEXT, utf8Encode(WEAK_SECRET));
    case "rsa":
    case "ec":
      return signToken(HEADER_TEXT.HS256, ADMIN_CLAIMS_TEXT, utf8Encode(publicKeyPem(service)));
  }
}

export interface PartView {
  readonly label: string;
  readonly encoded: string;
  /** What the part says once decoded: JSON text, or the bytes of the signature. */
  readonly decoded: string;
}

/** A token taken apart for the first step: each part as written and as decoded. */
export function viewToken(token: string): readonly [PartView, PartView, PartView] | null {
  const parts = splitToken(token);
  if (parts === null) return null;
  const pretty = (part: string): string => {
    const text = decodePart(part);
    if (text === null) return "(pas du base64url)";
    const object = readJsonObject(text);
    return object.ok ? JSON.stringify(object.value, null, 2) : text;
  };
  const bytes = base64UrlDecode(parts.signature) ?? [];
  const preview = toHex(bytes.slice(0, 12));
  return [
    { label: "En-tête", encoded: parts.header, decoded: pretty(parts.header) },
    { label: "Charge utile", encoded: parts.payload, decoded: pretty(parts.payload) },
    {
      label: "Signature",
      encoded: parts.signature,
      decoded:
        bytes.length === 0
          ? "(vide)"
          : `${String(bytes.length)} octets : ${preview}${bytes.length > 12 ? " …" : ""}`,
    },
  ];
}

/** Whether the learner's answer is "an hour": 3600, 1 h, une heure, 60 minutes. */
export function isLifetimeAnswer(text: string): boolean {
  const match = /^(\d+|une?)\s*(secondes?|sec|s|minutes?|min|heures?|h)?$/u.exec(
    text
      .trim()
      .toLowerCase()
      .replace(/[.!]+$/u, ""),
  );
  if (match === null) return false;
  const count = match[1] === "un" || match[1] === "une" ? 1 : Number(match[1]);
  const unit = match[2] ?? "s";
  const factor = unit.startsWith("h") ? 3600 : unit.startsWith("m") ? 60 : 1;
  return count * factor === LIFETIME_SECONDS;
}

// ── what the learner builds ──────────────────────────────────────────────────

export type SignatureKind = "keep" | "none" | "hmac";

/** The learner's token under construction: the two texts, and how it is signed. */
export interface Draft {
  readonly header: string;
  readonly payload: string;
  readonly signature: SignatureKind;
  /** The HMAC secret, as typed, when the signature is "hmac". */
  readonly secret: string;
}

/** The draft of a service: the token it handed out, taken apart, signature kept. */
export function startDraft(service: ServiceId): Draft {
  const parts = splitToken(receivedToken(service));
  return {
    header: decodePart(parts?.header ?? "") ?? "",
    payload: decodePart(parts?.payload ?? "") ?? "",
    signature: "keep",
    secret: "",
  };
}

/** The token a draft makes. Left as it was, it is the token the service handed out. */
export function draftToken(service: ServiceId, draft: Draft): string {
  switch (draft.signature) {
    case "keep":
      return joinToken(
        draft.header,
        draft.payload,
        splitToken(receivedToken(service))?.signature ?? "",
      );
    case "none":
      return joinToken(draft.header, draft.payload, "");
    case "hmac":
      return signToken(draft.header, draft.payload, utf8Encode(draft.secret));
  }
}

/** What is wrong with a text that should be a JSON object, or null. */
export function jsonProblem(text: string): string | null {
  const read = readJsonObject(text);
  return read.ok ? null : read.problem;
}

// ── the verifiers ────────────────────────────────────────────────────────────

export type RefusalReason =
  | "malformed"
  | "unknown-algorithm"
  | "not-allowed"
  | "bad-signature"
  | "bad-claims";

export interface VerdictStep {
  readonly tone: "ok" | "bad" | "info";
  readonly text: string;
}

export interface Verdict {
  readonly accepted: boolean;
  /** What the service takes the token to say, when it accepts. */
  readonly claims: JwtClaims | null;
  readonly reason: RefusalReason | null;
  /** What the service did, line by line. */
  readonly steps: readonly VerdictStep[];
}

type Alg = "HS256" | "RS256" | "ES256";

function isAlg(value: string): value is Alg {
  return value === "HS256" || value === "RS256" || value === "ES256";
}

type Key =
  | { kind: "hmac"; secret: number[] }
  | { kind: "rsa"; key: RsaPublicKey }
  | { kind: "ec"; point: number[] };

interface Policy {
  /** The algorithms the service accepts; null when it accepts whichever the token announces. */
  readonly allowed: readonly Alg[] | null;
  /** Whether `alg: none` is taken to mean "nothing to verify". */
  readonly trustNone: boolean;
  /** Whether expiry, issuer and audience are checked. */
  readonly checkClaims: boolean;
}

function policyOf(service: ServiceId, mode: Mode): Policy {
  if (mode === "patched") {
    const allowed: readonly Alg[] =
      service === "rsa" ? ["RS256"] : service === "ec" ? ["ES256"] : ["HS256"];
    return { allowed, trustNone: false, checkClaims: true };
  }
  switch (service) {
    case "trusting":
      return { allowed: null, trustNone: true, checkClaims: false };
    case "weak":
      return { allowed: ["HS256"], trustNone: false, checkClaims: false };
    case "rsa":
    case "ec":
      return { allowed: null, trustNone: false, checkClaims: false };
  }
}

/** The key a service holds for an algorithm, or null when it holds none. */
function keyFor(service: ServiceId, mode: Mode, alg: Alg): Key | null {
  switch (service) {
    case "trusting":
      return alg === "HS256" ? { kind: "hmac", secret: strongSecret("service-a") } : null;
    case "weak":
      return alg === "HS256"
        ? {
            kind: "hmac",
            secret: mode === "vulnerable" ? utf8Encode(WEAK_SECRET) : strongSecret("service-b"),
          }
        : null;
    case "rsa":
    case "ec":
      if (alg === "RS256" && service === "rsa") return { kind: "rsa", key: RSA_KEY };
      if (alg === "ES256" && service === "ec") return { kind: "ec", point: EC_POINT };
      // The flaw: asked for HS256, the library takes the key it was given for a secret.
      if (alg === "HS256" && mode === "vulnerable") {
        return { kind: "hmac", secret: utf8Encode(publicKeyPem(service)) };
      }
      return null;
  }
}

const NOT_BASE64 = { ok: false, problem: "Ce n'est pas du base64url." } as const;

/** What the service says of a token it is sent: accepted or refused, and why, step by step. */
export function verifyAt(service: ServiceId, mode: Mode, token: string): Verdict {
  const steps: VerdictStep[] = [];
  const say = (tone: VerdictStep["tone"], text: string): void => {
    steps.push({ tone, text });
  };
  const refuse = (reason: RefusalReason, text: string): Verdict => {
    say("bad", text);
    return { accepted: false, claims: null, reason, steps };
  };
  const policy = policyOf(service, mode);

  const parts = splitToken(token);
  if (parts === null) {
    return refuse(
      "malformed",
      "Un jeton a trois parties séparées par des points : celui-ci non, le service le refuse.",
    );
  }
  const headerText = decodePart(parts.header);
  const header = headerText === null ? NOT_BASE64 : readHeader(headerText);
  if (!header.ok) return refuse("malformed", `L'en-tête est illisible : ${header.problem}`);
  const alg = header.value.alg;
  say("info", `Le service lit l'en-tête : alg = « ${alg} ».`);

  let signatureChecked = false;
  if (alg.toLowerCase() === "none") {
    if (!policy.trustNone) {
      return refuse(
        "not-allowed",
        "alg = none : un jeton sans signature n'est pas accepté, le service le refuse.",
      );
    }
    say(
      "bad",
      "alg = none : le service en conclut qu'il n'y a pas de signature à vérifier, et passe à la suite sans rien comparer. C'est le défaut.",
    );
  } else {
    if (!isAlg(alg)) {
      return refuse("unknown-algorithm", `Le service ne connaît pas l'algorithme « ${alg} ».`);
    }
    if (policy.allowed === null) {
      say(
        "bad",
        `Le service accepte l'algorithme que le jeton annonce, ${alg}, et prend sa propre clé pour le vérifier. C'est le défaut.`,
      );
    } else if (policy.allowed.includes(alg)) {
      say("ok", `${alg} est dans la liste blanche du service (${policy.allowed.join(", ")}).`);
    } else {
      return refuse(
        "not-allowed",
        `${alg} n'est pas dans la liste blanche du service (${policy.allowed.join(", ")}) : le jeton est refusé sans même regarder sa signature.`,
      );
    }
    const key = keyFor(service, mode, alg);
    if (key === null) {
      return refuse("unknown-algorithm", `Le service n'a pas de clé pour vérifier du ${alg}.`);
    }
    const input = signingInput(parts);
    let valid: boolean;
    switch (key.kind) {
      case "hmac":
        valid = verifyHs256(input, parts.signature, key.secret);
        say(
          valid ? "ok" : "bad",
          valid
            ? alg === "HS256" && policy.allowed === null && (service === "rsa" || service === "ec")
              ? "Signature HMAC recalculée avec la clé du service, le fichier de la clé publique pris pour un secret : elle correspond."
              : "Signature HMAC recalculée avec le secret du service : elle correspond."
            : "Signature HMAC recalculée avec le secret du service : elle ne correspond pas.",
        );
        break;
      case "rsa":
        valid = verifyRs256(input, parts.signature, key.key);
        say(
          valid ? "ok" : "bad",
          valid
            ? "Signature RSA vérifiée avec la clé publique du service : elle est valable."
            : "Signature RSA vérifiée avec la clé publique du service : elle n'est pas valable. Seule la clé privée, que le service garde, pouvait la produire.",
        );
        break;
      case "ec":
        valid = verifyEs256(input, parts.signature, key.point);
        say(
          valid ? "ok" : "bad",
          valid
            ? "Signature ECDSA vérifiée avec la clé publique du service : elle est valable."
            : "Signature ECDSA vérifiée avec la clé publique du service : elle n'est pas valable. Seule la clé privée, que le service garde, pouvait la produire.",
        );
        break;
    }
    if (!valid) return refuse("bad-signature", "Signature invalide : le jeton est refusé.");
    signatureChecked = true;
  }

  const payloadText = decodePart(parts.payload);
  const claims = payloadText === null ? NOT_BASE64 : readClaims(payloadText);
  if (!claims.ok) return refuse("malformed", `Le contenu est illisible : ${claims.problem}`);
  const read = claims.value;
  if (policy.checkClaims) {
    if (read.exp === undefined || read.exp <= SANDBOX_NOW) {
      return refuse(
        "bad-claims",
        read.exp === undefined
          ? "Le jeton n'a pas de date d'expiration (exp) : le service le refuse."
          : "Le jeton est expiré (exp est passé sur l'horloge du bac à sable) : le service le refuse.",
      );
    }
    const audience = Array.isArray(read.aud) ? read.aud : read.aud === undefined ? [] : [read.aud];
    if (read.iss !== ISSUER || !audience.includes(AUDIENCE)) {
      return refuse(
        "bad-claims",
        "L'émetteur (iss) ou le destinataire (aud) n'est pas celui que le service attend : il refuse le jeton.",
      );
    }
    say("ok", "Expiration, émetteur et destinataire contrôlés : tout est en règle.");
  }
  say(
    signatureChecked ? "ok" : "bad",
    `Jeton accepté : le service te prend pour « ${read.sub ?? "?"} », rôle « ${read.role ?? "?"} ».`,
  );
  return { accepted: true, claims: read, reason: null, steps };
}

/** Whether a verdict is a forgery that worked: accepted, and the role is admin. */
export function isForgery(verdict: Verdict): boolean {
  return verdict.accepted && verdict.claims?.role === "admin";
}

// ── the corrected services ───────────────────────────────────────────────────

export interface Replay {
  readonly key: string;
  readonly label: string;
  readonly service: ServiceId;
  readonly token: string;
  /** Whether the token is the learner's own forgery rather than the lesson's. */
  readonly own: boolean;
  /** Whether it is alice's honest token, which the corrected service must keep accepting. */
  readonly legit: boolean;
}

const ATTACK_LABELS: Record<ServiceId, string> = {
  trusting: "alg: none, contre le service A",
  weak: "Secret deviné, contre le service B",
  rsa: "Confusion RS256 vers HS256, contre le service C (clé RSA)",
  ec: "Confusion ES256 vers HS256, contre le service C (clé EC)",
};

/**
 * What the corrected services are sent: for each attack step of the lab, the
 * learner's forged token if there is one, the lesson's otherwise; then alice's
 * honest token for each service, which must still pass.
 */
export function replaysFor(
  levels: readonly JwtLevel[],
  forged: Partial<Record<ServiceId, string>>,
): Replay[] {
  const attacks: Replay[] = [];
  for (const level of levels) {
    if (!isAttackLevel(level)) continue;
    const services = LEVEL_SERVICES[level];
    const played = services.filter((service) => forged[service] !== undefined);
    const chosen: readonly ServiceId[] = played.length > 0 ? played : services.slice(0, 1);
    for (const service of chosen) {
      const own = forged[service];
      attacks.push({
        key: `attack-${service}`,
        label: ATTACK_LABELS[service],
        service,
        token: own ?? canonicalAttack(service),
        own: own !== undefined,
        legit: false,
      });
    }
  }
  const legit: Replay[] = attacks.map((attack) => ({
    key: `legit-${attack.service}`,
    label: `Le jeton d'alice, contre ${SERVICE_NAMES[attack.service].replace("Service", "le service")}`,
    service: attack.service,
    token: receivedToken(attack.service, "patched"),
    own: false,
    legit: true,
  }));
  return [...attacks, ...legit];
}

/** What the corrected service says of a replayed token. */
export function replay(entry: Replay): Verdict {
  return verifyAt(entry.service, "patched", entry.token);
}

/** Whether the corrected service did what the lesson wants: refuse an attack, accept alice. */
export function replayHolds(entry: Replay, verdict: Verdict): boolean {
  return entry.legit ? verdict.accepted && verdict.claims?.role === "user" : !verdict.accepted;
}

// ── what the lab says ────────────────────────────────────────────────────────

export interface LevelText {
  /** On the step's button. */
  readonly name: string;
  readonly title: string;
  readonly intro: readonly string[];
  readonly goal: string;
  /** Said once the step is done: why it worked, and the defence. */
  readonly why: readonly string[];
  /** Said after a first miss. */
  readonly hint: string;
}

export const LEVEL_TEXTS: Record<JwtLevel, LevelText> = {
  decode: {
    name: "1. Lire",
    title: "Décomposer un jeton",
    intro: [
      "Un JWT (JSON Web Token) est un texte en trois parties séparées par des points : l'en-tête, la charge utile (les informations que le jeton affirme) et la signature. Les deux premières sont du JSON écrit en base64url ; la troisième est une suite d'octets, écrite de la même façon.",
      "Le base64url n'est pas un chiffrement : il suffit de décoder pour tout lire, sans clé. Voici le jeton qu'un service vient d'émettre pour alice. Décode ses trois parties.",
    ],
    goal: "Combien de temps ce jeton reste-t-il valable ? Indice : iat est l'heure d'émission et exp l'heure d'expiration, en secondes depuis le 1er janvier 1970.",
    why: [
      "Tu as tout lu sans clé ni secret : la charge utile d'un jeton n'est jamais confidentielle, on n'y met ni mot de passe ni donnée sensible. Ce que la signature apporte, c'est qu'on ne peut pas modifier ces informations sans que le service s'en aperçoive, à condition qu'il vérifie vraiment la signature.",
      "Les étapes suivantes montrent trois façons de la vérifier de travers.",
    ],
    hint: "Soustrais iat à exp : tu obtiens des secondes. Précise l'unité, par exemple « 3600 secondes » ou le même temps en heures.",
  },
  none: {
    name: "2. alg: none",
    title: "Le service qui croit le jeton sur parole",
    intro: [
      "Le service A lit l'en-tête du jeton pour savoir comment le vérifier. Tu es connecté en tant qu'alice, avec le rôle user, et le service ne connaît ton rôle que par ce que le jeton affirme.",
      "La norme JWT prévoit un algorithme « none » : un jeton sans signature, pour les cas où un autre moyen protège déjà l'échange. Lis le code du service, repère la ligne en cause, puis forge un jeton qu'il accepte.",
    ],
    goal: "Fais accepter par le service A un jeton qui te donne le rôle admin, sans connaître son secret.",
    why: [
      "Le service a laissé le jeton choisir comment on le vérifie : en écrivant alg: none, tu as demandé qu'on ne vérifie rien, et il t'a cru. La signature n'a jamais été comparée à quoi que ce soit.",
      "La défense tient en une règle : c'est le serveur qui décide des algorithmes acceptés, par une liste blanche, jamais le jeton. Les bibliothèques récentes refusent « none » par défaut ; les failles venaient d'anciennes versions et de code qui contournait ce réglage.",
    ],
    hint: "Dans l'en-tête, remplace l'algorithme par none. Dans le contenu, mets le rôle admin. Pour la signature, choisis « Aucune » : un jeton sans signature finit par un point.",
  },
  "weak-secret": {
    name: "3. Secret faible",
    title: "Le secret que l'on devine",
    intro: [
      "Le service B a corrigé le premier défaut : il n'accepte que HS256. Cet algorithme signe avec un HMAC, un secret partagé entre le service qui émet les jetons et celui qui les vérifie. Mais ce secret a été choisi à la main.",
      "Avec le jeton, on peut essayer des secrets sans jamais interroger le service : on calcule le HMAC de l'en-tête et du contenu avec le mot essayé, et s'il redonne la signature du jeton, c'est le bon. Un attaquant le fait hors ligne, des milliards de fois par seconde sur une carte graphique.",
    ],
    goal: "Retrouve le secret du service B dans le dictionnaire, resigne un jeton avec le rôle admin, et fais-le accepter.",
    why: [
      "Un mot tombe dès qu'il est dans une liste, et le service n'a rien vu passer : tous les essais se sont faits chez toi, avec le seul jeton que tu avais reçu. Il n'y a ni limite d'essais ni alerte à déclencher.",
      "Un secret HS256 doit être aléatoire et long : au moins 32 octets (256 bits) tirés par un générateur cryptographique, jamais un mot, une date ou le nom du projet, et jamais le même d'un environnement à l'autre.",
    ],
    hint: "Lance le dictionnaire : le mot qui redonne la signature du jeton est le secret. Ensuite, signe ton jeton admin en HMAC avec ce mot.",
  },
  confusion: {
    name: "4. Confusion",
    title: "L'algorithme que le jeton choisit",
    intro: [
      "Le service C signe ses jetons avec une clé privée (RS256 avec une clé RSA, ES256 avec une clé sur courbe elliptique) et ne garde pour vérifier que la clé publique, celle que tout le monde peut télécharger. C'est le bon schéma : qui vérifie ne peut pas signer.",
      "Son code est pourtant écrit de travers : il demande à la bibliothèque de vérifier avec l'algorithme que le jeton annonce, et avec la clé publique du service. Si le jeton annonce HS256, la bibliothèque prend cette clé pour un secret HMAC. Un secret, tu n'en as pas ; mais une clé publique, tu en as une sous les yeux.",
    ],
    goal: "Fais accepter par le service C un jeton admin, sans la clé privée.",
    why: [
      "En HS256, la même clé signe et vérifie. En faisant passer la clé publique pour un secret, tu as supprimé la séparation que l'asymétrique apportait : la clé que tout le monde connaît est devenue la clé de signature. Que la clé soit RSA ou EC ne change rien, une clé publique reste une clé publique.",
      "La défense est la même que pour alg: none : le service impose RS256 (ou ES256), il ne le lit pas dans le jeton, et un jeton qui annonce un autre algorithme est refusé avant d'être regardé.",
    ],
    hint: "Passe alg à HS256 et le rôle à admin, signe en HMAC, et prends pour secret la clé publique du service : le bouton la recopie telle quelle, retour à la ligne final compris.",
  },
  fixed: {
    name: "5. Corrigé",
    title: "Les mêmes jetons, face aux services corrigés",
    intro: [
      "Chaque service a reçu sa correction. Rejoue les jetons forgés : chacun est refusé, et le service dit quelle règle l'arrête. Envoie aussi le jeton d'alice, tel qu'il a été émis : une bonne correction ne casse pas ce qui marchait.",
    ],
    goal: "Rejoue chaque attaque, puis le jeton d'alice : les attaques sont refusées, le jeton d'alice passe.",
    why: [
      "Trois règles, à appliquer ensemble. Une liste blanche d'algorithmes fixée par le serveur. Une clé qui convient : un secret long et aléatoire en HS256, ou une paire de clés dès que plusieurs services vérifient. Une vérification stricte de ce que le jeton affirme : expiration, émetteur, destinataire.",
      "Et dans tous les cas, on s'appuie sur une bibliothèque éprouvée et à jour, à qui l'on passe la liste blanche : on n'écrit pas soi-même la vérification d'une signature.",
    ],
    hint: "Rejoue chaque ligne avec son bouton, y compris celles du jeton d'alice.",
  },
};

export interface CodeLine {
  readonly text: string;
  /** "flaw" for the line that is wrong, "fix" for the line that mends it. */
  readonly mark?: "flaw" | "fix";
}

/** The code of each service, as the lab shows it: the flawed version and the corrected one. */
export const SERVICE_CODE: Record<
  ServiceId,
  { vulnerable: readonly CodeLine[]; patched: readonly CodeLine[] }
> = {
  trusting: {
    vulnerable: [
      { text: "function verify(token) {" },
      { text: '  const [header, payload, signature] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: "  const claims = json(base64url(payload));" },
      { text: "  // alg: none, une signature « vide » : rien à vérifier", mark: "flaw" },
      { text: '  if (alg === "none") return claims;', mark: "flaw" },
      { text: '  if (alg === "HS256" && hmac(SECRET, header + "." + payload) === signature) {' },
      { text: "    return claims;" },
      { text: "  }" },
      { text: '  throw new Error("jeton refusé");' },
      { text: "}" },
    ],
    patched: [
      { text: "function verify(token) {" },
      { text: '  const [header, payload, signature] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: "  // la liste blanche est celle du serveur", mark: "fix" },
      { text: '  if (alg !== "HS256") throw new Error("algorithme refusé");', mark: "fix" },
      { text: '  if (!sameBytes(hmac(SECRET, header + "." + payload), signature)) {' },
      { text: '    throw new Error("signature invalide");' },
      { text: "  }" },
      { text: "  const claims = json(base64url(payload));" },
      { text: "  // ce que le jeton affirme est contrôlé à son tour", mark: "fix" },
      {
        text: "  if (claims.exp <= now() || claims.iss !== ISSUER || claims.aud !== AUDIENCE) {",
        mark: "fix",
      },
      { text: '    throw new Error("revendications refusées");', mark: "fix" },
      { text: "  }" },
      { text: "  return claims;" },
      { text: "}" },
    ],
  },
  weak: {
    vulnerable: [
      { text: "// un mot que quelqu'un a choisi à la main", mark: "flaw" },
      { text: "const SECRET = process.env.JWT_SECRET;", mark: "flaw" },
      { text: "" },
      { text: "function verify(token) {" },
      { text: '  const [header, payload, signature] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: '  if (alg !== "HS256") throw new Error("algorithme refusé");' },
      { text: '  if (hmac(SECRET, header + "." + payload) !== signature) {' },
      { text: '    throw new Error("signature invalide");' },
      { text: "  }" },
      { text: "  return json(base64url(payload));" },
      { text: "}" },
    ],
    patched: [
      { text: "// 32 octets tirés au hasard : openssl rand -base64 32", mark: "fix" },
      { text: "const SECRET = process.env.JWT_SECRET;", mark: "fix" },
      { text: "" },
      { text: "function verify(token) {" },
      { text: '  const [header, payload, signature] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: '  if (alg !== "HS256") throw new Error("algorithme refusé");' },
      { text: '  if (!sameBytes(hmac(SECRET, header + "." + payload), signature)) {' },
      { text: '    throw new Error("signature invalide");' },
      { text: "  }" },
      { text: "  const claims = json(base64url(payload));" },
      {
        text: "  if (claims.exp <= now() || claims.iss !== ISSUER || claims.aud !== AUDIENCE) {",
        mark: "fix",
      },
      { text: '    throw new Error("revendications refusées");', mark: "fix" },
      { text: "  }" },
      { text: "  return claims;" },
      { text: "}" },
    ],
  },
  rsa: {
    vulnerable: [
      { text: "// la clé que le service publie : tout le monde peut la télécharger" },
      { text: 'const PUBLIC_KEY = readFile("public.pem");' },
      { text: "" },
      { text: "function verify(token) {" },
      { text: '  const [header] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: "  // l'algorithme vient du jeton, la clé est celle du service", mark: "flaw" },
      { text: "  return library.verify(token, PUBLIC_KEY, { algorithms: [alg] });", mark: "flaw" },
      { text: "}" },
    ],
    patched: [
      { text: 'const PUBLIC_KEY = readFile("public.pem");' },
      { text: "" },
      { text: "function verify(token) {" },
      {
        text: "  // l'algorithme, l'émetteur et le destinataire sont ceux du serveur",
        mark: "fix",
      },
      { text: "  return library.verify(token, PUBLIC_KEY, {", mark: "fix" },
      { text: '    algorithms: ["RS256"],', mark: "fix" },
      { text: "    issuer: ISSUER,", mark: "fix" },
      { text: "    audience: AUDIENCE,", mark: "fix" },
      { text: "  });", mark: "fix" },
      { text: "}" },
    ],
  },
  ec: {
    vulnerable: [
      { text: 'const PUBLIC_KEY = readFile("public.pem");' },
      { text: "" },
      { text: "function verify(token) {" },
      { text: '  const [header] = token.split(".");' },
      { text: "  const { alg } = json(base64url(header));" },
      { text: "  // l'algorithme vient du jeton, la clé est celle du service", mark: "flaw" },
      { text: "  return library.verify(token, PUBLIC_KEY, { algorithms: [alg] });", mark: "flaw" },
      { text: "}" },
    ],
    patched: [
      { text: 'const PUBLIC_KEY = readFile("public.pem");' },
      { text: "" },
      { text: "function verify(token) {" },
      {
        text: "  // l'algorithme, l'émetteur et le destinataire sont ceux du serveur",
        mark: "fix",
      },
      { text: "  return library.verify(token, PUBLIC_KEY, {", mark: "fix" },
      { text: '    algorithms: ["ES256"],', mark: "fix" },
      { text: "    issuer: ISSUER,", mark: "fix" },
      { text: "    audience: AUDIENCE,", mark: "fix" },
      { text: "  });", mark: "fix" },
      { text: "}" },
    ],
  },
};
