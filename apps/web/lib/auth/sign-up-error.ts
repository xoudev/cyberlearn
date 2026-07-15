interface SignUpErrorLike {
  code?: string | undefined;
  status?: number | undefined;
}

export type SignUpFailure = "email_rate_limit" | "invalid_email" | "unknown";

export function classifySignUpError(error: SignUpErrorLike): SignUpFailure {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "email_rate_limit";
  }

  if (error.code === "email_address_invalid") {
    return "invalid_email";
  }

  return "unknown";
}
