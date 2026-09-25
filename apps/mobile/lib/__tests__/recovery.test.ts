import { afterEach, describe, expect, it } from "vitest";
import {
  clearRecoveryPending,
  isRecoveryCode,
  isRecoveryPending,
  markRecoveryPending,
  recoveryCodeInput,
  signedInRoute,
} from "../recovery";

afterEach(() => {
  clearRecoveryPending();
});

describe("choosing a new password in the app", () => {
  it("sends a recovering session to the reset screen, any other one home", () => {
    expect(signedInRoute()).toBe("/home");
    markRecoveryPending();
    expect(isRecoveryPending()).toBe(true);
    expect(signedInRoute()).toBe("/reset-password");
    clearRecoveryPending();
    expect(signedInRoute()).toBe("/home");
  });

  it("keeps digits only from what is typed or pasted", () => {
    expect(recoveryCodeInput(" 123 456 ")).toBe("123456");
    expect(recoveryCodeInput("12-34-56-78-90-12")).toBe("1234567890");
  });

  it("accepts the code lengths Supabase sends, and nothing else", () => {
    expect(isRecoveryCode("123456")).toBe(true);
    expect(isRecoveryCode("1234567890")).toBe(true);
    expect(isRecoveryCode("12345")).toBe(false);
    expect(isRecoveryCode("12345a")).toBe(false);
  });
});
