const $=s=>document.querySelector(s),L=localStorage;
let S={user:null,langs:[],artists:[],liked:[],pls:{},users:{},...JSON.parse(L.gl||'{}')};
if(!S.langs.length&&S.lang)S.langs=[S.lang];
const save=()=>L.gl=JSON.stringify(S);
const LN={hi:'Hindi',en:'English',gu:'Gujarati',pa:'Punjabi',mr:'Marathi',ta:'Tamil',te:'Telugu',bn:'Bengali',kn:'Kannada',ml:'Malayalam',bh:'Bhojpuri',har:'Haryanvi',es:'Spanish',ko:'Korean'};
let all=[],byId={},queue=[],cur='',v='home',lb='pl',det=null,yt,ready=0,pend='',shuf=0,rep=0,errs=0,slT,slI=0;
const H=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const th=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`,esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'),ln=c=>LN[c]||String(c).toUpperCase();
const toast=m=>{const t=$('#ts');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2600)};
const grp=(k,a)=>{const g={};a.forEach(s=>(g[s[k]]=g[s[k]]||[]).push(s));return Object.entries(g).sort((x,y)=>y[1].length-x[1].length)};

// catalog = songs.json (seed) + catalog.json (filled daily by GitHub Action) + /api/trending (cached). No API calls for search/filter/etc.
async function load(){
  if(location.protocol=='file:')alert('Open the site from your Vercel link (or a local server). YouTube will not play from a file.');
  const j=async u=>{try{return await(await fetch(u)).json()}catch{return null}};
  const [a,c,t]=await Promise.all([j('songs.json'),j('catalog.json'),j('/api/trending')]),m=new Map();
  [...(c||[]),...(t?.items||[]).map(x=>({...x,al:'Trending · '+t.date,d:t.date})),...(a||[])].forEach(s=>{if(s.id&&!m.has(s.id))m.set(s.id,s)});
  all=[...m.values()].sort((x,y)=>(y.d||'').localeCompare(x.d||''));byId={};all.forEach(s=>byId[s.id]=s);
  S.user?next():ob('w')}

// onboarding
function ob(st,m){const o=$('#ob');$('#app').hidden=true;o.hidden=false;let h='';
  if(st=='w')h=`<div class="glass box"><h1>▲ Himalaya Music</h1><p>Music that's new every day.</p><button class="pri" data-o="signup">Sign up</button><button data-o="login">Log in</button><button data-o="guest">Continue as guest</button></div>`;
  if(st=='auth')h=`<form class="glass box" id="af"><h1>${m=='signup'?'Create account':'Welcome back'}</h1>${m=='signup'?'<input name=n placeholder="Name" required>':''}<input name=e type=email placeholder="Email" required><input name=p type=password minlength=6 placeholder="Password (6+ characters)" required><button class="pri">${m=='signup'?'Sign up':'Log in'}</button><small id="er"></small></form>`;
  if(st=='lang')h=`<div class="glass box"><h1>Which languages do you like?</h1><p>Pick one or more. We'll suggest songs in them.</p><div class="langs">${Object.entries(LN).map(([k,n])=>`<button data-lang="${k}" class="${S.langs.includes(k)?'on':''}">${n}</button>`).join('')}</div><button class="pri" data-o="lc">Continue</button></div>`;
  if(st=='art'){const b=all.filter(s=>S.langs.includes(s.l)),a=grp('a',b.length?b:all).slice(0,18);
    h=`<div class="glass box"><h1>Pick your favourite artists</h1><div class="pick">${a.map(([n,l])=>`<div class="c rd ${S.artists.includes(n)?'on':''}" data-art="${esc(n)}"><img src="${th(l[0].id)}" alt=""><b>${esc(n)}</b></div>`).join('')}</div><button class="pri" data-o="done">Done</button></div>`}
  o.innerHTML=h}
function next(){!S.langs.length?ob('lang'):!S.artists.length?ob('art'):start()}
function start(){$('#ob').hidden=true;$('#app').hidden=false;$('#me').textContent=(S.user.n||'G')[0].toUpperCase();render()}
document.addEventListener('submit',async e=>{if(e.target.id!='af')return;e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target)),h=await H(f.p),u=S.users[f.e];
  if(f.n){if(u)return $('#er').textContent='This email already has an account.';S.users[f.e]={n:f.n,h}}
  else if(!u||u.h!=h)return $('#er').textContent='Wrong email or password.';
  S.user={e:f.e,n:S.users[f.e].n};save();next()});

// views (all client-side)
const row=s=>`<div class="row" data-p="${s.id}"><img src="${th(s.id)}" loading="lazy" alt=""><div><b>${esc(s.t)}</b><small>${esc(s.a)} · ${ln(s.l)}</small></div><button data-l="${s.id}" class="${S.liked.includes(s.id)?'on':''}" aria-label="Like">♥</button><button data-a="${s.id}" aria-label="Add to playlist">＋</button></div>`;
const rows=l=>l.length?`<div class="list">${l.map(row).join('')}</div>`:'<p>Nothing here yet.</p>';
const card=s=>`<div class="c" data-p="${s.id}"><img src="${th(s.id)}" loading="lazy" alt=""><b>${esc(s.t)}</b><small>${esc(s.a)}</small></div>`;
const gc=(k,n,l,r)=>`<div class="c ${r?'rd':''}" data-g="${k}" data-n="${esc(n)}"><img src="${th(l[0].id)}" loading="lazy" alt=""><b>${esc(n)}</b><small>${l.length} songs</small></div>`;
const shelf=(t,l,f)=>l.length?`<h2>${t}</h2><div class="shelf">${l.map(f||card).join('')}</div>`:'';
function render(){let h='';const mine=all.filter(s=>S.langs.includes(s.l)||S.artists.includes(s.a)),hr=new Date().getHours();
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v==v));
  if(det){const l=det.k=='pl'?S.pls[det.n].map(i=>byId[i]).filter(Boolean):all.filter(s=>s[det.k]==det.n);
    h=`<button data-back>‹ Back</button><h1 style="margin-top:14px">${esc(det.k=='l'?ln(det.n)+' songs':det.n)}</h1><button class="pri" data-pa>▶ Play all</button>${rows(l)}`}
  else if(v=='home'){const ql=S.langs.map(l=>all.find(s=>s.l==l)).filter(Boolean).slice(0,5);
    h=`<h1>${hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'}</h1><div class="qg"><div class="q" data-v="lib" data-lb="liked"><span class="ph">♥</span>Liked Songs</div>${ql.map(s=>`<div class="q" data-g="l" data-n="${s.l}"><img src="${th(s.id)}" alt="">${ln(s.l)} mix</div>`).join('')}</div>`
      +shelf('Made for you',mine.slice(0,20))+shelf('New releases',all.filter(s=>s.d).slice(0,20))
      +S.langs.map(l=>shelf(ln(l)+' hits',all.filter(s=>s.l==l).slice(0,20))).join('')
      +shelf('Popular artists',grp('a',all).slice(0,15),([n,l])=>gc('a',n,l,1))+shelf('Albums',grp('al',all).filter(x=>x[1].length>1).slice(0,15),([n,l])=>gc('al',n,l));
    if(!all.length)h+='<p>No songs yet. Add your YouTube key to start filling the catalog.</p>'}
  else if(v=='search'){const q=$('#q').value.toLowerCase().trim();
    h=q?`<h2>Songs</h2>`+rows(all.filter(s=>(s.t+' '+s.a+' '+s.al).toLowerCase().includes(q)).slice(0,60))+shelf('Artists',grp('a',all.filter(s=>s.a.toLowerCase().includes(q))).slice(0,10),([n,l])=>gc('a',n,l,1))
      :`<h1>Browse all</h1><div class="tiles">${Object.keys(LN).map(k=>`<div class="tile" data-g="l" data-n="${k}">${LN[k]}</div>`).join('')}</div>`}
  else{h=`<h1>Your Library</h1><div class="chips">${[['pl','Playlists'],['liked','Liked'],['al','Albums'],['ar','Artists']].map(([k,n])=>`<button data-lb="${k}" data-v="lib" class="${lb==k?'on':''}">${n}</button>`).join('')}</div>`;
    h+=lb=='liked'?rows(all.filter(s=>S.liked.includes(s.id))):lb=='al'?`<div class="shelf" style="flex-wrap:wrap">${grp('al',all).map(([n,l])=>gc('al',n,l)).join('')}</div>`:lb=='ar'?`<div class="shelf" style="flex-wrap:wrap">${grp('a',all).map(([n,l])=>gc('a',n,l,1)).join('')}</div>`
      :Object.entries(S.pls).map(([n,i])=>`<div class="row" data-g="pl" data-n="${esc(n)}"><span class="ph q" style="width:52px;border-radius:8px">♫</span><div><b>${esc(n)}</b><small>${i.length} songs</small></div></div>`).join('')||'<p>Add songs to a playlist with the ＋ button.</p>'}
  $('#view').innerHTML=h}
$('#q').addEventListener('input',()=>{v='search';det=null;render()});

document.addEventListener('click',e=>{const t=e.target.closest('[data-o],[data-lang],[data-art],[data-l],[data-a],[data-g],[data-v],[data-back],[data-pa],[data-p]');if(!t)return;const d=t.dataset;
  if(d.o=='signup'||d.o=='login')ob('auth',d.o);
  else if(d.o=='guest'){S.user={n:'Guest'};save();next()}
  else if(d.o=='lc'){if(!S.langs.length)return toast('Pick at least one language');save();next()}
  else if(d.o=='done'){if(!S.artists.length)return toast('Pick at least one artist');save();start()}
  else if(d.lang){const i=S.langs.indexOf(d.lang);i<0?S.langs.push(d.lang):S.langs.splice(i,1);t.classList.toggle('on')}
  else if(d.art!=null){const i=S.artists.indexOf(d.art);i<0?S.artists.push(d.art):S.artists.splice(i,1);t.classList.toggle('on')}
  else if(d.l){const i=S.liked.indexOf(d.l);i<0?S.liked.push(d.l):S.liked.splice(i,1);save();t.classList.toggle('on')}
  else if(d.a){const n=prompt('Add to playlist (type a name, new or existing):\n'+(Object.keys(S.pls).join(', ')||'No playlists yet'));if(n){S.pls[n]=S.pls[n]||[];if(!S.pls[n].includes(d.a))S.pls[n].push(d.a);save();toast('Added to '+n)}}
  else if(d.g){det={k:d.g,n:d.n};render()}
  else if(d.back!=null){det=null;render()}
  else if(d.v){v=d.v;if(d.lb)lb=d.lb;det=null;render()}
  else if(d.pa!=null){const l=[...document.querySelectorAll('.list [data-p]')].map(x=>x.dataset.p);if(l.length)play(l[0],l)}
  else if(d.p)play(d.p,[...(t.closest('.shelf,.list')||document).querySelectorAll('[data-p]')].map(x=>x.dataset.p))});
$('#me').onclick=()=>{if(confirm('Log out?')){S.user=null;save();yt&&yt.pauseVideo();$('#np').classList.remove('open');$('#mini').hidden=true;ob('w')}};

// player (YouTube IFrame API: no key, no quota)
const onStateChange=e=>{const p=e.data==1;if(p)errs=0;$('#pp').textContent=$('#mp').textContent=p?'❚❚':'▶';if(e.data==0)step(1,1)};
const onError=()=>{if(++errs>4)return toast('Songs are not playing. Open the Vercel link, not a file.');toast("This song can't play here, skipping");setTimeout(()=>step(1),900)};
function play(id,q){if(q)queue=q;const s=byId[id];if(!s)return;cur=id;
  $('#nt').textContent=$('#mt').textContent=s.t;$('#na').textContent=$('#ma').textContent=s.a;$('#mi').src=th(id);$('#yl').href='https://youtu.be/'+id;$('#mini').hidden=false;
  if(!yt){if(!window.YT||!YT.Player)return toast('Player is loading, tap the song again');
    const f=document.createElement('iframe');f.allow='autoplay; encrypted-media; picture-in-picture';
    f.src=`https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1&playsinline=1&controls=0&rel=0&origin=${encodeURIComponent(location.origin)}`;$('#vid').append(f);
    yt=new YT.Player(f,{events:{onReady(){ready=1;if(pend&&pend!=id){yt.loadVideoById(pend)}pend=''},onStateChange,onError}});$('#np').classList.add('open')}
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
setInterval(()=>{if(!ready||!yt.getDuration)return;const d=yt.getDuration()||0,c=yt.getCurrentTime()||0;$('#sk').value=d?c/d*1000:0;$('#tm').textContent=fmt(c)+' / '+fmt(d)},500);
load();
