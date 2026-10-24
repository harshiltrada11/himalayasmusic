# BeatNest

## Update the existing GitHub repository
Upload/replace these project files in your repository. Do not delete `songs.json`; it is the starter catalogue. The website reads both `songs.json` and `catalog.json`.

## YouTube API setup
1. In GitHub: Settings → Secrets and variables → Actions → add `YOUTUBE_API_KEY`.
2. Keep the key secret; never place it in `app.js` or `index.html`.
3. In Actions, run **Historical song backfill** once. It attempts up to 100 Hindi, 50 English, 30 Gujarati, and 20 songs across other languages, within an 8,000-unit safety budget. Actual counts depend on YouTube results, duplicate checks, availability, and filtering.
4. **Daily songs** runs around 12:00 AM India time and continues finding recent uploads. GitHub schedule start times can be delayed.

## Historical-song caveat
YouTube search results are candidate videos. Search phrases bias results toward classic/older music but do not prove the original song release year. Entries from the backfill are marked `catalogType: historical-candidate`; check dates/source details when exact release year matters.

## Quality filtering
The fetcher rejects common low-quality edits such as DJ remix, bass-boosted, 8D, nightcore, sped-up, slowed/reverb, bootleg and mashup titles. Official-looking title/channel metadata is only a signal, not proof of an official upload.

## Mood playlists
The Mood tab is included in navigation. Mood mixes are generated locally without extra YouTube API quota and show up to 25 unique tracks each once at least 25 songs are available in the combined catalogue.


## Privacy and YouTube API compliance pages
- `privacy.html`, `terms.html`, `data-deletion.html`, and `contact.html` are linked in the homepage footer.
- **Before deployment, replace every `REPLACE-WITH-YOUR-CONTACT-EMAIL` placeholder with a real email address you control.** Verify that the descriptions match the deployed site and update the policy if the data practices change.
- After deployment, use the full public URLs for `privacy.html` and the homepage in the YouTube API form.
- Capture the requested screenshots only after the live site shows these pages and the footer. The YouTube-style play mark and text are a simple indicator, not an official endorsement or affiliation.
- Do not claim the quota request is approved until Google confirms it.

## BeatNest UI updates
- Hindi catalogue entries are shown only when the channel/artist metadata matches a configured official label/channel allowlist. This is a metadata heuristic, not a guarantee; review results before publishing.
- General chart-compilation titles such as Top 10/Top 50/Top 100 are filtered from the song catalogue UI.
- Made for You and Daily Mix use Hindi and English tracks only.
- Brazilian Phonk discovery targets 10 new candidates per daily run: 5 popular/relevant candidates from the last five years, 3 current-trend candidates, and 2 newly uploaded candidates. YouTube does not guarantee popularity or release-date accuracy, so these are search-based candidates, not verified rankings.
- Brazilian Phonk mood page shows all matching catalogue tracks rather than the standard 25-track mood limit.
- The player includes a volume slider; playlist-add controls are available on track rows and cards.
- Daily workflow schedule is set to 00:00 India time (GitHub Actions may start late).
