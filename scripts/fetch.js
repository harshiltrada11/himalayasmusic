// scripts/fetch.js
// Daily job: YouTube se naye songs laata hai aur data/songs.json mein add karta hai.
// Hindi + English: roz 100 naye songs. Baaki languages: roz 10 naye songs.
// Node 20 mein fetch built-in hai, koi npm package nahi chahiye.

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.YOUTUBE_API_KEY;
const SONGS_FILE = path.join(__dirname, "..","catalog.json");

// ===== SETTINGS (yahan se badlo) =====
const HIGH_TARGET = 100; // Hindi aur English: roz itne naye songs
const LOW_TARGET = 10; // baaki languages: roz itne naye songs
const DAYS_BACK = 3; // pichle kitne din ke songs dekhne hain
const QUOTA_BUDGET = 9500; // roz ka max quota (free limit 10,000)
const MAX_SONGS = 20000; // songs.json mein max itne songs (sabse purane hat jaate hain)
const MIN_SECONDS = 90; // isse chhote videos (Shorts) nahi
const MAX_SECONDS = 600; // 10 minute se lambe videos nahi

// Hindi aur English ke liye bahut saari queries, taaki 100 songs mil sakein
const HIGH = [
  {
    language: "Hindi",
    queries: [
      "new hindi songs",
      "latest bollywood songs",
      "hindi romantic songs",
      "hindi party songs",
      "hindi sad songs",
      "hindi lofi songs",
      "bollywood movie songs official video",
      "hindi pop songs",
    ],
  },
  {
    language: "English",
    queries: [
      "new english songs",
      "latest pop songs",
      "english rap songs",
      "english rock songs",
      "english edm songs",
      "english acoustic songs",
      "official music video",
      "english r&b songs",
    ],
  },
];

// Baaki languages (ek query kaafi hai, 10 songs = 2 pages)
const LOW = [
  ["Gujarati", "new gujarati songs"],
  ["Punjabi", "new punjabi songs"],
  ["Marathi", "new marathi songs"],
  ["Bengali", "new bengali songs"],
  ["Tamil", "new tamil songs"],
  ["Telugu", "new telugu songs"],
  ["Kannada", "new kannada songs"],
  ["Malayalam", "new malayalam songs"],
  ["Bhojpuri", "new bhojpuri songs"],
  ["Haryanvi", "new haryanvi songs"],
  ["Rajasthani", "new rajasthani songs"],
  ["Urdu", "new urdu songs"],
  ["Nepali", "new nepali songs"],
  ["Spanish", "new spanish songs"],
  ["Portuguese", "new portuguese songs"],
  ["French", "new french songs"],
  ["German", "new german songs"],
  ["Italian", "new italian songs"],
  ["Korean", "new korean songs kpop"],
  ["Japanese", "new japanese songs jpop"],
  ["Chinese", "new mandarin songs"],
  ["Arabic", "new arabic songs"],
  ["Turkish", "new turkish songs"],
  ["Russian", "new russian songs"],
  ["Indonesian", "new indonesian songs"],
  ["Thai", "new thai songs"],
  ["Vietnamese", "new vietnamese songs"],
  ["Filipino", "new filipino songs"],
  ["Persian", "new persian songs"],
  ["Polish", "new polish songs"],
  ["Dutch", "new dutch songs"],
  ["Greek", "new greek songs"],
  ["Swahili", "new swahili songs"],
].map(([language, q]) => ({ language, queries: [q] }));

// ===== QUOTA TRACKING =====
let quotaUsed = 0;
class QuotaError extends Error {}

async function api(endpoint, params, cost) {
  if (quotaUsed + cost > QUOTA_BUDGET) {
    throw new QuotaError("Aaj ka quota budget khatam");
  }
  quotaUsed += cost;

  const query = new URLSearchParams({ ...params, key: API_KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
  const data = await res.json();

  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new QuotaError("YouTube ka daily quota khatam");
    }
    throw new Error(`YouTube API error: ${data.error?.message || res.status}`);
  }
  return data;
}

// ===== HELPERS =====
function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toSeconds(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

// Videos ki length nikalta hai (1 quota unit per 50 videos)
async function getDurations(ids) {
  const data = await api(
    "videos",
    { part: "contentDetails", id: ids.join(",") },
    1
  );
  const map = {};
  for (const v of data.items || []) {
    map[v.id] = toSeconds(v.contentDetails?.duration);
  }
  return map;
}

// Ek language ke naye songs laata hai jab tak target na poora ho
async function collect({ language, queries }, target, songs, seen, publishedAfter) {
  let added = 0;

  for (const q of queries) {
    let pageToken;

    while (added < target) {
      const params = {
        part: "snippet",
        q,
        type: "video",
        videoCategoryId: "10", // Music
        videoEmbeddable: "true", // sirf wahi jo tumhari site pe chal sakein
        order: "viewCount",
        publishedAfter,
        maxResults: "50",
      };
      if (pageToken) params.pageToken = pageToken;

      const data = await api("search", params, 100);

      const items = (data.items || []).filter(
        (i) => i.id?.videoId && !seen.has(i.id.videoId)
      );

      if (items.length) {
        const durations = await getDurations(items.map((i) => i.id.videoId));

        for (const item of items) {
          const id = item.id.videoId;
          const sec = durations[id] || 0;
          if (sec < MIN_SECONDS || sec > MAX_SECONDS) continue;

          seen.add(id);
          songs.push({
            id,
            title: decode(item.snippet.title),
            artist: decode(item.snippet.channelTitle),
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              "",
            language,
            addedAt: new Date().toISOString(),
          });
          added++;
          if (added >= target) break;
        }
      }

      pageToken = data.nextPageToken;
      if (!pageToken) break; // is query ke aur results nahi
    }

    if (added >= target) break;
  }

  return added;
}

// ===== MAIN =====
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
  const before = songs.length;

  const publishedAfter = new Date(
    Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000
  ).toISOString();

  // Baaki languages roz alag order mein, taaki quota kam pade to bhi sabka number aaye
  const day = Math.floor(Date.now() / 86400000);
  const offset = day % LOW.length;
  const lowRotated = LOW.slice(offset).concat(LOW.slice(0, offset));

  const plan = [
    ...HIGH.map((cfg) => ({ cfg, target: HIGH_TARGET })),
    ...lowRotated.map((cfg) => ({ cfg, target: LOW_TARGET })),
  ];

  const report = [];
  let failed = 0;

  for (const { cfg, target } of plan) {
    const start = songs.length;
    try {
      await collect(cfg, target, songs, seen, publishedAfter);
      report.push(`${cfg.language}: ${songs.length - start}`);
    } catch (err) {
      report.push(`${cfg.language}: ${songs.length - start}`);
      if (err instanceof QuotaError) {
        console.warn(`${err.message}. ${cfg.language} ke baad ki languages skip.`);
        break;
      }
      failed++;
      console.warn(`Skip ${cfg.language}: ${err.message}`);
    }
  }

  if (failed === plan.length) {
    throw new Error("Saari languages fail hui. API key ya quota check karo.");
  }

  // File bahut badi na ho, isliye sabse purane songs hatao
  if (songs.length > MAX_SONGS) songs = songs.slice(-MAX_SONGS);

  fs.mkdirSync(path.dirname(SONGS_FILE), { recursive: true });
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs));

  console.log(report.join(" | "));
  console.log(
    `Done. ${songs.length - before} naye songs. Total: ${songs.length}. Quota use: ${quotaUsed}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
