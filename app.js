const $=s=>document.querySelector(s),L=localStorage;
let S={user:null,langs:[],artists:[],liked:[],pls:{},users:{},...JSON.parse(L.gl||'{}')};
if(!S.langs.length&&S.lang)S.langs=[S.lang];
const save=()=>L.gl=JSON.stringify(S);
const LN={hi:'Hindi',en:'English',gu:'Gujarati',pa:'Punjabi',mr:'Marathi',ta:'Tamil',te:'Telugu',bn:'Bengali',kn:'Kannada',ml:'Malayalam',bh:'Bhojpuri',har:'Haryanvi',raj:'Rajasthani',ur:'Urdu',ne:'Nepali',es:'Spanish',pt:'Portuguese',fr:'French',de:'German',it:'Italian',ko:'Korean',ja:'Japanese',zh:'Chinese',ar:'Arabic',tr:'Turkish',ru:'Russian',id:'Indonesian',th:'Thai',vi:'Vietnamese',fil:'Filipino',fa:'Persian',pl:'Polish',nl:'Dutch',el:'Greek',sw:'Swahili',other:'Other Languages'};
let all=[],byId={},queue=[],cur='',v='home',lb='pl',det=null,yt,ready=0,pend='',shuf=0,rep=0,errs=0,slT,slI=0;
const H=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const th=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`,esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'),ln=c=>LN[c]||String(c).toUpperCase();
const toast=m=>{const t=$('#ts');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2600)};
const grp=(k,a)=>{const g={};a.forEach(s=>(g[s[k]]=g[s[k]]||[]).push(s));return Object.entries(g).sort((x,y)=>y[1].length-x[1].length)};


// Mood playlists are generated from the current local catalog. No extra YouTube API calls.
const MOODS=[
 {id:'party',name:'Party',emoji:'🎉',desc:'Big beats and party starters',words:['party','dance','edm','club','celebration','disco','upbeat']},
 {id:'gym',name:'Gym',emoji:'🏋️',desc:'Power up your workout',words:['gym','workout','beast','power','motivation','strong','rock','rap','hustle','fighter','champion']},
 {id:'love',name:'Love',emoji:'❤️',desc:'Songs full of love',words:['love','ishq','pyaar','pyar','dil','jaan','mohabbat','heart','romance','tum hi','sajna','sanam']},
 {id:'bollywood',name:'Bollywood',emoji:'🎬',desc:'Hindi film favourites',words:['bollywood','hindi','film','movie','soundtrack','lyrics','official video'],language:'hi'},
 {id:'80s',name:'80s Classics',emoji:'📼',desc:'Retro and golden-era sounds',words:['80s','1980','eighties','retro','classic','evergreen','old song','golden era','disco']},
 {id:'90s',name:'90s Hits',emoji:'📀',desc:'Throwback favourites',words:['90s','1990','nineties','retro','classic','evergreen','old song','indipop']},
 {id:'pop',name:'Pop',emoji:'🎤',desc:'Catchy pop tracks',words:['pop','top hits','chart','radio hit','k-pop','kpop','synthpop']},
 {id:'happy',name:'Happy',emoji:'☀️',desc:'Feel-good songs for your day',words:['happy','smile','fun','celebrate','party','upbeat','joy','good mood','dance']},
 {id:'chill',name:'Chill',emoji:'🌙',desc:'Slow down and unwind',words:['chill','lofi','lo-fi','acoustic','mellow','relax','soft','calm','slow','unplugged']},
 {id:'travel',name:'Travel',emoji:'🚗',desc:'For every road and journey',words:['travel','road trip','journey','safar','musafir','ride','highway','wander','drive','destination']},
 {id:'sleep',name:'Sleep',emoji:'🌌',desc:'Gentle sounds for winding down',words:['sleep','lullaby','calm','piano','ambient','meditation','soft','peaceful','relax','instrumental']},
 {id:'sad',name:'Sad',emoji:'🌧️',desc:'When you need an emotional song',words:['sad','heartbreak','broken','lonely','cry','dard','bewafa','alone','pain','goodbye','tanha']},
 {id:'romantic',name:'Romantic',emoji:'💗',desc:'Romance and dreamy melodies',words:['romantic','love','ishq','pyaar','pyar','dil','jaan','mohabbat','heart','sajna','sanam']},
 {id:'devotional',name:'Devotional',emoji:'🙏',desc:'Bhajans and spiritual music',words:['bhajan','devotional','mantra','aarti','krishna','bhakti','ram','shreenathji','shiv','hanuman','prayer']},
 {id:'lofi',name:'Lo-fi',emoji:'🎧',desc:'Laid-back beats and slowed tracks',words:['lofi','lo-fi','lo fi','slowed','reverb','chill beats','study beats','beats to relax']},
 {id:'focus',name:'Focus',emoji:'🧠',desc:'Music for reading and concentration',words:['focus','instrumental','piano','classical','ambient','study','concentration','background music','flute']},
 {id:'dance',name:'Dance',emoji:'💃',desc:'Move to the beat',words:['dance','edm','beat','club','disco','bhangra']},
 {id:'indie',name:'Indie',emoji:'🎸',desc:'Independent and alternative sounds',words:['indie','independent','alternative','singer songwriter','acoustic','indie pop','indie rock']},
 {id:'classical',name:'Classical',emoji:'🎻',desc:'Instrumental and classical sounds',words:['classical','instrumental','raga','raag','sitar','flute','orchestra','piano solo','violin']},
 {id:'punjabi',name:'Punjabi',emoji:'🪘',desc:'Punjabi hits and bhangra',words:['punjabi','bhangra','giddha'],language:'pa'},
 {id:'brazilian-phonk',name:'Brazilian Phonk',emoji:'🇧🇷',desc:'Brazilian Phonk only',words:['brazilian phonk','funk brasileiro','montagem'],language:'Brazilian Phonk'}
];
const moodFor=id=>MOODS.find(m=>m.id===id);
function moodSongs(id){
 const mood=moodFor(id);if(!mood)return [];
 if(id==='brazilian-phonk'){
   // Strict genre-only shelf: never pad it with unrelated songs and never apply a 25-track cap.
   return all.filter(s=>{
     const text=`${s.t||''} ${s.a||''} ${s.al||''} ${s.genre||''} ${s.l||''}`.toLowerCase();
     const explicitlyBrazilian=s.l==='Brazilian Phonk'||String(s.genre||'').toLowerCase().includes('brazilian-phonk')||/brazilian phonk|funk brasileiro|montagem/.test(text);
     const clearlyOtherPhonk=/drift phonk|phonk house|japanese phonk|russian phonk|aggressive phonk/.test(text);
     return explicitlyBrazilian&&!clearlyOtherPhonk;
   });
 }
 const scored=all.map((s,i)=>{const text=`${s.t||''} ${s.a||''} ${s.al||''} ${s.l?ln(s.l):''}`.toLowerCase();let score=0;
   for(const word of mood.words)if(text.includes(word.toLowerCase()))score+=word.includes(' ')?3:2;
   if(mood.language&&s.l===mood.language)score+=5;
   if(id==='bollywood'&&s.l==='hi')score+=8;
   if(id==='punjabi'&&s.l==='pa')score+=8;
   if(id==='pop'&&['en','ko','ja'].includes(s.l))score+=2;
   return {s,i,score};
 }).sort((a,b)=>b.score-a.score||a.i-b.i);
 const picked=scored.filter(x=>x.score>0).map(x=>x.s);
 for(const s of scored.map(x=>x.s))if(picked.length<25&&!picked.some(x=>x.id===s.id))picked.push(s);
 return picked.slice(0,Math.min(25,all.length));
}

// catalog = songs.json (seed) + catalog.json (filled daily by GitHub Action) + /api/trending (cached). No API calls for search/filter/etc.
const LANGUAGE_CODES=Object.fromEntries(Object.entries(LN).map(([code,name])=>[name.toLowerCase(),code]));
function normalizeSong(s){
  const raw=String(s.l??s.language??'').trim().toLowerCase();
  const language=/brazilian phonk/.test(raw)?'Brazilian Phonk':LN[raw]?raw:LANGUAGE_CODES[raw]||({'haryanvi':'har','rajasthani':'raj','filipino':'fil','mandarin':'zh','chinese (mandarin)':'zh'}[raw]||'other');
  return {...s,id:s.id||s.videoId,t:s.t||s.title||'',a:s.a||s.artist||s.channelTitle||'Unknown Artist',al:s.al||s.album||'',l:language,d:s.d||s.addedAt||''};
}
async function load(){
  if(location.protocol=='file:')alert('Open the site from your Vercel link (or a local server). YouTube will not play from a file.');
  const j=async u=>{try{const r=await fetch(u);if(!r.ok)return null;return await r.json()}catch{return null}};
  const [seed,catalog,trending]=await Promise.all([j('songs.json'),j('catalog.json'),j('/api/trending')]);
  const items=[...(Array.isArray(catalog)?catalog:[]),...((trending?.items||[]).map(x=>({...x,d:x.d||trending.date||''}))),...(Array.isArray(seed)?seed:[])];
  const m=new Map();
  const officialHindi=/t-series|zee music|sony music india|saregama|tips official|jio studios|yrf|yash raj films|panorama music|times music|aditya music|lahari music|think music|speed records|white hill music|desi melodies|gem tunes|hitz music|universal music india|venus music/i;
  const charts=/\btop\s*(?:10|20|40|50|100)\b|\b(?:top|best)\s+\d+\s+(?:songs|hits|music)|weekly chart|singles chart|new music friday|trending songs?|songs? of the week|music mix compilation|trending music/i;
  items.map(normalizeSong).forEach(song=>{if(!song.id||m.has(song.id))return;
    const title=String(song.t||''); const source=String(song.a||''); if(charts.test(title)||/\bgaurav\s+mali\b/i.test(source))return;
    // Preserve existing valid songs; use official-label metadata as a preference, not a destructive blanket filter.
    song.officialLabel=officialHindi.test(String(song.a||''));
    m.set(song.id,song)});
  all=[...m.values()].sort((x,y)=>(Number(Boolean(y.officialLabel))-Number(Boolean(x.officialLabel)))||String(y.d||'').localeCompare(String(x.d||'')));
  byId={};all.forEach(song=>byId[song.id]=song);
  S.user?next():ob('w');
}

// onboarding
function ob(st,m){const o=$('#ob');$('#app').hidden=true;o.hidden=false;let h='';
  if(st=='w')h=`<div class="glass box"><img class="lg" src="icon.svg" alt=""><h1>BeatNest</h1><p>Music that's new every day.</p><button class="pri" data-o="signup">Sign up</button><button data-o="login">Log in</button><button data-o="guest">Continue as guest</button></div>`;
  if(st=='auth')h=`<form class="glass box" id="af"><h1>${m=='signup'?'Create account':'Welcome back'}</h1>${m=='signup'?'<input name=n placeholder="Name" required>':''}<input name=e type=email placeholder="Email" required><input name=p type=password minlength=6 placeholder="Password (6+ characters)" required><button class="pri">${m=='signup'?'Sign up':'Log in'}</button><small id="er"></small></form>`;
  if(st=='lang')h=`<div class="glass box"><h1>Which languages do you like?</h1><p>Pick one or more. We'll suggest songs in them.</p><div class="langs">${Object.entries(LN).map(([k,n])=>`<button data-lang="${k}" class="${S.langs.includes(k)?'on':''}">${n}</button>`).join('')}</div><button class="pri" data-o="lc">Continue</button></div>`;
  if(st=='art'){const featured=[
      ['Arijit Singh','hi'],['Shreya Ghoshal','hi'],['A.R. Rahman','hi'],['Pritam','hi'],['Sonu Nigam','hi'],['Neha Kakkar','hi'],['Badshah','hi'],['Diljit Dosanjh','hi'],['Atif Aslam','hi'],
      ['Taylor Swift','en'],['The Weeknd','en'],['Ed Sheeran','en'],['Billie Eilish','en'],['Bruno Mars','en'],['Dua Lipa','en'],['Justin Bieber','en'],['Ariana Grande','en'],
      ['Aditya Gadhvi','gu'],['Kirtidan Gadhvi','gu'],['Geeta Rabari','gu'],['Osman Mir','gu'],['Kinjal Dave','gu'],['Parthiv Gohil','gu']
    ];const a=featured.filter(x=>S.langs.includes(x[1])).map(([n])=>[n,all.filter(s=>s.a.toLowerCase().includes(n.toLowerCase())).slice(0,1)]).map(([n,l])=>[n,l.length?l:[all.find(s=>S.langs.includes(s.l))||all[0]].filter(Boolean)]);const fallback=grp('a',all.filter(s=>S.langs.includes(s.l))).slice(0,18);const picks=a.length?a:fallback;
    h=`<div class="glass box"><h1>Pick your favourite artists</h1><div class="pick">${picks.map(([n,l])=>`<div class="c rd ${S.artists.includes(n)?'on':''}" data-art="${esc(n)}"><img src="${th(l[0].id)}" alt=""><b>${esc(n)}</b></div>`).join('')}</div><button class="pri" data-o="done">Done</button></div>`}
  o.innerHTML=h}
function next(){!S.langs.length?ob('lang'):start()}
function start(){$('#ob').hidden=true;$('#app').hidden=false;$('#me').textContent=(S.user.n||'G')[0].toUpperCase();render()}
document.addEventListener('submit',async e=>{if(e.target.id!='af')return;e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target)),h=await H(f.p),u=S.users[f.e];
  if(f.n){if(u)return $('#er').textContent='This email already has an account.';S.users[f.e]={n:f.n,h}}
  else if(!u||u.h!=h)return $('#er').textContent='Wrong email or password.';
  S.user={e:f.e,n:S.users[f.e].n};save();next()});

// views (all client-side)
const row=s=>`<div class="row" data-p="${s.id}"><img src="${th(s.id)}" loading="lazy" alt=""><div><b>${esc(s.t)}</b><small>${esc(s.a)} · ${ln(s.l)}</small></div><button data-l="${s.id}" class="${S.liked.includes(s.id)?'on':''}" aria-label="Like">♥</button><button data-a="${s.id}" aria-label="Add to playlist" title="Add to playlist">＋</button><button data-share="${s.id}" aria-label="Share song" title="Share song">↗</button></div>`;
const rows=l=>l.length?`<div class="list">${l.map(row).join('')}</div>`:'<p>Nothing here yet.</p>';
const card=s=>`<div class="c" data-p="${s.id}"><img src="${th(s.id)}" loading="lazy" alt=""><b>${esc(s.t)}</b><small>${esc(s.a)}</small><div class="song-actions"><button data-a="${s.id}" aria-label="Add to playlist">＋ Add</button><button data-share="${s.id}" aria-label="Share song" title="Share song">↗ Share</button></div></div>`;
const gc=(k,n,l,r)=>`<div class="c ${r?'rd':''}" data-g="${k}" data-n="${esc(n)}"><img src="${th(l[0].id)}" loading="lazy" alt=""><b>${esc(n)}</b><small>${l.length} songs</small></div>`;
const shelf=(t,l,f)=>l.length?`<h2>${t}</h2><div class="shelf">${l.map(f||card).join('')}</div>`:'';
function render(){let h='';const mine=all.filter(s=>['hi','en'].includes(s.l)),hr=new Date().getHours();
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v==v));
  if(det){const l=det.k=='pl'?(S.pls[det.n]||[]).map(i=>byId[i]).filter(Boolean):det.k=='mood'?moodSongs(det.n):all.filter(s=>s[det.k]==det.n);
    const mood=det.k=='mood'?moodFor(det.n):null;
    h=`<button data-back>‹ Back</button><h1 style="margin-top:14px">${esc(mood?mood.name:det.k=='l'?ln(det.n)+' songs':det.n)}</h1>${mood?`<p class="mood-subtitle">${esc(mood.desc)} · ${l.length} songs</p>`:''}<button class="pri" data-pa>▶ Play all</button>${rows(l)}`}
  else if(v=='home'){const ql=S.langs.map(l=>all.find(s=>s.l==l)).filter(Boolean).slice(0,5);
    const langMix=l=>all.filter(s=>s.l==l).slice(0,20);
    const hindi=langMix('hi'),english=langMix('en');
    h=`<h1>${hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}</h1><div class="qg"><div class="q" data-v="lib" data-lb="liked"><span class="ph">♥</span>Liked Songs</div>${ql.map(s=>`<div class="q" data-g="l" data-n="${s.l}"><img src="${th(s.id)}" alt="">${ln(s.l)} mix</div>`).join('')}</div>`
      +shelf('Daily Mix',mine.slice(0,20))
      +shelf('Made for you',mine.slice(0,20))
      +shelf('Hindi Mix',hindi)
      +shelf('English Mix',english)
      +shelf('New Releases',all.filter(s=>s.d).slice(0,20))
      +S.langs.map(l=>shelf(ln(l)+' Mix',langMix(l))).join('')
      +shelf('Popular Artists',grp('a',all).slice(0,15),([n,l])=>gc('a',n,l,1))
      +shelf('Albums',grp('al',all).filter(x=>x[0]&&x[1].length>1).slice(0,15),([n,l])=>gc('al',n,l));
    if(!all.length)h+='<p>No songs loaded. Check that songs.json and catalog.json are available on the deployed site.</p>'}
  else if(v=='search'){const q=$('#q').value.toLowerCase().trim();
    h=q?`<h2>Songs</h2>`+rows(all.filter(s=>(s.t+' '+s.a+' '+s.al).toLowerCase().includes(q)).slice(0,60))+shelf('Artists',grp('a',all.filter(s=>s.a.toLowerCase().includes(q))).slice(0,10),([n,l])=>gc('a',n,l,1))
      :`<h1>Browse all</h1><div class="tiles">${Object.keys(LN).map(k=>`<div class="tile" data-g="l" data-n="${k}">${LN[k]}</div>`).join('')}</div>`}
  else if(v=='mood'){h=`<h1>Mood</h1><p class="mood-intro">Pick a vibe. Your mixes are refreshed automatically as the music catalog grows.</p><div class="mood-grid">${MOODS.map((m,i)=>`<div class="mood-card mood-${i%8}" data-mood="${m.id}"><span>${m.emoji}</span><b>${esc(m.name)}</b><small>${esc(m.desc)}</small><em>${moodSongs(m.id).length} songs</em></div>`).join('')}</div>`}
  else{h=`<h1>Your Library</h1><div class="chips">${[['pl','Playlists'],['liked','Liked'],['al','Albums'],['ar','Artists']].map(([k,n])=>`<button data-lb="${k}" data-v="lib" class="${lb==k?'on':''}">${n}</button>`).join('')}</div>`;
    h+=lb=='liked'?rows(all.filter(s=>S.liked.includes(s.id))):lb=='al'?`<div class="shelf" style="flex-wrap:wrap">${grp('al',all).map(([n,l])=>gc('al',n,l)).join('')}</div>`:lb=='ar'?`<div class="shelf" style="flex-wrap:wrap">${grp('a',all).map(([n,l])=>gc('a',n,l,1)).join('')}</div>`
      :Object.entries(S.pls).map(([n,i])=>`<div class="row" data-g="pl" data-n="${esc(n)}"><span class="ph q" style="width:52px;border-radius:8px">♫</span><div><b>${esc(n)}</b><small>${i.length} songs</small></div></div>`).join('')||'<p>Add songs to a playlist with the ＋ button.</p>'}
  $('#view').innerHTML=h}
$('#q').addEventListener('input',()=>{v='search';det=null;render()});

document.addEventListener('click',e=>{const t=e.target.closest('[data-o],[data-lang],[data-art],[data-l],[data-a],[data-share],[data-g],[data-v],[data-back],[data-pa],[data-p],[data-mood]');if(!t)return;const d=t.dataset;
  if(d.o=='signup'||d.o=='login')ob('auth',d.o);
  else if(d.o=='guest'){S.user={n:'Guest'};save();next()}
  else if(d.o=='lc'){if(!S.langs.length)return toast('Pick at least one language');save();next()}
  else if(d.o=='done'){save();start()}
  else if(d.lang){const i=S.langs.indexOf(d.lang);i<0?S.langs.push(d.lang):S.langs.splice(i,1);t.classList.toggle('on')}
  else if(d.art!=null){const i=S.artists.indexOf(d.art);i<0?S.artists.push(d.art):S.artists.splice(i,1);t.classList.toggle('on')}
  else if(d.l){const i=S.liked.indexOf(d.l);i<0?S.liked.push(d.l):S.liked.splice(i,1);save();t.classList.toggle('on')}
  else if(d.a){const n=prompt('Add to playlist (type a name, new or existing):\n'+(Object.keys(S.pls).join(', ')||'No playlists yet'));if(n){S.pls[n]=S.pls[n]||[];if(!S.pls[n].includes(d.a))S.pls[n].push(d.a);save();toast('Added to '+n)}}
  else if(d.share){showShare(d.share)}
  else if(d.g){det={k:d.g,n:d.n};render()}
  else if(d.mood){det={k:'mood',n:d.mood};render()}
  else if(d.back!=null){det=null;render()}
  else if(d.v){v=d.v;if(d.lb)lb=d.lb;det=null;render()}
  else if(d.pa!=null){const l=[...document.querySelectorAll('.list [data-p]')].map(x=>x.dataset.p);if(l.length)play(l[0],l)}
  else if(d.p)play(d.p,[...(t.closest('.shelf,.list')||document).querySelectorAll('[data-p]')].map(x=>x.dataset.p))});
$('#me').onclick=()=>{if(confirm('Log out?')){S.user=null;save();yt&&yt.pauseVideo();$('#np').classList.remove('open');$('#mini').hidden=true;ob('w')}};

// Share any song. Native share sheet exposes installed apps supported by the device; direct web links are offered where available.
function songShareUrl(id){return 'https://youtu.be/'+encodeURIComponent(id)}
function showShare(id){
 const song=byId[id]; if(!song)return;
 document.querySelector('.share-pop')?.remove();
 const url=songShareUrl(id), message=`${song.t} — ${song.a} ${url}`;
 const pop=document.createElement('div');pop.className='share-pop glass';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Share song');
 pop.innerHTML=`<div class="share-head"><b>Share song</b><button type="button" data-share-close aria-label="Close">✕</button></div>
 <button type="button" data-share-action="native">📲 More apps…</button>
 <button type="button" data-share-action="whatsapp">🟢 WhatsApp</button>
 <button type="button" data-share-action="instagram">📸 Instagram</button>
 <button type="button" data-share-action="snapchat">👻 Snapchat</button>
 <button type="button" data-share-action="notes">📝 Notes</button>
 <button type="button" data-share-action="nearby">📡 Quick Share / AirDrop</button>
 <button type="button" data-share-action="copy">🔗 Copy link</button>`;
 document.body.append(pop);
 const close=()=>pop.remove();
 pop.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-share-action],[data-share-close]');if(!b)return;
  if(b.hasAttribute('data-share-close'))return close();
  const action=b.dataset.shareAction;
  try{
   if(action==='copy'){
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
    else {const ta=document.createElement('textarea');ta.value=url;document.body.append(ta);ta.select();document.execCommand('copy');ta.remove()}
    toast('Song link copied');close();return;
   }
   if(action==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener');return}
   // Instagram, Snapchat, Notes, Quick Share and AirDrop availability depends on OS/app support;
   // invoke the device share sheet instead of claiming a direct app integration.
   if(navigator.share){await navigator.share({title:song.t,text:`${song.t} — ${song.a}`,url});close()}
   else {if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);toast('Native sharing is unavailable here; song link copied instead');close()}
  }catch(err){if(err?.name!=='AbortError')toast('Could not share. Try Copy link.');}
 });
}
document.addEventListener('click',e=>{if(!e.target.closest('.share-pop')&&!e.target.closest('[data-share]'))document.querySelector('.share-pop')?.remove()});

// player (YouTube IFrame API: no key, no quota)
const onStateChange=e=>{const p=e.data==1;if(p)errs=0;$('#pp').textContent=$('#mp').textContent=p?'❚❚':'▶';if(e.data==0)step(1,1)};
const onError=()=>{if(++errs>4)return toast('Songs are not playing. Open the Vercel link, not a file.');toast("This song can't play here, skipping");setTimeout(()=>step(1),900)};
function play(id,q){if(q)queue=q;const s=byId[id];if(!s)return;cur=id;
  $('#nt').textContent=$('#mt').textContent=s.t;$('#na').textContent=$('#ma').textContent=s.a;$('#mi').src=th(id);$('#yl').href='https://youtu.be/'+id;$('#mini').hidden=false;
  if(!yt){if(!window.YT||!YT.Player)return toast('Player is loading, tap the song again');
    const f=document.createElement('iframe');f.allow='autoplay; encrypted-media; picture-in-picture';
    f.src=`https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1&playsinline=1&controls=0&rel=0&origin=${encodeURIComponent(location.origin)}`;$('#vid').append(f);
    yt=new YT.Player(f,{events:{onReady(){ready=1;yt.setVolume(Number($('#vol')?.value||70));if(pend&&pend!=id){yt.loadVideoById(pend)}pend=''},onStateChange,onError}});$('#np').classList.add('open')}
  else if(ready)yt.loadVideoById(id);else pend=id;
  if('mediaSession'in navigator){const M=navigator.mediaSession;M.metadata=new MediaMetadata({title:s.t,artist:s.a,artwork:[{src:th(id)}]});
    M.setActionHandler('previoustrack',()=>step(-1));M.setActionHandler('nexttrack',()=>step(1));M.setActionHandler('play',tog);M.setActionHandler('pause',tog)}}
function step(d,auto){if(!queue.length)return;if(auto&&rep==2){yt.seekTo(0);return yt.playVideo()}
  let i=queue.indexOf(cur);if(shuf)i=Math.floor(Math.random()*queue.length);else{i+=d;if(i>=queue.length){if(auto&&!rep)return;i=0}if(i<0)i=queue.length-1}
  play(queue[i])}
const tog=()=>ready&&(yt.getPlayerState()==1?yt.pauseVideo():yt.playVideo());
$('#pp').onclick=tog;$('#mp').onclick=e=>{e.stopPropagation();tog()};
$('#nx').onclick=$('#mx').onclick=e=>{e.stopPropagation();step(1)};$('#pv').onclick=$('#mv').onclick=e=>{e.stopPropagation();step(-1)};
$('#sh').onclick=e=>{shuf=!shuf;e.currentTarget.classList.toggle('on',shuf);toast('Shuffle '+(shuf?'on':'off'))};
$('#rp').onclick=e=>{rep=(rep+1)%3;const b=e.currentTarget;b.textContent=rep==2?'↻1':'↻';b.classList.toggle('on',rep>0);toast(['Repeat off','Repeat all','Repeat this song'][rep])};
$('#sl').onclick=()=>{slI=(slI+1)%4;clearTimeout(slT);const m=[0,15,30,60][slI];$('#sl').textContent='⏾ Sleep timer: '+(m?m+' min':'Off');
  if(m)slT=setTimeout(()=>{yt&&yt.pauseVideo();slI=0;$('#sl').textContent='⏾ Sleep timer: Off';toast('Sleep timer: music stopped')},m*6e4)};
$('#mini').onclick=()=>$('#np').classList.add('open');$('#cl').onclick=()=>$('#np').classList.remove('open');
$('#sk').oninput=e=>ready&&yt.seekTo(e.target.value/1000*yt.getDuration(),true);
$('#vol').oninput=e=>{if(ready&&yt.setVolume)yt.setVolume(Number(e.target.value));};
$('#add-current').onclick=e=>{e.stopPropagation();if(!cur)return toast('Play a song first');const n=prompt('Add current song to playlist (enter an existing name or a new name):',Object.keys(S.pls)[0]||'My Playlist');if(n&&n.trim()){const name=n.trim();S.pls[name]=S.pls[name]||[];if(!S.pls[name].includes(cur))S.pls[name].push(cur);save();toast('Added to '+name)}};
setInterval(()=>{if(!ready||!yt.getDuration)return;const d=yt.getDuration()||0,c=yt.getCurrentTime()||0;$('#sk').value=d?c/d*1000:0;$('#tm').textContent=fmt(c)+' / '+fmt(d)},500);
load();
