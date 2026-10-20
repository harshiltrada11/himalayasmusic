// scripts/fetch.js
// Daily job: YouTube se naye songs laata hai aur data/songs.json mein add karta hai.
// Node 20 mein fetch built-in hai, koi npm package nahi chahiye.

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.YOUTUBE_API_KEY;
const SONGS_FILE = path.join(__dirname, "..", "data", "songs.json");

// Kis language ke kitne songs roz laane hain
const QUERIES = [
  { language: "Hindi", q: "new hindi songs" },
  { language: "English", q: "new english songs" },
  { language: "Gujarati", q: "new gujarati songs" },
  { language: "Punjabi", q: "new punjabi songs" },
];
const PER_QUERY = 10;
const DAYS_BACK = 7;

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchSongs({ language, q }) {
  const publishedAfter = new Date(
    Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000
  ).toISOString();

  const params = new URLSearchParams({
    part: "snippet",
    q,
    type: "video",
    videoCategoryId: "10", // Music
    videoDuration: "medium", // Shorts hat jaate hain
    order: "viewCount",
    publishedAfter,
    maxResults: String(PER_QUERY),
    key: API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `YouTube API error (${language}): ${data.error?.message || res.status}`
    );
  }

  return (data.items || []).map((item) => ({
    id: item.id.videoId,
    title: decode(item.snippet.title),
    artist: decode(item.snippet.channelTitle),
    thumbnail:
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      "",
    language,
    addedAt: new Date().toISOString(),
  }));
}

async function main() {
  if (!API_KEY) {
    throw new Error(
      "YOUTUBE_API_KEY nahi mila. GitHub repo Settings > Secrets and variables > Actions mein add karo."
    );
  }

  // Purane songs load karo (file na ho to khaali list)
  let songs = [];
  if (fs.existsSync(SONGS_FILE)) {
    songs = JSON.parse(fs.readFileSync(SONGS_FILE, "utf8"));
  }
  const seen = new Set(songs.map((s) => s.id));

  let added = 0;
  for (const query of QUERIES) {
    const results = await searchSongs(query);
    for (const song of results) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        songs.push(song);
        added++;
      }
    }
  }

  fs.mkdirSync(path.dirname(SONGS_FILE), { recursive: true });
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));
  console.log(`Done. ${added} naye songs add hue. Total: ${songs.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
