const $=s=>document.querySelector(s),L=localStorage;
let S={user:null,lang:'',artists:[],liked:[],pls:{},songs:[],users:{},...JSON.parse(L.gl||'{}')};
const save=()=>L.gl=JSON.stringify(S);
const LN={hi:'Hindi',gu:'Gujarati',en:'English',pa:'Punjabi',ta:'Tamil',te:'Telugu',mr:'Marathi',bn:'Bengali',es:'Spanish',ko:'Korean'};
let seed=[],all=[],byId={},queue=[],cur='',v='home',lg='all',det=null,yt,ready=0,pend='',shuf=0,rep=0;
const H=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const th=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
const toast=m=>{const t=$('#ts');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1800)};
const build=()=>{all=[...S.songs,...seed];byId={};all.forEach(s=>byId[s.id]=s)};

// ---- catalog: static seed + daily songs from /api/trending (cached 24h, ~1 quota unit/day) ----
async function load(){
  try{seed=await(await fetch('songs.json')).json()}catch{}
  try{const r=await(await fetch('/api/trending')).json();
    (r.items||[]).forEach(x=>{if(![...S.songs,...seed].some(s=>s.id===x.id))S.songs.unshift({...x,al:'New · '+r.date,d:r.date})});
    S.songs=S.songs.slice(0,600);save()}catch{}
  build();S.user?next():ob('w')}

// ---- onboarding ----
function ob(st,m){const o=$('#ob');$('#app').hidden=true;o.hidden=false;let h='';
  if(st=='w')h=`<div class="glass box"><h1>Glassify</h1><p>Music that's new every day.</p><button class="pri" data-o="signup">Sign up</button><button data-o="login">Log in</button><button data-o="guest">Continue as guest</button></div>`;
  if(st=='auth')h=`<form class="glass box" id="af"><h1>${m=='signup'?'Create account':'Welcome back'}</h1>${m=='signup'?'<input name=n placeholder="Name" required>':''}<input name=e type=email placeholder="Email" required><input name=p type=password minlength=6 placeholder="Password (6+ characters)" required><button class="pri">${m=='signup'?'Sign up':'Log in'}</button><small id="er"></small></form>`;
  if(st=='lang')h=`<div class="glass box"><h1>Pick your language</h1>${Object.entries(LN).map(([k,n])=>`<button data-lang="${k}">${n}</button>`).join('')}</div>`;
  if(st=='art'){const a=[...new Set(all.map(s=>s.a))].slice(0,24);
    h=`<div class="glass box"><h1>Pick favourite artists</h1><div class="chips" style="flex-wrap:wrap">${a.map(x=>`<button data-art="${esc(x)}">${esc(x)}</button>`).join('')}</div><button class="pri" data-o="done">Continue</button></div>`}
  o.innerHTML=h}
function next(){!S.lang?ob('lang'):!S.artists.length?ob('art'):start()}
function start(){$('#ob').hidden=true;$('#app').hidden=false;$('#me').textContent=(S.user.n||'G')[0].toUpperCase();render()}
document.addEventListener('submit',async e=>{if(e.target.id!='af')return;e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target)),h=await H(f.p),u=S.users[f.e];
  if(f.n){if(u)return $('#er').textContent='This email already has an account.';S.users[f.e]={n:f.n,h}}
  else if(!u||u.h!=h)return $('#er').textContent='Wrong email or password.';
  S.user={e:f.e,n:S.users[f.e].n};save();next()});

// ---- views (all client-side: zero API calls) ----
const row=s=>`<div class="row" data-p="${s.id}"><img src="${th(s.id)}" loading="lazy" alt=""><div><b>${esc(s.t)}</b><small>${esc(s.a)}</small></div><button data-l="${s.id}" class="${S.liked.includes(s.id)?'on':''}" aria-label="Like">♥</button><button data-a="${s.id}" aria-label="Add to playlist">＋</button></div>`;
const sec=(t,l)=>l.length?`<h2>${t}</h2>`+l.map(row).join(''):'';
const chips=()=>`<div class="chips">${['all',...new Set(all.map(s=>s.l))].map(c=>`<button data-c="${c}" class="${c==lg?'on':''}">${c=='all'?'All':LN[c]||c.toUpperCase()}</button>`).join('')}</div>`;
function grid(k,a){const g={};a.forEach(s=>(g[s[k]]=g[s[k]]||[]).push(s));
  return`<div class="grid">${Object.entries(g).map(([n,l])=>`<div class="card glass" data-g="${k}" data-n="${esc(n)}"><img src="${th(l[0].id)}" alt=""><b>${esc(n)}</b><small>${l.length} songs</small></div>`).join('')}</div>`}
function render(){const a=all.filter(s=>lg=='all'||s.l==lg);let h='';
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v==v));
  if(det)h=`<button data-back>‹ Back</button><h2>${esc(det.n)}</h2>`+all.filter(s=>s[det.k]==det.n).map(row).join('');
  else if(v=='home'){const ld=S.songs[0]?.d;h=chips()+sec('Made for you',a.filter(s=>S.artists.includes(s.a)||s.l==S.lang).slice(0,12))+sec('New today',a.filter(s=>s.d&&s.d==ld).slice(0,15))+sec('All songs',a)}
  else if(v=='search'){const q=$('#q').value.toLowerCase().trim();h=chips()+(q?sec('Results',a.filter(s=>(s.t+' '+s.a+' '+s.al).toLowerCase().includes(q)))||'<p>No songs found.</p>':'<p>Type a song, artist or album above.</p>')}
  else if(v=='lib'){const l=all.filter(s=>S.liked.includes(s.id));h=sec('Liked songs',l)+Object.entries(S.pls).map(([n,ids])=>sec('♫ '+esc(n),ids.map(i=>byId[i]).filter(Boolean))).join('');if(!h)h='<p>Like songs with ♥ or add them to a playlist with ＋.</p>'}
  else if(v=='albums')h=chips()+grid('al',a);
  else h=chips()+grid('a',a);
  $('#view').innerHTML=h}
$('#q').addEventListener('input',()=>{v='search';det=null;render()});

document.addEventListener('click',e=>{const t=e.target.closest('[data-o],[data-lang],[data-art],[data-l],[data-a],[data-c],[data-g],[data-v],[data-back],[data-p]');if(!t)return;const d=t.dataset;
  if(d.o=='signup'||d.o=='login')ob('auth',d.o);
  else if(d.o=='guest'){S.user={n:'Guest'};save();next()}
  else if(d.o=='done'){if(!S.artists.length)return toast('Pick at least one artist');save();start()}
  else if(d.lang){S.lang=d.lang;save();next()}
  else if(d.art!=null){const i=S.artists.indexOf(d.art);i<0?S.artists.push(d.art):S.artists.splice(i,1);t.classList.toggle('on')}
  else if(d.l){const i=S.liked.indexOf(d.l);i<0?S.liked.push(d.l):S.liked.splice(i,1);save();t.classList.toggle('on')}
  else if(d.a){const n=prompt('Add to playlist (type a name, new or existing):\n'+(Object.keys(S.pls).join(', ')||'No playlists yet'));if(n){S.pls[n]=S.pls[n]||[];if(!S.pls[n].includes(d.a))S.pls[n].push(d.a);save();toast('Added to '+n)}}
  else if(d.c){lg=d.c;render()}
  else if(d.g){det={k:d.g,n:d.n};render()}
  else if(d.back!=null){det=null;render()}
  else if(d.v){v=d.v;det=null;render()}
  else if(d.p)play(d.p,[...document.querySelectorAll('.row')].map(r=>r.dataset.p))});
$('#me').onclick=()=>{if(confirm('Log out?')){S.user=null;save();yt&&yt.pauseVideo();$('#np').classList.remove('open');$('#mini').hidden=true;ob('w')}};

// ---- player (YouTube IFrame API: no API key, no quota) ----
window.onYouTubeIframeAPIReady=()=>{yt=new YT.Player('yt',{width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,controls:0,modestbranding:1},events:{
  onReady(){ready=1;yt.setVolume($('#vo').value);if(pend)play(pend)},
  onStateChange(e){const p=e.data==1;$('#pp').textContent=$('#mp').textContent=p?'❚❚':'▶';if(e.data==0)step(1,1)}}})};
function play(id,q){if(q)queue=q;cur=id;const s=byId[id];if(!s)return;
  $('#nt').textContent=$('#mt').textContent=s.t;$('#na').textContent=$('#ma').textContent=s.a;$('#mi').src=th(id);$('#mini').hidden=false;
  if(ready){yt.loadVideoById(id);pend=''}else pend=id;
  if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:s.t,artist:s.a,artwork:[{src:th(id)}]});
    navigator.mediaSession.setActionHandler('previoustrack',()=>step(-1));navigator.mediaSession.setActionHandler('nexttrack',()=>step(1))}}
function step(d,auto){if(!queue.length)return;if(rep&&auto)return yt.playVideo(yt.seekTo(0));
  const i=queue.indexOf(cur);play(queue[shuf?Math.floor(Math.random()*queue.length):(i+d+queue.length)%queue.length])}
const tog=()=>ready&&yt.getPlayerState()==1?yt.pauseVideo():(cur?yt.playVideo():0);
$('#pp').onclick=$('#mp').onclick=e=>{e.stopPropagation();tog()};
$('#nx').onclick=()=>step(1);$('#pv').onclick=()=>step(-1);
$('#sh').onclick=e=>{shuf=!shuf;e.currentTarget.classList.toggle('on',shuf)};
$('#rp').onclick=e=>{rep=!rep;e.currentTarget.classList.toggle('on',rep)};
$('#mini').onclick=()=>$('#np').classList.add('open');$('#cl').onclick=()=>$('#np').classList.remove('open');
$('#sk').oninput=e=>ready&&yt.seekTo(e.target.value/1000*yt.getDuration(),true);
$('#vo').oninput=e=>ready&&yt.setVolume(e.target.value);
setInterval(()=>{if(!ready||!yt.getDuration)return;const d=yt.getDuration()||0,c=yt.getCurrentTime()||0;$('#sk').value=d?c/d*1000:0;$('#tm').textContent=fmt(c)+' / '+fmt(d)},500);
load();
