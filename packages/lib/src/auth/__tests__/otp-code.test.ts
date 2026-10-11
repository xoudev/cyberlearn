import { describe, expect, it } from "vitest";
import {
  createOtpAutoSubmit,
  groupOtpSecret,
  isCompleteOtpCode,
  OTP_CODE_LENGTH,
  sanitizeOtpCode,
} from "../otp-code.js";

describe("sanitizeOtpCode", () => {
  it("keeps the digits of a code pasted the way apps display it", () => {
    expect(sanitizeOtpCode("123 456")).toBe("123456");
    expect(sanitizeOtpCode("123-456")).toBe("123456");
    expect(sanitizeOtpCode(" 12 34 56 \n")).toBe("123456");
  });

  it("stops at six digits", () => {
    expect(sanitizeOtpCode("1234567890")).toHaveLength(OTP_CODE_LENGTH);
    expect(sanitizeOtpCode("1234567890")).toBe("123456");
  });

  it("drops letters and leaves a partial code partial", () => {
    expect(sanitizeOtpCode("12a")).toBe("12");
    expect(sanitizeOtpCode("code")).toBe("");
  });
});

describe("isCompleteOtpCode", () => {
  it("accepts exactly six digits", () => {
    expect(isCompleteOtpCode("012345")).toBe(true);
    expect(isCompleteOtpCode("12345")).toBe(false);
    expect(isCompleteOtpCode("1234567")).toBe(false);
    expect(isCompleteOtpCode("12345a")).toBe(false);
  });
});

describe("createOtpAutoSubmit", () => {
  it("sends a code the moment it has six digits, and not before", () => {
    const gate = createOtpAutoSubmit();
    expect(gate.shouldSubmit("12345", false)).toBe(false);
    expect(gate.shouldSubmit("123456", false)).toBe(true);
  });

  it("sends the same six digits once, so a refused code does not loop", () => {
    const gate = createOtpAutoSubmit();
    expect(gate.shouldSubmit("123456", false)).toBe(true);
    // The request is in flight, then it is refused and nothing is pending.
    expect(gate.shouldSubmit("123456", true)).toBe(false);
    expect(gate.shouldSubmit("123456", false)).toBe(false);
    expect(gate.shouldSubmit("123456", false)).toBe(false);
  });

  it("sends a corrected code after a refused one", () => {
    const gate = createOtpAutoSubmit();
    gate.shouldSubmit("123456", false);
    expect(gate.shouldSubmit("12345", false)).toBe(false);
    expect(gate.shouldSubmit("123457", false)).toBe(true);
  });

  it("waits for a pending request instead of dropping a code typed during it", () => {
    const gate = createOtpAutoSubmit();
    expect(gate.shouldSubmit("654321", true)).toBe(false);
    expect(gate.shouldSubmit("654321", false)).toBe(true);
  });

  it("does not resend a code that was sent by hand", () => {
    const gate = createOtpAutoSubmit();
    gate.markSubmitted("111111");
    expect(gate.shouldSubmit("111111", false)).toBe(false);
    expect(gate.shouldSubmit("222222", false)).toBe(true);
  });

  it("can start over, for a new enrolment", () => {
    const gate = createOtpAutoSubmit();
    gate.shouldSubmit("123456", false);
    gate.reset();
    expect(gate.shouldSubmit("123456", false)).toBe(true);
  });

  it("keeps one memory per gate", () => {
    const first = createOtpAutoSubmit();
    const second = createOtpAutoSubmit();
    first.shouldSubmit("123456", false);
    expect(second.shouldSubmit("123456", false)).toBe(true);
  });
});

describe("groupOtpSecret", () => {
  it("cuts a secret into groups of four", () => {
    expect(groupOtpSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
  });

  it("leaves a shorter last group and ignores spaces already there", () => {
    expect(groupOtpSecret("ABCD EFGH IJ")).toBe("ABCD EFGH IJ");
    expect(groupOtpSecret("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
  });

  it("returns an empty string for an empty secret", () => {
    expect(groupOtpSecret("")).toBe("");
  });
});
