import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { describe, expect, it } from "vitest";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Instagram's in-app webview on Pixel devices appends "Google/google" to its
// device descriptor, which would otherwise trip the generic "google" entry in
// UA_BOTS – this is the false positive UA_FALSE_POSITIVES exists for.
const INSTAGRAM_WEBVIEW_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ2A.230505.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 Instagram 315.0.0.24.108 Android (33/13; 420dpi; 1080x2201; Google/google; Pixel 7; panther; panther; en_US; 536441360)";

const buildRequest = ({
  url = "https://dub.sh/test",
  method = "GET",
  headers = {},
}: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}) => new Request(url, { method, headers });

describe("detectBot", () => {
  it("returns false for a regular browser request", () => {
    expect(
      detectBot(buildRequest({ headers: { "user-agent": BROWSER_UA } })),
    ).toBe(false);
  });

  it("detects bots by user agent", () => {
    expect(
      detectBot(
        buildRequest({
          headers: {
            "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
          },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(buildRequest({ headers: { "user-agent": "curl/8.4.0" } })),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({ headers: { "user-agent": INSTAGRAM_WEBVIEW_UA } }),
      ),
    ).toBe(false);
  });

  it("detects HEAD requests and ?bot=1", () => {
    expect(
      detectBot(
        buildRequest({ method: "HEAD", headers: { "user-agent": BROWSER_UA } }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          url: "https://dub.sh/test?bot=1",
          headers: { "user-agent": BROWSER_UA },
        }),
      ),
    ).toBe(true);
  });

  it("detects bots by referer when the user agent looks like a browser", () => {
    expect(
      detectBot(
        buildRequest({
          headers: {
            "user-agent": BROWSER_UA,
            referer: "https://url.emailprotection.link/?abc",
          },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          headers: {
            "user-agent": BROWSER_UA,
            referer: "https://statics.teams.cdn.office.net/evergreen-assets/",
          },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          headers: {
            "user-agent": BROWSER_UA,
            referer: "https://example.com/blog",
          },
        }),
      ),
    ).toBe(false);
  });

  it("detects bots by exact IP when the user agent looks like a browser", () => {
    expect(
      detectBot(
        buildRequest({
          headers: { "user-agent": BROWSER_UA, "x-real-ip": "52.112.74.60" },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          headers: { "user-agent": BROWSER_UA, "x-real-ip": "127.0.0.1" },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          headers: { "user-agent": BROWSER_UA, "x-real-ip": "8.8.8.8" },
        }),
      ),
    ).toBe(false);
  });

  it("detects bots by IP range when the user agent looks like a browser", () => {
    expect(
      detectBot(
        buildRequest({
          headers: { "user-agent": BROWSER_UA, "x-real-ip": "159.148.128.10" },
        }),
      ),
    ).toBe(true);
    expect(
      detectBot(
        buildRequest({
          headers: { "user-agent": BROWSER_UA, "x-real-ip": "159.148.129.10" },
        }),
      ),
    ).toBe(false);
  });

  it("falls through to the IP checks when there is no user agent", () => {
    expect(
      detectBot(buildRequest({ headers: { "x-real-ip": "52.112.74.60" } })),
    ).toBe(true);
    expect(
      detectBot(buildRequest({ headers: { "x-real-ip": "159.148.128.10" } })),
    ).toBe(true);
    expect(detectBot(buildRequest({}))).toBe(false);
  });
});
