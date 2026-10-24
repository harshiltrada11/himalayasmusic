// Daily BeatNest discovery: best-effort target of 200 unique additions/day.
// Targets: Hindi 100 (10 recent + 90 older candidates), English 50 (5 + 45),
// Gujarati 30 (3 + 27), other configured languages 20 total (2 + 18).
// YouTube search cannot verify original song release dates; releaseEra is a query hint.
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.YOUTUBE_API_KEY;
const FILE = path.join(__dirname, '..', 'catalog.json');
const QUOTA_BUDGET = Math.min(Number(process.env.QUOTA_BUDGET || 9000), 9500);
const DAYS_BACK = 7;
const MIN_SECONDS = 90;
const MAX_SECONDS = 600;
const MAX_SONGS = 20000;

const BLOCKED = [
  /\bbass[\s-]*boosted\b/i, /\b8d audio\b/i, /\bnightcore\b/i,
  /\bslowed\s*(?:\+|&|and)\s*reverb\b/i, /\bsped[\s-]*up\b/i,
  /\btiktok remix\b/i, /\bdj remix\b/i, /\bfull dj song\b/i,
  /\bbootleg\b/i, /\bmashup\b/i, /\blofi remix\b/i
];
const LANGUAGES = [
  ['Punjabi', 'Punjabi'], ['Marathi', 'Marathi'], ['Bengali', 'Bengali'],
  ['Tamil', 'Tamil'], ['Telugu', 'Telugu'], ['Kannada', 'Kannada'],
  ['Malayalam', 'Malayalam'], ['Bhojpuri', 'Bhojpuri'], ['Haryanvi', 'Haryanvi'],
  ['Rajasthani', 'Rajasthani'], ['Urdu', 'Urdu'], ['Nepali', 'Nepali'],
  ['Spanish', 'Spanish'], ['Portuguese', 'Portuguese'], ['French', 'French'],
  ['German', 'German'], ['Italian', 'Italian'], ['Korean', 'Korean'],
  ['Japanese', 'Japanese'], ['Chinese', 'Mandarin'], ['Arabic', 'Arabic'],
  ['Turkish', 'Turkish'], ['Russian', 'Russian'], ['Indonesian', 'Indonesian'],
  ['Thai', 'Thai'], ['Vietnamese', 'Vietnamese'], ['Filipino', 'Filipino'],
  ['Persian', 'Persian'], ['Polish', 'Polish'], ['Dutch', 'Dutch'],
  ['Greek', 'Greek'], ['Swahili', 'Swahili']
];
const ERA_BUCKETS = [
  { id: '1-month', label: 'about 1 month ago', months: 1 },
  { id: '2-months', label: 'about 2 months ago', months: 2 },
  { id: '6-months', label: 'about 6 months ago', months: 6 },
  { id: '1-year', label: 'about 1 year ago', years: 1 },
  { id: '2-years', label: 'about 2 years ago', years: 2 },
  { id: '3-years', label: 'about 3 years ago', years: 3 },
  { id: '5-years', label: 'about 5 years ago', years: 5 },
  { id: '10-years', label: 'about 10 years ago', years: 10 },
  { id: '15-years', label: 'about 15 years ago', years: 15 },
  { id: '20-years', label: 'about 20 years ago', years: 20 },
  { id: '40-years', label: 'about 40 years ago', years: 40 },
  { id: '50-years', label: 'about 50 years ago', years: 50 }
];
let quotaUsed = 0;
class QuotaError extends Error {}

function decode(s = '') {
  return String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function norm(s = '') {
  return String(s).toLowerCase().replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function seconds(iso = '') {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}
function titleKey(song) {
  return norm(`${song.title || song.t || ''} ${song.artist || song.a || ''}`);
}
function monthYearAgo(monthsAgo) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }) + ' ' + d.getUTCFullYear();
}
function eraQueries(language, bucket) {
  if (bucket.months) {
    const month = monthYearAgo(bucket.months);
    return [
      `${language} songs released ${month} official audio`,
      `${language} hit songs ${month} original songs`
    ];
  }
  const year = new Date().getUTCFullYear() - bucket.years;
  return [
    `${language} songs released ${year} official audio`,
    `${language} hit songs ${year} original soundtrack`
  ];
}
async function api(endpoint, params, cost) {
  if (quotaUsed + cost > QUOTA_BUDGET) throw new QuotaError(`Quota safety budget reached (${quotaUsed}/${QUOTA_BUDGET})`);
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries({ ...params, key: API_KEY }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  quotaUsed += cost;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') throw new QuotaError('YouTube daily quota reached');
    throw new Error(data.error?.message || `YouTube API error ${res.status}`);
  }
  return data;
}
async function videoDetails(ids) {
  const map = {};
  for (let i = 0; i < ids.length; i += 50) {
    const data = await api('videos', { part: 'contentDetails,status', id: ids.slice(i, i + 50).join(',') }, 1);
    for (const v of data.items || []) {
      if (v.status?.embeddable !== false) map[v.id] = seconds(v.contentDetails?.duration);
    }
  }
  return map;
}
async function collectQuery({ language, query, target, kind, era, publishedAfter, order, songs, ids, keys }) {
  let added = 0;
  if (target <= 0) return 0;
  const params = {
    part: 'snippet', q: query, type: 'video', videoCategoryId: '10',
    videoEmbeddable: 'true', order: order || (kind === 'new' ? 'date' : 'relevance'), maxResults: '50'
  };
  if (publishedAfter) params.publishedAfter = publishedAfter;
  const data = await api('search', params, 100);
  const candidates = (data.items || []).filter(v => {
    const id = v.id?.videoId;
    const title = decode(v.snippet?.title || '');
    return id && !ids.has(id) && !BLOCKED.some(re => re.test(title));
  });
  const dm = await videoDetails(candidates.map(v => v.id.videoId));
  for (const v of candidates) {
    if (added >= target) break;
    const id = v.id.videoId;
    const title = decode(v.snippet?.title || '');
    const artist = decode(v.snippet?.channelTitle || '');
    const duration = dm[id] || 0;
    const key = norm(`${title} ${artist}`);
    if (duration < MIN_SECONDS || duration > MAX_SECONDS || keys.has(key)) continue;
    ids.add(id); keys.add(key);
    songs.push({
      id, title, artist,
      thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
      language, addedAt: new Date().toISOString(),
      catalogType: kind === 'new' ? 'recent-candidate' : 'historical-candidate',
      ...(language === 'Brazilian Phonk' ? { genre: 'brazilian-phonk' } : {}),
      releaseEra: era || 'recent upload; release date unverified',
      youtubePublishedAt: v.snippet?.publishedAt || null
    });
    added++;
  }
  return added;
}
async function collectBucket(language, bucket, target, songs, ids, keys, queryLanguage = language) {
  let added = 0;
  for (const query of eraQueries(queryLanguage, bucket)) {
    if (added >= target) break;
    added += await collectQuery({
      language, query, target: target - added, kind: 'old', era: bucket.label,
      songs, ids, keys
    });
  }
  return added;
}
async function collectHistorical(language, target, songs, ids, keys, rotate = 0, queryLanguage = language) {
  let added = 0;
  const buckets = ERA_BUCKETS.slice(rotate).concat(ERA_BUCKETS.slice(0, rotate));
  const perBucket = Math.floor(target / buckets.length);
  let remainder = target % buckets.length;
  for (const bucket of buckets) {
    if (added >= target) break;
    const need = perBucket + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    if (!need) continue;
    added += await collectBucket(language, bucket, Math.min(need, target - added), songs, ids, keys, queryLanguage);
  }
  return added;
}
async function collectRecent(language, target, songs, ids, keys, queryLanguage = language) {
  const after = new Date(Date.now() - DAYS_BACK * 86400000).toISOString();
  const queries = [
    `new ${queryLanguage} songs official`, `latest ${queryLanguage} songs official audio`,
    `${queryLanguage} new music video official`
  ];
  let added = 0;
  for (const query of queries) {
    if (added >= target) break;
    added += await collectQuery({ language, query, target: target - added, kind: 'new', era: 'uploaded in last 7 days; original release date unverified', publishedAfter: after, songs, ids, keys });
  }
  return added;
}
async function main() {
  if (!API_KEY) throw new Error('YOUTUBE_API_KEY secret missing. Add it in Settings > Secrets and variables > Actions.');
  let songs = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];
  const before = songs.length;
  const ids = new Set(songs.map(s => s.id).filter(Boolean));
  const keys = new Set(songs.map(titleKey).filter(Boolean));
  const report = [];
  const day = Math.floor(Date.now() / 86400000);
  const year = new Date().getUTCFullYear();
  const major = [
    { language: 'Hindi', total: 100, recent: 10 },
    { language: 'English', total: 50, recent: 5 },
    { language: 'Gujarati', total: 30, recent: 3 }
  ];
  try {
    for (const cfg of major) {
      const recent = await collectRecent(cfg.language, cfg.recent, songs, ids, keys);
      const old = await collectHistorical(cfg.language, cfg.total - cfg.recent, songs, ids, keys, day % ERA_BUCKETS.length);
      report.push(`${cfg.language}: recent ${recent}/${cfg.recent}, older ${old}/${cfg.total - cfg.recent}`);
    }
    // Rotate through other languages daily. 5 languages x 4 songs = 20 total target.
    const start = (day * 5) % LANGUAGES.length;
    const dailyLanguages = Array.from({ length: 5 }, (_, i) => LANGUAGES[(start + i) % LANGUAGES.length]);
    for (let i = 0; i < dailyLanguages.length; i++) {
      const [language, queryLanguage] = dailyLanguages[i];
      const recentTarget = i < 2 ? 1 : 0;
      const oldTarget = 4 - recentTarget;
      let recent = 0;
      if (recentTarget) recent = await collectRecent(language, recentTarget, songs, ids, keys, queryLanguage);
      const old = await collectHistorical(language, oldTarget, songs, ids, keys, (day + i) % ERA_BUCKETS.length, queryLanguage);
      report.push(`${language}: recent ${recent}/${recentTarget}, older ${old}/${oldTarget}`);
    }
    // Brazilian Phonk: 5 popular/relevant tracks from the last five years,
    // 3 currently trending candidates, and 2 newly uploaded candidates.
    const phonkAfter = new Date(Date.now() - 7 * 86400000).toISOString();
    let phonk = 0;
    phonk += await collectQuery({ language:'Brazilian Phonk', query:'Brazilian phonk funk brasileiro viral hits 2021 2022 2023 2024 2025', target:5, kind:'old', era:'popular candidate from last five years; popularity not independently verified', order:'viewCount', songs, ids, keys });
    phonk += await collectQuery({ language:'Brazilian Phonk', query:'Brazilian phonk trending viral 2026', target:3, kind:'old', era:'current trending candidate; popularity not independently verified', songs, ids, keys });
    phonk += await collectQuery({ language:'Brazilian Phonk', query:'new Brazilian phonk funk brasileiro official', target:2, kind:'new', era:'new upload; original release date unverified', publishedAfter:phonkAfter, songs, ids, keys });
    report.push(`Brazilian Phonk: ${phonk}/10 daily target`);
  } catch (err) {
    if (!(err instanceof QuotaError)) throw err;
    report.push(`Stopped safely: ${err.message}`);
  }
  if (songs.length > MAX_SONGS) songs = songs.slice(-MAX_SONGS);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(songs, null, 2));
  console.log(report.join(' | '));
  console.log(`Done. ${songs.length - before} unique candidates added; total catalogue ${songs.length}; estimated quota used ${quotaUsed}/${QUOTA_BUDGET}.`);
  console.log(`Target per day: Hindi 100 (10 recent/90 older), English 50 (5/45), Gujarati 30 (3/27), other languages 20 (2/18). Counts are best-effort, not guaranteed.`);
  console.log(`Date caveat: YouTube API exposes video upload date, not reliably the original song release date. releaseEra is a search hint, not a verified age.`);
}
main().catch(err => { console.error(err); process.exit(1); });

