# Glassify – deploy on Vercel
1. Upload all these files to a new GitHub repo (index.html must be in the repo root).
2. Vercel → Add New Project → import that repo → Deploy (no build settings needed).
3. Vercel → Project → Settings → Environment Variables:
   - `YT_API_KEY` = your YouTube Data API v3 key
   - `REGIONS` (optional) = `IN` or `IN,US` (each region costs 1 quota unit per refresh)
4. Redeploy. The daily songs come from `/api/trending` (cached 24h on Vercel).
Never put the API key in app.js / index.html.
Add your own permanent songs in songs.json: {"id":"<YouTube video id>","t":"Title","a":"Artist","al":"Album","l":"hi"}
