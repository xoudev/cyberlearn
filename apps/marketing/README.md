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
- five 1080 × 1920 phone screenshots;
- a 24-second 1920 × 1080 H.264 promo video.
