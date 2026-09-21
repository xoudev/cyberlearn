# CyberLearn marketing renders

Remotion compositions for the Google Play listing and the Android launch video.

## Preview

```bash
pnpm --filter @cyberlearn/marketing studio
```

## Render

Run the `render:*` scripts from `apps/marketing/package.json`. Outputs are written to `apps/marketing/dist/` and are intentionally ignored by Git.

The promotional soundtrack is synthesized locally by `audio:generate`. It is original, deterministic, and does not rely on third-party music or samples.

The tracked compositions generate:

- a 512 × 512 Play Store icon;
- a 1024 × 500 Play Store feature graphic;
- five 1080 × 1920 phone screenshots (home, paths, lesson, profile, locker);
- a 2560 × 1440 YouTube channel banner and a 1280 × 720 thumbnail;
- a 28.5-second 1920 × 1080 H.264 promo video (855 frames at 30 fps);
- a 21.5-second 1080 × 1080 H.264 cut for a LinkedIn post (645 frames at 30 fps).

Every composition is declared in `src/root.tsx`, which is where the real
dimensions live if this list ever drifts.

## Two videos, two jobs

`PromoVideo` is the Play Store trailer: 16:9, phone mockups, an original
soundtrack, and it ends on a download.

`LinkedInVideo` is not a resize of it. LinkedIn's feed is a column read mostly
on a phone, so a 16:9 gets a third of the height a square does — hence 1:1. It
autoplays muted and most people never unmute, so every beat is written to read
with the sound off and there is no soundtrack at all: a track nobody hears is
bytes. And it asks for testers rather than installs, so it ends on the two doors
somebody can walk through — an account on the site, and the Android test
channel.

It shows the web platform, drawn in `src/components/web-screens.tsx` the same
way the phone screens are drawn in `src/components/screens.tsx`. Screenshotting
the real site would need a signed-in session and a seeded database inside the
render. The rule for both files is the same: the words on screen are the
product's own words, so the video sells the thing that exists.

## Rendering behind a restricted network

Remotion downloads its own Chrome Headless Shell on the first render. Where that
download is blocked, point it at a Chromium you already have:

```bash
pnpm --filter @cyberlearn/marketing exec remotion render src/index.tsx \
  LinkedInVideo dist/cyberlearn-linkedin.mp4 --codec=h264 \
  --browser-executable=/path/to/chrome-headless-shell
```

It has to be the **headless shell**, not a full Chrome binary: Remotion passes
the old headless flags, which a normal Chrome has stopped accepting.
