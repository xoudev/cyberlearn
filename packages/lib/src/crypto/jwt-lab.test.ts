import { createPublicKey } from "node:crypto";
import type { JwtLevel } from "@cyberlearn/types";
import { importJWK, importSPKI, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { utf8Encode } from "./bytes";
import { guessSecret, joinToken, signToken, splitToken } from "./jwt";
import {
  canonicalAttack,
  type Draft,
  draftToken,
  isForgery,
  isLifetimeAnswer,
  jsonProblem,
  LEVEL_SERVICES,
  LEVEL_TEXTS,
  LIFETIME_SECONDS,
  publicKeyFacts,
  publicKeyPem,
  receivedToken,
  type Replay,
  replay,
  replayHolds,
  replaysFor,
  SANDBOX_NOW,
  SERVICE_CODE,
  type ServiceId,
  startDraft,
  verifyAt,
  viewToken,
  WEAK_SECRET,
  WORDLIST,
} from "./jwt-lab";
import { sha256 } from "./sha256";

/**
 * The lab's services behave as the lesson says: the flawed ones accept the
 * forgery the step teaches and nothing else, the corrected ones refuse every
 * one of them and keep accepting alice. The tokens are held against `jose`,
 * the reference library, so that the lab never teaches a behaviour a real
 * library does not have.
 */

const SERVICES: readonly ServiceId[] = ["trusting", "weak", "rsa", "ec"];
const CLAIMS_ADMIN = '{"sub":"alice","role":"admin"}';
const PEM_ASYMMETRIC: readonly ServiceId[] = ["rsa", "ec"];

describe("the sandbox's keys and tokens", () => {
  it("publishes PEM files that Node reads back byte for byte", () => {
    for (const family of ["rsa", "ec"] as const) {
      const pem = publicKeyPem(family);
      expect(pem.startsWith("-----BEGIN PUBLIC KEY-----\n")).toBe(true);
      expect(pem.endsWith("\n-----END PUBLIC KEY-----\n")).toBe(true);
      expect(createPublicKey(pem).export({ type: "spki", format: "pem" })).toBe(pem);
    }
    expect(createPublicKey(publicKeyPem("rsa")).asymmetricKeyDetails).toMatchObject({
      modulusLength: 2048,
      publicExponent: 65537n,
    });
    expect(createPublicKey(publicKeyPem("ec")).asymmetricKeyDetails).toMatchObject({
      namedCurve: "prime256v1",
    });
  });

  it("hands out tokens that jose verifies with those keys, on the sandbox clock", async () => {
    const options = {
      currentDate: new Date(SANDBOX_NOW * 1000),
      issuer: "cyberlearn-sandbox",
      audience: "sandbox-api",
    };
    const rsa = await jwtVerify(
      receivedToken("rsa"),
      await importSPKI(publicKeyPem("rsa"), "RS256"),
      { ...options, algorithms: ["RS256"] },
    );
    expect(rsa.payload).toMatchObject({ sub: "alice", role: "user" });
    const ec = await jwtVerify(receivedToken("ec"), await importSPKI(publicKeyPem("ec"), "ES256"), {
      ...options,
      algorithms: ["ES256"],
    });
    expect(ec.payload).toMatchObject({ sub: "alice", role: "user" });
    const hmac = await jwtVerify(
      receivedToken("trusting"),
      Uint8Array.from(sha256(utf8Encode("cyberlearn-sandbox/service-a"))),
      { ...options, algorithms: ["HS256"] },
    );
    expect(hmac.payload).toMatchObject({
      sub: "alice",
      role: "user",
      exp: 1767225600 + LIFETIME_SECONDS,
    });
  });

  it("gives every service a token it accepts, flawed or corrected, as a plain user", () => {
    for (const service of SERVICES) {
      for (const mode of ["vulnerable", "patched"] as const) {
        const verdict = verifyAt(service, mode, receivedToken(service, mode));
        expect(verdict.accepted, `${service} ${mode}`).toBe(true);
        expect(verdict.claims?.role).toBe("user");
        expect(isForgery(verdict)).toBe(false);
      }
    }
  });

  it("starts a draft that makes back the very token the service handed out", () => {
    for (const service of SERVICES) {
      expect(draftToken(service, startDraft(service))).toBe(receivedToken(service));
    }
  });
});

describe("the flawed services accept the forgery of their step", () => {
  it("A takes alg: none for a token with nothing to verify, in any case", () => {
    const verdict = verifyAt("trusting", "vulnerable", canonicalAttack("trusting"));
    expect(verdict).toMatchObject({ accepted: true, reason: null });
    expect(isForgery(verdict)).toBe(true);
    expect(verdict.steps.some((step) => step.text.includes("C'est le défaut"))).toBe(true);
    for (const alg of ["None", "NONE", "nOnE"]) {
      const token = joinToken(`{"alg":"${alg}"}`, CLAIMS_ADMIN, "");
      expect(isForgery(verifyAt("trusting", "vulnerable", token)), alg).toBe(true);
    }
  });

  it("A still refuses a token whose signature does not fit, and an algorithm it has no key for", () => {
    const draft: Draft = { ...startDraft("trusting"), payload: CLAIMS_ADMIN };
    expect(verifyAt("trusting", "vulnerable", draftToken("trusting", draft))).toMatchObject({
      accepted: false,
      reason: "bad-signature",
    });
    const wrongSecret = signToken('{"alg":"HS256"}', CLAIMS_ADMIN, utf8Encode(WEAK_SECRET));
    expect(verifyAt("trusting", "vulnerable", wrongSecret).reason).toBe("bad-signature");
    expect(
      verifyAt("trusting", "vulnerable", joinToken('{"alg":"RS256"}', CLAIMS_ADMIN, "AAAA")),
    ).toMatchObject({
      accepted: false,
      reason: "unknown-algorithm",
    });
  });

  it("B refuses alg: none, and takes a token signed with the word from the dictionary", () => {
    const none = verifyAt("weak", "vulnerable", canonicalAttack("trusting"));
    expect(none).toMatchObject({ accepted: false, reason: "not-allowed" });
    const forged = verifyAt("weak", "vulnerable", canonicalAttack("weak"));
    expect(isForgery(forged)).toBe(true);
    const otherWord = signToken('{"alg":"HS256"}', CLAIMS_ADMIN, utf8Encode("dragon"));
    expect(verifyAt("weak", "vulnerable", otherWord).reason).toBe("bad-signature");
  });

  it("C takes HS256 signed with its own public key, RSA and EC alike, and nothing signed otherwise", () => {
    for (const service of PEM_ASYMMETRIC) {
      const verdict = verifyAt(service, "vulnerable", canonicalAttack(service));
      expect(isForgery(verdict), service).toBe(true);
      // alg: none is refused here, as is a tampered token that keeps its signature.
      expect(verifyAt(service, "vulnerable", canonicalAttack("trusting")).reason).toBe(
        "not-allowed",
      );
      const draft: Draft = { ...startDraft(service), payload: CLAIMS_ADMIN };
      expect(verifyAt(service, "vulnerable", draftToken(service, draft)).reason).toBe(
        "bad-signature",
      );
    }
    // The other family's key is not the service's key, and the file must be the file, newline included.
    const other = signToken('{"alg":"HS256"}', CLAIMS_ADMIN, utf8Encode(publicKeyPem("ec")));
    expect(verifyAt("rsa", "vulnerable", other).reason).toBe("bad-signature");
    const trimmed = signToken(
      '{"alg":"HS256"}',
      CLAIMS_ADMIN,
      utf8Encode(publicKeyPem("rsa").trim()),
    );
    expect(verifyAt("rsa", "vulnerable", trimmed).reason).toBe("bad-signature");
    // A token for the EC service does not go to the RSA one.
    expect(verifyAt("rsa", "vulnerable", receivedToken("ec")).reason).toBe("unknown-algorithm");
  });

  it("refuses what is not a token, at every service", () => {
    for (const service of SERVICES) {
      for (const mode of ["vulnerable", "patched"] as const) {
        expect(verifyAt(service, mode, "pas un jeton").reason).toBe("malformed");
        expect(verifyAt(service, mode, "a.b.c").reason).toBe("malformed");
        expect(verifyAt(service, mode, joinToken("[1]", "{}", "")).reason).toBe("malformed");
        expect(verifyAt(service, mode, joinToken('{"typ":"JWT"}', "{}", "")).reason).toBe(
          "malformed",
        );
        expect(
          verifyAt(service, mode, joinToken('{"alg":"HS256"}', "pas du json", "x")).accepted,
        ).toBe(false);
      }
    }
  });
});

describe("the corrected services refuse them all", () => {
  it("names the rule that stops each forgery", () => {
    expect(verifyAt("trusting", "patched", canonicalAttack("trusting"))).toMatchObject({
      accepted: false,
      reason: "not-allowed",
    });
    expect(verifyAt("weak", "patched", canonicalAttack("weak"))).toMatchObject({
      accepted: false,
      reason: "bad-signature",
    });
    for (const service of PEM_ASYMMETRIC) {
      const verdict = verifyAt(service, "patched", canonicalAttack(service));
      expect(verdict, service).toMatchObject({ accepted: false, reason: "not-allowed" });
      expect(verdict.steps.at(-1)?.text).toContain("liste blanche");
    }
  });

  it("refuses alg: none and a missing signature, whatever the claims", () => {
    for (const service of SERVICES) {
      for (const alg of ["none", "None"]) {
        const token = joinToken(`{"alg":"${alg}"}`, CLAIMS_ADMIN, "");
        expect(verifyAt(service, "patched", token).accepted, `${service} ${alg}`).toBe(false);
      }
    }
  });

  it("checks what the token says: expiry, issuer, audience", () => {
    const secret = sha256(utf8Encode("cyberlearn-sandbox/service-a"));
    const header = '{"alg":"HS256","typ":"JWT"}';
    const claims = (text: string): string => signToken(header, text, secret);
    const good = '"iss":"cyberlearn-sandbox","aud":"sandbox-api","exp":1767229200';
    expect(verifyAt("trusting", "patched", claims(`{"role":"user",${good}}`)).accepted).toBe(true);
    expect(
      verifyAt(
        "trusting",
        "patched",
        claims('{"role":"user","iss":"cyberlearn-sandbox","aud":"sandbox-api","exp":1767225600}'),
      ),
    ).toMatchObject({ accepted: false, reason: "bad-claims" });
    expect(
      verifyAt(
        "trusting",
        "patched",
        claims('{"role":"user","iss":"cyberlearn-sandbox","aud":"sandbox-api"}'),
      ).reason,
    ).toBe("bad-claims");
    expect(
      verifyAt(
        "trusting",
        "patched",
        claims('{"role":"user","iss":"ailleurs","aud":"sandbox-api","exp":1767229200}'),
      ).reason,
    ).toBe("bad-claims");
    expect(
      verifyAt(
        "trusting",
        "patched",
        claims('{"role":"user","iss":"cyberlearn-sandbox","aud":["autre"],"exp":1767229200}'),
      ).reason,
    ).toBe("bad-claims");
    expect(
      verifyAt(
        "trusting",
        "patched",
        claims(
          '{"role":"user","iss":"cyberlearn-sandbox","aud":["autre","sandbox-api"],"exp":1767229200}',
        ),
      ).accepted,
    ).toBe(true);
    // The flawed service looks at none of it.
    expect(verifyAt("trusting", "vulnerable", claims('{"role":"admin","exp":1}')).accepted).toBe(
      true,
    );
  });

  it("does what a real library does with the same tokens", async () => {
    const options = {
      currentDate: new Date(SANDBOX_NOW * 1000),
      issuer: "cyberlearn-sandbox",
      audience: "sandbox-api",
    };
    // jose refuses alg: none, and a token signed with a secret other than the service's.
    const key = Uint8Array.from(sha256(utf8Encode("cyberlearn-sandbox/service-a")));
    await expect(
      jwtVerify(canonicalAttack("trusting"), key, { ...options, algorithms: ["HS256"] }),
    ).rejects.toThrow();
    // jose, told RS256, refuses the confusion token; so does the corrected service C.
    const rsa = await importSPKI(publicKeyPem("rsa"), "RS256");
    await expect(
      jwtVerify(canonicalAttack("rsa"), rsa, { ...options, algorithms: ["RS256"] }),
    ).rejects.toThrow();
    const ec = await importJWK(
      createPublicKey(publicKeyPem("ec")).export({ format: "jwk" }),
      "ES256",
    );
    await expect(
      jwtVerify(canonicalAttack("ec"), ec, { ...options, algorithms: ["ES256"] }),
    ).rejects.toThrow();
    // And both accept what the corrected service accepts.
    await expect(
      jwtVerify(receivedToken("rsa"), rsa, { ...options, algorithms: ["RS256"] }),
    ).resolves.toBeDefined();
    expect(verifyAt("rsa", "patched", receivedToken("rsa")).accepted).toBe(true);
  });
});

describe("the dictionary", () => {
  it("holds forty distinct words, the secret of service B among them", () => {
    expect(WORDLIST).toHaveLength(40);
    expect(new Set(WORDLIST).size).toBe(40);
    expect(WORDLIST).toContain(WEAK_SECRET);
  });

  it("finds the weak secret, and none in a token signed with a strong one", () => {
    const found = guessSecret(receivedToken("weak"), WORDLIST);
    expect(found.found).toBe(WEAK_SECRET);
    expect(found.tried).toBe(WORDLIST.indexOf(WEAK_SECRET) + 1);
    expect(guessSecret(receivedToken("trusting"), WORDLIST)).toEqual({ found: null, tried: 40 });
    expect(guessSecret(receivedToken("weak", "patched"), WORDLIST).found).toBeNull();
  });
});

describe("what the lab hands the learner", () => {
  it("takes the first token apart, part by part", () => {
    const parts = viewToken(receivedToken("trusting"));
    if (parts === null) throw new Error("no parts");
    expect(parts.map((part) => part.label)).toEqual(["En-tête", "Charge utile", "Signature"]);
    expect(parts[0].decoded).toContain('"alg": "HS256"');
    expect(parts[1].decoded).toContain('"role": "user"');
    expect(parts[1].decoded).toContain('"exp": 1767229200');
    expect(parts[2].decoded).toMatch(/^32 octets : /u);
    expect(viewToken("pas un jeton")).toBeNull();
    expect(viewToken(joinToken("{}", "{}", ""))?.[2].decoded).toBe("(vide)");
    expect(viewToken(receivedToken("rsa"))?.[2].decoded).toMatch(/^256 octets : /u);
    expect(viewToken(receivedToken("ec"))?.[2].decoded).toMatch(/^64 octets : /u);
  });

  it("accepts an hour in the ways a learner writes it, and nothing else", () => {
    for (const yes of [
      "3600",
      "3600 s",
      "3600 secondes",
      "1h",
      "1 h",
      "1 heure",
      "une heure",
      "Une heure.",
      "60 minutes",
      "60 min",
      "1 H",
    ]) {
      expect(isLifetimeAnswer(yes), yes).toBe(true);
    }
    for (const no of [
      "",
      "60",
      "1",
      "2 heures",
      "30 minutes",
      "3600 minutes",
      "une journée",
      "beaucoup",
      "1h30",
    ]) {
      expect(isLifetimeAnswer(no), no).toBe(false);
    }
  });

  it("shows the public keys with their sizes, and says what is wrong with a JSON text", () => {
    expect(publicKeyFacts("rsa").lines.join(" ")).toContain("65537");
    expect(publicKeyFacts("rsa").lines.join(" ")).toContain("256 octets");
    expect(publicKeyFacts("ec").lines.join(" ")).toContain("64 octets");
    expect(publicKeyFacts("ec").pem).toBe(publicKeyPem("ec"));
    expect(jsonProblem('{"a":1}')).toBeNull();
    expect(jsonProblem("{")).toBe("Ce n'est pas du JSON valide.");
    expect(jsonProblem("[]")).toBe("Le JSON doit être un objet, entre accolades.");
  });

  it("says something for every step and shows the flawed code and the fixed one of every service", () => {
    const levels: JwtLevel[] = ["decode", "none", "weak-secret", "confusion", "fixed"];
    for (const level of levels) {
      const text = LEVEL_TEXTS[level];
      expect(text.intro.length, level).toBeGreaterThan(0);
      expect(text.why.length, level).toBeGreaterThan(0);
      expect(text.goal.length, level).toBeGreaterThan(0);
      expect(text.hint.length, level).toBeGreaterThan(0);
    }
    for (const service of SERVICES) {
      expect(
        SERVICE_CODE[service].vulnerable.some((line) => line.mark === "flaw"),
        service,
      ).toBe(true);
      expect(
        SERVICE_CODE[service].patched.some((line) => line.mark === "fix"),
        service,
      ).toBe(true);
      // The flawed code must not give the weak secret away: the learner finds it.
      const text = SERVICE_CODE[service].vulnerable.map((line) => line.text).join("\n");
      expect(text).not.toContain(WEAK_SECRET);
    }
  });
});

describe("the replay against the corrected services", () => {
  const levels: JwtLevel[] = ["decode", "none", "weak-secret", "confusion", "fixed"];

  it("takes the learner's own tokens first, the lesson's otherwise, then alice's", () => {
    const own = canonicalAttack("weak");
    const replays = replaysFor(levels, { weak: own, ec: canonicalAttack("ec") });
    expect(replays.map((r) => r.key)).toEqual([
      "attack-trusting",
      "attack-weak",
      "attack-ec",
      "legit-trusting",
      "legit-weak",
      "legit-ec",
    ]);
    expect(replays.find((r) => r.key === "attack-weak")).toMatchObject({ own: true, token: own });
    expect(replays.find((r) => r.key === "attack-trusting")).toMatchObject({ own: false });
    expect(replays.filter((r) => r.legit)).toHaveLength(3);
    // A confusion step nobody played is played on the first of its services.
    expect(replaysFor(["confusion", "fixed"], {}).map((r) => r.key)).toEqual([
      "attack-rsa",
      "legit-rsa",
    ]);
    // No attack step, nothing to replay.
    expect(replaysFor(["decode", "fixed"], {})).toEqual([]);
  });

  it("holds when the corrected service refuses an attack and accepts alice, and only then", () => {
    for (const entry of replaysFor(levels, {})) {
      expect(replayHolds(entry, replay(entry)), entry.key).toBe(true);
    }
    const forged: Replay = {
      key: "attack-trusting",
      label: "x",
      service: "trusting",
      token: receivedToken("trusting", "patched"),
      own: false,
      legit: false,
    };
    // alice's own token is no attack: a service that accepts it does not "hold" against it.
    expect(replayHolds(forged, replay(forged))).toBe(false);
  });

  it("knows which services each attack step is played against", () => {
    expect(LEVEL_SERVICES.none).toEqual(["trusting"]);
    expect(LEVEL_SERVICES["weak-secret"]).toEqual(["weak"]);
    expect(LEVEL_SERVICES.confusion).toEqual(["rsa", "ec"]);
    expect(splitToken(canonicalAttack("trusting"))?.signature).toBe("");
  });
});
