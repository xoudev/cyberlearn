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

It shows the web platform through **screenshots of the real components**, in
`public/screens/`. The first version drew them by hand; that was wrong. A video
recruiting testers has to show what they will actually get, and a drawing stops
matching the product the moment somebody moves a button — with nobody to notice.

## Regenerating the screenshots

The captures come from `apps/web/app/shotcapture/page.tsx`, a development-only
route that mounts the product's own components with the product's own CSS
against sample data. It refuses to render in a production build.

```bash
pnpm --filter @cyberlearn/web dev            # then open /shotcapture
```

Capture the three elements `#cap-paths`, `#cap-quiz` and `#cap-class` at
1440 px wide and `deviceScaleFactor: 2`, dismiss the cookie banner first, and
hide the dev overlay (`nextjs-portal { display: none }`) — it floats over the
bottom-left of every clip. Write them to `apps/marketing/public/screens/` and
update the pixel sizes in `src/components/browser.tsx`, which uses them so
nothing is stretched.

The sample data uses invented names on purpose: a real class roster on a public
video publishes real students' names, and most of them are minors.

Recapture when a screen changes enough that the video misrepresents it. That is
a smaller job than noticing a drawing has drifted, which never happens.

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
