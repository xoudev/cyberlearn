/**
 * The mock exam's addresses. Its presentation is a window on the path's page
 * (`/paths/<slug>?mock=1`); its page runs the exam and is only reached
 * started (`/paths/<slug>/mock-exam?go=1`). The page without `go` redirects
 * to the window (next.config.ts), so a bookmark never starts the clock; so
 * does the page itself when the router brings it back without a request
 * (Back, Forward), which the redirect never sees (mock-exam-flow.tsx).
 */

/** The parameter that opens the window on the path's page: `?mock=1`. */
export const MOCK_QUERY = "mock";

/** The parameter that starts the exam as its page opens: `?go=1`. */
export const MOCK_GO = "go";

/** The window on the path's page: what the exam covers, the attempts, "Commencer". */
export function mockWindowHref(slug: string): string {
  return `/paths/${slug}?${MOCK_QUERY}=1`;
}

/** The exam's page, the exam started (or the one running taken up again). */
export function mockExamStartHref(slug: string): string {
  return `/paths/${slug}/mock-exam?${MOCK_GO}=1`;
}
