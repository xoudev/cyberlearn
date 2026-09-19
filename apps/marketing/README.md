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
- a 24-second 1920 × 1080 H.264 promo video (720 frames at 30 fps).

Every composition is declared in `src/root.tsx`, which is where the real
dimensions live if this list ever drifts.
