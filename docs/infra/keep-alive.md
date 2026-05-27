# Keep-alive cron

## Purpose

Keeps Supabase Postgres and Upstash Redis warm in the absence of user traffic.
Without this, Supabase Free pauses the database after 7 days of inactivity, breaking the app.

## Endpoint

`GET /api/cron/keep-alive`

Protected by `Authorization: Bearer $CRON_SECRET`. Returns JSON:

```json
{ "timestamp": "...", "postgres": "ok", "redis": "ok" }
```

Each service status is `"ok"` | `"error"` | `"unknown"` (unknown = Redis not configured).

## Schedule

Triggered every 6 hours by an external cron on cron-job.org (free tier, 50 crons max).
This keeps the endpoint off the Vercel Cron budget (Hobby = 2 internal crons max, both
already used by `streak-reset` and `review-reminders`).

## Setup cron externe

Configured manually on https://cron-job.org:

- **URL**: `https://www.cyberlearn.fr/api/cron/keep-alive`
- **Method**: GET
- **Schedule**: every 6 hours (`0 */6 * * *`)
- **Header**: `Authorization: Bearer ${CRON_SECRET}`
- **Notifications**: email on failure (3 consecutive)
- **Timezone**: UTC

## Auth

The endpoint checks `Authorization: Bearer $CRON_SECRET`. Any HTTP client (Vercel Cron,
cron-job.org, curl) works as long as it sends the correct header.
Set `CRON_SECRET` in Vercel environment variables (generate with `openssl rand -hex 32`).

## Cost impact

- cron-job.org: free tier, 0 cost.
- Upstash: 4 GET commands/day = ~120/month, negligible vs. 10k/day free quota.
- Supabase: 4 `SELECT 1` queries/day, negligible.
