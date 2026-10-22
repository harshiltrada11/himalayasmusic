const $ = s => document.querySelector(s);
const L = localStorage;

let S = {
  user: null,
  langs: [],
  artists: [],
  liked: [],
  pls: {},
  users: {},
  ...JSON.parse(L.gl || '{}')
};

if (!S.langs.length && S.lang) S.langs = [S.lang];

const save = () => L.gl = JSON.stringify(S);

const LN = {
  hi: "Hindi",
  en: "English",
  gu: "Gujarati",
  pa: "Punjabi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  kn: "Kannada",
  ml: "Malayalam",
  bh: "Bhojpuri",
  har: "Haryanvi",
  raj: "Rajasthani",
  ur: "Urdu",
  ne: "Nepali",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  ar: "Arabic",
  tr: "Turkish",
  ru: "Russian",
  id: "Indonesian",
  th: "Thai",
  vi: "Vietnamese",
  fil: "Filipino",
  fa: "Persian",
  pl: "Polish",
  nl: "Dutch",
  el: "Greek",
  sw: "Swahili",
  other: "Other Languages"
};

let all = [], byId = {}, queue = [], cur = '', v = 'home',
    lb = 'pl', det = null, yt, ready = 0, pend = '',
    shuf = 0, rep = 0, errs = 0, slT, slI = 0;

const H = async s => [
  ...new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(s)
    )
  )
].map(b => b.toString(16).padStart(2, '0')).join('');

const th = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

const esc = s => String(s ?? '').replace(
  /[&<>"']/g,
  c => '&#' + c.charCodeAt(0) + ';'
);

const fmt = t =>
  Math.floor(t / 60) + ':' +
  String(Math.floor(t % 60)).padStart(2, '0');

const ln = c => LN[c] || String(c || 'Other Languages');

const toast = m => {
  const t = $('#ts');
  if (!t) return;
  t.textContent = m;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2600);
};

const LANGUAGE_CODES = Object.fromEntries(
  Object.entries(LN).map(([code, name]) => [
    name.toLowerCase(), code
  ])
);

// Supports both the old and new song-data formats.
function normalizeSong(s) {
  const raw = String(s.l ?? s.language ?? '')
    .trim()
    .toLowerCase();

  const aliases = {
    hindi: 'hi',
    english: 'en',
    gujarati: 'gu',
    punjabi: 'pa',
    marathi: 'mr',
    tamil: 'ta',
    telugu: 'te',
    bengali: 'bn',
    kannada: 'kn',
    malayalam: 'ml',
    bhojpuri: 'bh',
    haryanvi: 'har',
    rajasthani: 'raj',
    urdu: 'ur',
    nepali: 'ne',
    spanish: 'es',
    portuguese: 'pt',
    french: 'fr',
    german: 'de',
    italian: 'it',
    korean: 'ko',
    japanese: 'ja',
    chinese: 'zh',
    mandarin: 'zh',
    arabic: 'ar',
    turkish: 'tr',
    russian: 'ru',
    indonesian: 'id',
    thai: 'th',
    vietnamese: 'vi',
    filipino: 'fil',
    persian: 'fa',
    polish: 'pl',
    dutch: 'nl',
    greek: 'el',
    swahili: 'sw'
  };

  const language =
    LN[raw] ? raw :
    LANGUAGE_CODES[raw] ||
    aliases[raw] ||
    'other';

  return {
    ...s,
    id: s.id || s.videoId || s.video_id,
    t: s.t || s.title || '',
    a: s.a || s.artist || s.channelTitle || 'Unknown Artist',
    al: s.al || s.album || '',
    l: language,
    d: s.d || s.addedAt || ''
  };
}

// Group songs by artist, album or another field.
const grp = (key, songs) => {
  const groups = {};

  songs.forEach(song => {
    const name = song[key] || (
      key === 'a' ? 'Unknown Artist' : 'Unknown Album'
    );

    (groups[name] ||= []).push(song);
  });

  return Object.entries(groups);
};

// Load local song data and cached trending songs.
// Searching and filtering do not make YouTube API requests.
async function load() {
  const getJSON = async url => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const [seedData, catalogData, trending] = await Promise.all([
    getJSON('songs.json'),
    getJSON('catalog.json'),
    getJSON('/api/trending')
  ]);

  const toArray = data => {
    if (Array.isArray(data)) return data;

    if (data && Array.isArray(data.items)) {
      return data.items;
    }

    if (data && Array.isArray(data.songs)) {
      return data.songs;
    }

    return [];
  };

  const songs = [
    ...toArray(catalogData),
    ...toArray(trending).map(s => ({
      ...s,
      d: s.d || trending?.date || ''
    })),
    ...toArray(seedData)
  ];

  const unique = new Map();

  songs.map(normalizeSong).forEach(song => {
    if (song.id && !unique.has(song.id)) {
      unique.set(song.id, song);
    }
  });

  all = [...unique.values()].sort(
    (a, b) => String(b.d).localeCompare(String(a.d))
  );

  byId = {};

  all.forEach(song => {
    byId[song.id] = song;
  });

  if (S.user) {
    next();
  } else {
    ob('w');
  }
}

// Login, signup and language onboarding.
function ob(st, m) {
  const o = $('#ob');
  $('#app').hidden = true;
  o.hidden = false;

  let h = '';

  if (st === 'w') {
    h = `<div class="glass box">
      <img class="lg" src="icon.svg" alt="">
      <h1>BeatNest</h1>
      <p>Music that's new every day.</p>
      <button class="pri" data-o="signup">Sign up</button>
      <button data-o="login">Log in</button>
      <button data-o="guest">Continue as guest</button>
    </div>`;
  }

  if (st === 'auth') {
    h = `<form class="glass box" id="af">
      <h1>${m === 'signup' ? 'Create account' : 'Welcome back'}</h1>
      ${m === 'signup'
        ? '<input name="n" placeholder="Name" required>'
        : ''}
      <input name="e" type="email" placeholder="Email" required>
      <input name="p" type="password" minlength="6"
        placeholder="Password (6+ characters)" required>
      <button class="pri">
        ${m === 'signup' ? 'Sign up' : 'Log in'}
      </button>
      <small id="er"></small>
    </form>`;
  }

  if (st === 'lang') {
    h = `<div class="glass box">
      <h1>Which languages do you like?</h1>
      <p>Pick one or more. We'll suggest songs in them.</p>
      <div class="langs">
        ${Object.entries(LN).map(([k, n]) =>
          `<button data-lang="${k}"
            class="${S.langs.includes(k) ? 'on' : ''}">${n}</button>`
        ).join('')}
      </div>
      <button class="pri" data-o="lc">Continue</button>
    </div>`;
  }

  if (st === 'art') {
    const songs = all.filter(s => S.langs.includes(s.l));
    const artists = grp('a', songs.length ? songs : all).slice(0, 18);

    h = `<div class="glass box">
      <h1>Pick your favourite artists</h1>
      <div class="pick">
        ${artists.map(([name, list]) =>
          `<div class="c rd ${S.artists.includes(name) ? 'on' : ''}"
            data-art="${esc(name)}">
            <img src="${th(list[0].id)}" alt="">
            <b>${esc(name)}</b>
          </div>`
        ).join('')}
      </div>
      <button class="pri" data-o="done">Done</button>
    </div>`;
  }

  o.innerHTML = h;
}

function next() {
  if (!S.langs.length) ob('lang');
  else if (!S.artists.length) ob('art');
  else start();
}

function start() {
  $('#ob').hidden = true;
  $('#app').hidden = false;
  $('#me').textContent = (S.user.n || 'G')[0].toUpperCase();
  render();
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'af') return;

  e.preventDefault();

  const f = Object.fromEntries(new FormData(e.target));
  const hash = await H(f.p);
  const user = S.users[f.e];

  if (f.n) {
    if (user) {
      $('#er').textContent = 'This email already has an account.';
      return;
    }

    S.users[f.e] = { n: f.n, h: hash };
  } else if (!user || user.h !== hash) {
    $('#er').textContent = 'Wrong email or password.';
    return;
  }

  S.user = { e: f.e, n: S.users[f.e].n };
  save();
  next();
});

// Song rows, cards and shelves.
const row = s => `<div class="row" data-p="${esc(s.id)}">
  <img src="${th(s.id)}" loading="lazy" alt="">
  <div>
    <b>${esc(s.t)}</b>
    <small>${esc(s.a)} · ${ln(s.l)}</small>
  </div>
  <button data-l="${esc(s.id)}"
    class="${S.liked.includes(s.id) ? 'on' : ''}"
    aria-label="Like">♥</button>
  <button data-a="${esc(s.id)}" aria-label="Add to playlist">＋</button>
</div>`;

const rows = list => list.length
  ? `<div class="list">${list.map(row).join('')}</div>`
  : '<p>Nothing here yet.</p>';

const card = s => `<div class="c" data-p="${esc(s.id)}">
  <img src="${th(s.id)}" loading="lazy" alt="">
  <b>${esc(s.t)}</b>
  <small>${esc(s.a)}</small>
</div>`;

const gc = (key, name, list, round) =>
  list.length ? `<div class="c ${round ? 'rd' : ''}"
    data-g="${key}" data-n="${esc(name)}">
    <img src="${th(list[0].id)}" loading="lazy" alt="">
    <b>${esc(name)}</b>
    <small>${list.length} songs</small>
  </div>` : '';

const shelf = (title, list, renderCard) =>
  list.length
    ? `<h2>${title}</h2><div class="shelf">${
        list.map(renderCard || card).join('')
      }</div>`
    : '';

// Main home page and navigation views.
function render() {
  let h = '';

  const mine = all.filter(s =>
    S.langs.includes(s.l) || S.artists.includes(s.a)
  );

  const hr = new Date().getHours();

  document.querySelectorAll('.tabs button').forEach(button => {
    button.classList.toggle('on', button.dataset.v === v);
  });

  if (det) {
    const list = det.k === 'pl'
      ? (S.pls[det.n] || []).map(id => byId[id]).filter(Boolean)
      : all.filter(s => s[det.k] === det.n);

    h = `<button data-back>‹ Back</button>
      <h1 style="margin-top:14px">${esc(det.k === 'l'
        ? ln(det.n) + ' songs'
        : det.n)}</h1>
      <button class="pri" data-pa>▶ Play all</button>
      ${rows(list)}`;
  }

  else if (v === 'home') {
    const ql = S.langs
      .map(language => all.find(s => s.l === language))
      .filter(Boolean)
      .slice(0, 5);

    const hindi = all.filter(s => s.l === 'hi');
    const english = all.filter(s => s.l === 'en');

    const newReleases = all.filter(s => s.d).slice(0, 20);

    h = `<h1>${
      hr < 12 ? 'Good morning' :
      hr < 17 ? 'Good afternoon' : 'Good evening'
    }</h1>

    <div class="qg">
      <div class="q" data-v="lib" data-lb="liked">
        <span class="ph">♥</span> Liked Songs
      </div>

      ${ql.map(s => `<div class="q"
        data-g="l" data-n="${esc(s.l)}">
        <img src="${th(s.id)}" alt="">
        ${ln(s.l)} Mix
      </div>`).join('')}
    </div>`;

    // Personalized selections based on chosen languages and artists.
    h += shelf('Daily Mix', mine.slice(0, 20));
    h += shelf('Made for You', mine.slice(0, 20));

    // Language-specific mixes.
    h += shelf('Hindi Mix', hindi.slice(0, 20));
    h += shelf('English Mix', english.slice(0, 20));

    // Additional mixes for selected languages.
    h += S.langs.map(language =>
      shelf(
        ln(language) + ' Mix',
        all.filter(s => s.l === language).slice(0, 20)
      )
    ).join('');

    // Newly added catalog entries.
    h += shelf('New Releases', newReleases);

    // Popular artists.
    h += shelf(
      'Popular Artists',
      grp('a', all).slice(0, 15),
      ([name, list]) => gc('a', name, list, 1)
    );

    // Albums.
    h += shelf(
      'Albums',
      grp('al', all)
        .filter(([name, list]) => name && list.length > 1)
        .slice(0, 15),
      ([name, list]) => gc('al', name, list)
    );

    if (!all.length) {
      h += `<p>No songs loaded. Check songs.json and catalog.json,
        and make sure they contain song entries.</p>`;
    }
  }

  else if (v === 'search') {
    const query = ($('#q')?.value || '').toLowerCase().trim();

    h = query
      ? `<h2>Songs</h2>` +
        rows(all.filter(s =>
          (s.t + ' ' + s.a + ' ' + s.al)
            .toLowerCase().includes(query)
        ).slice(0, 60)) +
        shelf(
          'Artists',
          grp('a', all.filter(s =>
            s.a.toLowerCase().includes(query)
          )).slice(0, 10),
          ([name, list]) => gc('a', name, list, 1)
        )
      : `<h1>Browse all</h1>
        <div class="tiles">
          ${Object.entries(LN).map(([key, name]) =>
            `<div class="tile" data-g="l" data-n="${key}">
              ${name}
            </div>`
          ).join('')}
        </div>`;
  }

  else {
    h = `<h1>Your Library</h1>
      <div class="chips">
        ${[
          ['pl', 'Playlists'],
          ['liked', 'Liked'],
          ['al', 'Albums'],
          ['ar', 'Artists']
        ].map(([key, name]) =>
          `<button data-lb="${key}" data-v="lib"
            class="${lb === key ? 'on' : ''}">${name}</button>`
        ).join('')}
      </div>`;

    h += lb === 'liked'
      ? rows(all.filter(s => S.liked.includes(s.id)))

      : lb === 'al'
        ? `<div class="shelf" style="flex-wrap:wrap">
            ${grp('al', all).map(([name, list]) =>
              gc('al', name, list)
            ).join('')}
          </div>`

        : lb === 'ar'
          ? `<div class="shelf" style="flex-wrap:wrap">
              ${grp('a', all).map(([name, list]) =>
                gc('a', name, list, 1)
              ).join('')}
            </div>`

          : Object.entries(S.pls).map(([name, ids]) =>
              `<div class="row" data-g="pl" data-n="${esc(name)}">
                <span class="ph q"
                  style="width:52px;border-radius:8px">♫</span>
                <div>
                  <b>${esc(name)}</b>
                  <small>${ids.length} songs</small>
                </div>
              </div>`
            ).join('') ||
            '<p>Add songs to a playlist with the ＋ button.</p>';
  }

  $('#view').innerHTML = h;
}

$('#q').addEventListener('input', () => {
  v = 'search';
  det = null;
  render();
});

// Buttons, playlists, onboarding and song selection.
document.addEventListener('click', e => {
  const t = e.target.closest(
    '[data-o],[data-lang],[data-art],[data-l],[data-a],' +
    '[data-g],[data-v],[data-back],[data-pa],[data-p]'
  );

  if (!t) return;

  const d = t.dataset;

  if (d.o === 'signup' || d.o === 'login') {
    ob('auth', d.o);
  }

  else if (d.o === 'guest') {
    S.user = { n: 'Guest' };
    save();
    next();
  }

  else if (d.o === 'lc') {
    if (!S.langs.length) return toast('Pick at least one language');
    save();
    next();
  }

  else if (d.o === 'done') {
    if (!S.artists.length) return toast('Pick at least one artist');
    save();
    start();
  }

  else if (d.lang) {
    const i = S.langs.indexOf(d.lang);

    i < 0
      ? S.langs.push(d.lang)
      : S.langs.splice(i, 1);

    t.classList.toggle('on');
  }

  else if (d.art != null) {
    const i = S.artists.indexOf(d.art);

    i < 0
      ? S.artists.push(d.art)
      : S.artists.splice(i, 1);

    t.classList.toggle('on');
  }

  else if (d.l) {
    const i = S.liked.indexOf(d.l);

    i < 0
      ? S.liked.push(d.l)
      : S.liked.splice(i, 1);

    save();
    t.classList.toggle('on');
  }

  else if (d.a) {
    const name = prompt(
      'Add to playlist (type a name, new or existing):\n' +
      (Object.keys(S.pls).join(', ') || 'No playlists yet')
    );

    if (name) {
      S.pls[name] = S.pls[name] || [];

      if (!S.pls[name].includes(d.a)) {
        S.pls[name].push(d.a);
      }

      save();
      toast('Added to ' + name);
    }
  }

  else if (d.g) {
    det = { k: d.g, n: d.n };
    render();
  }

  else if (d.back != null) {
    det = null;
    render();
  }

  else if (d.v) {
    v = d.v;
    if (d.lb) lb = d.lb;
    det = null;
    render();
  }

  else if (d.pa != null) {
    const ids = [
      ...document.querySelectorAll('.list [data-p]')
    ].map(x => x.dataset.p);

    if (ids.length) play(ids[0], ids);
  }

  else if (d.p) {
    const container = t.closest('.shelf,.list') || document;

    const ids = [
      ...container.querySelectorAll('[data-p]')
    ].map(x => x.dataset.p);

    play(d.p, ids);
  }
});

$('#me').onclick = () => {
  if (confirm('Log out?')) {
    S.user = null;
    save();

    if (yt) yt.pauseVideo();

    $('#np').classList.remove('open');
    $('#mini').hidden = true;

    ob('w');
  }
};

// YouTube IFrame player.
const onStateChange = e => {
  const playing = e.data === 1;

  if (playing) errs = 0;

  $('#pp').textContent = $('#mp').textContent =
    playing ? '❚❚' : '▶';

  if (e.data === 0) step(1, 1);
};

const onError = () => {
  if (++errs > 4) {
    return toast('Songs are not playing. Open the website link.');
  }

  toast("This song can't play here, skipping");
  setTimeout(() => step(1), 900);
};

function play(id, q) {
  if (q) queue = q;

  const s = byId[id];
  if (!s) return;

  cur = id;

  $('#nt').textContent = $('#mt').textContent = s.t;
  $('#na').textContent = $('#ma').textContent = s.a;
  $('#mi').src = th(id);
  $('#yl').href = 'https://youtu.be/' + id;
  $('#mini').hidden = false;

  if (!yt) {
    if (!window.YT || !YT.Player) {
      return toast('Player is loading, tap the song again');
    }

    const f = document.createElement('iframe');

    f.allow = 'autoplay; encrypted-media; picture-in-picture';

    f.src = `https://www.youtube.com/embed/${id}` +
      `?autoplay=1&enablejsapi=1&playsinline=1&controls=0&rel=0` +
      `&origin=${encodeURIComponent(location.origin)}`;

    $('#vid').append(f);

    yt = new YT.Player(f, {
      events: {
        onReady() {
          ready = 1;

          if (pend && pend !== id) {
            yt.loadVideoById(pend);
          }

          pend = '';
        },
        onStateChange,
        onError
      }
    });

    $('#np').classList.add('open');
  }

  else if (ready) {
    yt.loadVideoById(id);
  }

  else {
    pend = id;
  }

  if ('mediaSession' in navigator) {
    const M = navigator.mediaSession;

    M.metadata = new MediaMetadata({
      title: s.t,
      artist: s.a,
      artwork: [{ src: th(id) }]
    });

    M.setActionHandler('previoustrack', () => step(-1));
    M.setActionHandler('nexttrack', () => step(1));
    M.setActionHandler('play', tog);
    M.setActionHandler('pause', tog);
  }
}

function step(d, auto) {
  if (!queue.length) return;

  if (auto && rep === 2) {
    yt.seekTo(0);
    return yt.playVideo();
  }

  let i = queue.indexOf(cur);

  if (shuf) {
    i = Math.floor(Math.random() * queue.length);
  } else {
    i += d;

    if (i >= queue.length) {
      if (auto && !rep) return;
      i = 0;
    }

    if (i < 0) i = queue.length - 1;
  }

  play(queue[i]);
}

const tog = () => {
  if (!ready) return;

  yt.getPlayerState() === 1
    ? yt.pauseVideo()
    : yt.playVideo();
};

$('#pp').onclick = tog;

$('#mp').onclick = e => {
  e.stopPropagation();
  tog();
};

$('#nx').onclick = $('#mx').onclick = e => {
  e.stopPropagation();
  step(1);
};

$('#pv').onclick = $('#mv').onclick = e => {
  e.stopPropagation();
  step(-1);
};

$('#sh').onclick = e => {
  shuf = !shuf;
  e.currentTarget.classList.toggle('on', shuf);
  toast('Shuffle ' + (shuf ? 'on' : 'off'));
};

$('#rp').onclick = e => {
  rep = (rep + 1) % 3;

  const b = e.currentTarget;
  b.textContent = rep === 2 ? '↻1' : '↻';
  b.classList.toggle('on', rep > 0);

  toast(['Repeat off', 'Repeat all', 'Repeat this song'][rep]);
};

$('#sl').onclick = () => {
  slI = (slI + 1) % 4;
  clearTimeout(slT);

  const minutes = [0, 15, 30, 60][slI];

  $('#sl').textContent =
    '⏾ Sleep timer: ' + (minutes ? minutes + ' min' : 'Off');

  if (minutes) {
    slT = setTimeout(() => {
      if (yt) yt.pauseVideo();

      slI = 0;
      $('#sl').textContent = '⏾ Sleep timer: Off';

      toast('Sleep timer: music stopped');
    }, minutes * 60000);
  }
};

$('#mini').onclick = () => $('#np').classList.add('open');
$('#cl').onclick = () => $('#np').classList.remove('open');

$('#sk').oninput = e => {
  if (ready) {
    yt.seekTo(e.target.value / 1000 * yt.getDuration(), true);
  }
};

setInterval(() => {
  if (!ready || !yt || !yt.getDuration) return;

  const duration = yt.getDuration() || 0;
  const current = yt.getCurrentTime() || 0;

  $('#sk').value = duration ? current / duration * 1000 : 0;
  $('#tm').textContent = fmt(current) + ' / ' + fmt(duration);
}, 500);

load();
