# Himalaya Music
Update: replace the old files in your GitHub repo with these (same names), commit -> Vercel redeploys by itself.
Setup (one time):
1. Vercel -> Settings -> Environment Variables: YT_API_KEY = your key (optional REGIONS = IN or IN,US). Redeploy.
2. GitHub repo -> Settings -> Secrets and variables -> Actions -> New secret: YT_API_KEY = same key.
3. GitHub repo -> Actions -> "Daily songs" -> Run workflow (fills ~2000+ songs in all languages; runs again every day).
Never put the key inside app.js/index.html.
