import { describe, expect, it } from "vitest";
import { browserLabel, pageReportBlock, pageReportSchema } from "../page-report";

/** What « Signaler un souci » sends with a request, and how it reads. */

const UA = {
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
};

describe("browserLabel", () => {
  it("names the browser and its system, the more specific first", () => {
    expect(browserLabel(UA.firefoxLinux)).toBe("Firefox sur Linux");
    expect(browserLabel(UA.chromeWindows)).toBe("Chrome sur Windows");
    // Edge says "Chrome" and "Safari" too.
    expect(browserLabel(UA.edgeWindows)).toBe("Edge sur Windows");
    // An iPhone says "Mac OS X"; Android says "Linux".
    expect(browserLabel(UA.safariIphone)).toBe("Safari sur iOS");
    expect(browserLabel(UA.chromeAndroid)).toBe("Chrome sur Android");
  });

  it("is null for what it does not recognise", () => {
    expect(browserLabel("curl/8.5.0")).toBeNull();
  });
});

describe("pageReportSchema", () => {
  it("takes a bare path and a screen", () => {
    expect(
      pageReportSchema.safeParse({ page: "/paths/cyber", width: 375, height: 812 }).success,
    ).toBe(true);
  });

  it("refuses a query, a fragment, an address elsewhere or a size that is not one", () => {
    for (const page of ["/reset?token=x", "/notes#n-1", "https://example.org/", "notes", "/a b"]) {
      expect(pageReportSchema.safeParse({ page, width: 375, height: 812 }).success).toBe(false);
    }
    expect(pageReportSchema.safeParse({ page: "/", width: 0, height: 812 }).success).toBe(false);
    expect(pageReportSchema.safeParse({ page: "/", width: 1.5, height: 812 }).success).toBe(false);
  });
});

describe("pageReportBlock", () => {
  it("lists the page, the screen and the browser under the message", () => {
    expect(pageReportBlock({ page: "/dashboard", width: 1440, height: 900 }, UA.firefoxLinux)).toBe(
      "\n\nEnvoyé depuis le site :\nPage : /dashboard\nÉcran : 1440 × 900\nNavigateur : Firefox sur Linux",
    );
  });

  it("leaves out a browser it cannot name", () => {
    expect(pageReportBlock({ page: "/", width: 375, height: 812 }, null)).not.toContain(
      "Navigateur",
    );
  });
});
