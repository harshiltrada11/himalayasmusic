# BeatNest workflow update

## Daily mixed catalogue
The `Daily songs and historical mix` GitHub Actions workflow runs daily at 1:00 PM India Standard Time (cron `30 7 * * *`, UTC). GitHub may delay scheduled runs.

Daily best-effort targets:
- Hindi: 100 additions (10 recent-upload candidates + 90 older/historical candidates)
- English: 50 additions (5 recent-upload candidates + 45 older/historical candidates)
- Gujarati: 30 additions (3 recent-upload candidates + 27 older/historical candidates)
- Other languages: 20 total additions (2 recent-upload candidates + 18 older/historical candidates, rotating across configured languages)

This is a 1:9 recent-to-older target ratio. Actual additions may be lower because of duplicate filtering, search results, video availability, API quota, or YouTube restrictions. The daily script writes to `catalog.json` and attempts to avoid duplicates using video IDs and normalized title/artist.

## Release-age limitation
The script searches for phrases related to 1 month, 2 months, 6 months, 1 year, 2 years, 3 years, 5 years, 10 years, 15 years, 20 years, 40 years and 50 years ago. However, YouTube Data API's published timestamp is the video upload date, not a reliable official song-release date. `releaseEra` is a search hint, not a verified release date. Check official sources if exact song release ages matter.

## Existing Historical song backfill
Keep `.github/workflows/backfill.yml` manual (`workflow_dispatch`) for an optional one-time initial historical fill. Do not schedule it daily: the daily script now includes historical candidates and runs against the same catalogue.

## Secret
In GitHub, go to Settings → Secrets and variables → Actions and ensure `YOUTUBE_API_KEY` exists. Keep the API key secret; do not put it in frontend files.

## Quota
YouTube Data API search requests cost 100 units each. The daily script has a 9,000-unit safety budget, but it cannot bypass YouTube's daily quota. A successful workflow can add fewer songs than the targets.
