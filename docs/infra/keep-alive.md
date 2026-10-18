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
This keeps the endpoint off the Vercel Cron budget, which `apps/web/vercel.json`
already spends on `streak-reset`, `review-reminders` and `season-rollover`. An
external caller also keeps the ping working on the day a Vercel deploy is the
thing that is broken.

## Setup cron externe

Configured manually on https://cron-job.org:

- **URL**: `https://www.cyberlearn.fr/api/cron/keep-alive`
- **Method**: GET
- **Schedule**: every 6 hours (`0 */6 * * *`)
- **Header**: `Authorization: Bearer ${CRON_SECRET}`
- **Notifications**: email on failure (3 consecutive)
- **Timezone**: UTC

## Console

Each run is recorded in the audit log under `cron.keep-alive`: the two
statuses, and, when a service did not answer, which one ("Postgres ne répond
pas"). `/system/crons` in the console calls the job late once more than six
hours and the hour of grace have gone by since its last run. It judges the
gap rather than the UTC times of `0 */6 * * *`, so a job left on another time
zone on cron-job.org is not reported late for half of every day.

## Auth

The endpoint checks `Authorization: Bearer $CRON_SECRET`. Any HTTP client (Vercel Cron,
cron-job.org, curl) works as long as it sends the correct header.
Set `CRON_SECRET` in Vercel environment variables (generate with `openssl rand -hex 32`).

## Cost impact

- cron-job.org: free tier, 0 cost.
- Upstash: 4 GET commands/day = ~120/month, negligible vs. 10k/day free quota.
- Supabase: 4 `SELECT 1` queries/day, negligible.
