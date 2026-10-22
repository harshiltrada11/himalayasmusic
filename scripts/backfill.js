// One-time historical catalogue backfill. Run with: node scripts/backfill.js
// Adds up to 100 Hindi, 50 English, 30 Gujarati and 20 songs across other languages.
// YouTube search returns candidates, not verified release dates; query eras are used to
// bias discovery toward older music. Existing songs and duplicate titles are preserved.
const fs = require('fs');
const path = require('path');
const API_KEY = process.env.YOUTUBE_API_KEY;
const FILE = path.join(__dirname, '..', 'catalog.json');
const BUDGET = Math.min(Number(process.env.QUOTA_BUDGET || 8000), 9000);
const MIN_SECONDS = 90, MAX_SECONDS = 600;
const BLOCKED = [
  /\bbass[\s-]*boosted\b/i, /\b8d audio\b/i, /\bnightcore\b/i,
  /\bslowed\s*(?:\+|&|and)\s*reverb\b/i, /\bsped[\s-]*up\b/i,
  /\btiktok remix\b/i, /\bdj remix\b/i, /\bfull dj song\b/i,
  /\bbootleg\b/i, /\bmashup\b/i, /\blofi remix\b/i
];
const ERA_QUERIES = {
  Hindi: [
    'evergreen hindi film songs original audio', 'classic bollywood songs 90s official',
    'old hindi songs 80s 70s original', 'bollywood songs 2000s official audio',
    'hindi hit songs 2010s official audio', 'hindi songs released 2020 2021 official',
    'hindi songs released 2022 2023 official', 'hindi songs released 2024 2025 official',
    'popular hindi songs original soundtrack'
  ],
  English: [
    'classic english pop songs 70s 80s official audio', '90s english hit songs official',
    '2000s pop hits official music video', '2010s pop hits official audio',
    'classic rock songs original audio', 'disco hits 70s official',
    'english pop songs 2020 2021 official', 'english pop songs 2022 2023 official',
    'english pop songs 2024 2025 official'
  ],
  Gujarati: [
    'old gujarati evergreen songs original', 'classic gujarati film songs',
    'gujarati songs 90s 2000s', 'gujarati hit songs official audio',
    'gujarati songs 2010s official', 'gujarati songs 2020 2024 official'
  ],
  Punjabi: ['old punjabi evergreen songs official', 'punjabi classic hits original audio', 'punjabi songs 2000s 2010s official'],
  Marathi: ['old marathi evergreen songs original', 'classic marathi film songs official'],
  Tamil: ['old tamil evergreen songs original audio', 'classic tamil film songs official'],
  Telugu: ['old telugu evergreen songs original audio', 'classic telugu film songs official'],
  Bengali: ['old bengali evergreen songs original', 'classic bengali film songs official'],
  Malayalam: ['old malayalam evergreen songs original', 'classic malayalam film songs official'],
  Kannada: ['old kannada evergreen songs original', 'classic kannada film songs official'],
  Spanish: ['classic spanish pop songs 80s 90s official audio', 'spanish evergreen hits original'],
  Korean: ['classic kpop songs 90s 2000s official', 'kpop hits 2010s official audio']
};
const TARGETS = [
  { language: 'Hindi', target: 100 },
  { language: 'English', target: 50 },
  { language: 'Gujarati', target: 30 },
  { language: 'Punjabi', target: 3 }, { language: 'Marathi', target: 3 },
  { language: 'Tamil', target: 2 }, { language: 'Telugu', target: 2 },
  { language: 'Bengali', target: 2 }, { language: 'Malayalam', target: 2 },
  { language: 'Kannada', target: 2 }, { language: 'Spanish', target: 2 },
  { language: 'Korean', target: 2 }
];
let units = 0;
class QuotaError extends Error {}
async function api(endpoint, params, cost) {
  if (units + cost > BUDGET) throw new QuotaError(`Quota safety budget reached (${units}/${BUDGET})`);
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries({ ...params, key: API_KEY }).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  units += cost;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') throw new QuotaError('YouTube daily quota reached');
    throw new Error(data.error?.message || `YouTube API error ${res.status}`);
  }
  return data;
}
function decode(s='') { return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
function seconds(iso='') { const m=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso); return m?(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0):0; }
const norm = s => String(s||'').toLowerCase().replace(/\(.*?\)|\[.*?\]/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
async function durations(ids) {
  const map = {};
  for (let i=0;i<ids.length;i+=50) {
    const d=await api('videos',{part:'contentDetails,status',id:ids.slice(i,i+50).join(',')},1);
    for (const v of d.items||[]) if (v.status?.embeddable !== false) map[v.id]=seconds(v.contentDetails?.duration);
  }
  return map;
}
async function main() {
  if (!API_KEY) throw new Error('YOUTUBE_API_KEY secret is missing.');
  let songs=[];
  if (fs.existsSync(FILE)) songs=JSON.parse(fs.readFileSync(FILE,'utf8'));
  const initialCount = songs.length;
  const ids=new Set(songs.map(s=>s.id));
  const titleKeys=new Set(songs.map(s=>norm(`${s.title||s.t||''} ${s.artist||s.a||''}`)));
  const report=[];
  for (const cfg of TARGETS) {
    let added=0;
    try {
      for (const q of (ERA_QUERIES[cfg.language]||[])) {
        if (added>=cfg.target) break;
        const data=await api('search',{part:'snippet',q,type:'video',videoCategoryId:'10',videoEmbeddable:'true',order:'relevance',maxResults:50},100);
        const candidates=(data.items||[]).filter(x=>x.id?.videoId && !ids.has(x.id.videoId) && !BLOCKED.some(re=>re.test(decode(x.snippet?.title||''))));
        if (!candidates.length) continue;
        const dm=await durations(candidates.map(x=>x.id.videoId));
        for (const x of candidates) {
          const id=x.id.videoId, title=decode(x.snippet?.title||''), artist=decode(x.snippet?.channelTitle||'');
          if (!dm[id] || dm[id]<MIN_SECONDS || dm[id]>MAX_SECONDS) continue;
          const key=norm(`${title} ${artist}`);
          if (titleKeys.has(key)) continue;
          ids.add(id); titleKeys.add(key);
          songs.push({id,title,artist,thumbnail:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||'',language:cfg.language,addedAt:new Date().toISOString(),catalogType:'historical-candidate',sourceVerified:/\bofficial\b/i.test(title)||/vevo|records|music|films|entertainment/i.test(artist)});
          added++;
          if (added>=cfg.target) break;
        }
      }
      report.push(`${cfg.language}: ${added}/${cfg.target}`);
    } catch (e) {
      report.push(`${cfg.language}: ${added}/${cfg.target} (${e.message})`);
      if (e instanceof QuotaError) break;
      console.warn(`Skipping ${cfg.language}: ${e.message}`);
    }
  }
  fs.writeFileSync(FILE,JSON.stringify(songs));
  console.log(report.join(' | '));
  console.log(`Historical candidates added: ${songs.length - initialCount}; total catalogue: ${songs.length}; quota used: ${units}/${BUDGET}`);
  console.log('Note: YouTube search does not reliably verify original release year; review catalogType=historical-candidate entries if exact release dates matter.');
}
main().catch(e=>{console.error(e);process.exit(1)});
