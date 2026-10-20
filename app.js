const L={hi:'Hindi',en:'English',gu:'Gujarati',pa:'Punjabi',ta:'Tamil',te:'Telugu',bn:'Bengali',mr:'Marathi',kn:'Kannada',ml:'Malayalam'};
const M={'🚗 Road Trip':/road|trip|safar|journey|drive|travel|musafir|highway|rasta/i,'🌙 Late Night':/night|raat|chill|lofi|lo-fi|slowed|reverb|midnight|sukoon/i,'🎉 Party':/party|dj|dance|nacho|club|remix|garba|dhol|bhangra|naach/i,'❤️ Love':/love|ishq|pyar|pyaar|dil|mohabbat|romantic|jaan|heart/i,'💔 Sad':/sad|dard|judai|bewafa|alone|akela|tanha|broken|cry/i,'💪 Workout':/gym|workout|power|energy|beast|rap|fire|attitude/i};
const $=s=>document.querySelector(s),T=['0','15','30','60'];
let S=null,all=[],view=[],shown=0,cur=-1,shuf=0,rep=0,P,pend,timer,ti=0;
try{S=JSON.parse(localStorage.bn||'null')}catch(e){}
const save=()=>localStorage.bn=JSON.stringify(S);
function chips(el,fn){el.innerHTML='';for(const k in L){const b=document.createElement('button');b.textContent=L[k];b.className=S.langs.includes(k)?'on':'';b.onclick=()=>{const i=S.langs.indexOf(k);i<0?S.langs.push(k):S.langs.length>1&&S.langs.splice(i,1);chips(el,fn);fn()};el.append(b)}}
async function load(){
  all=[];
  for(const l of S.langs){try{(await(await fetch('data/'+l+'.json')).json()).forEach(s=>all.push([...s,l]))}catch(e){}}
  all.sort((a,b)=>a[3]<b[3]?1:a[3]>b[3]?-1:0);
  show(all,'New releases');
}
function show(list,title){view=list;shown=0;$('#title').textContent=title;$('#list').innerHTML=list.length?'':'<p class="empty">No songs here yet. Run the “Daily songs” workflow on GitHub to fill the library.</p>';more()}
function more(){
  const b=view.slice(shown,shown+60);
  b.forEach((s,i)=>{const d=document.createElement('div'),k=shown+i;d.className='row';
    d.innerHTML='<img loading="lazy" alt=""><div><b></b><small></small></div>';
    d.querySelector('img').src='https://i.ytimg.com/vi/'+s[0]+'/default.jpg';
    d.querySelector('b').textContent=s[1];d.querySelector('small').textContent=s[2]+' · '+L[s[4]];
    d.onclick=()=>play(k);$('#list').append(d)});
  shown+=b.length;$('#more').hidden=shown>=view.length;
}
function play(i){cur=i;const s=view[i];$('#npt').textContent=s[1];$('#npa').textContent=s[2];P&&P.loadVideoById?P.loadVideoById(s[0]):pend=s[0]}
function next(auto){
  if(!view.length)return;if(auto&&rep==2)return play(cur);
  let i=shuf?Math.floor(Math.random()*view.length):cur+1;
  if(i>=view.length){if(!rep&&auto)return;i=0}play(i);
}
window.onYouTubeIframeAPIReady=()=>{P=new YT.Player('yt',{height:'62',width:'110',playerVars:{playsinline:1,controls:0,rel:0},events:{onReady:()=>pend&&P.loadVideoById(pend),onStateChange:e=>{$('#pp').textContent=e.data==1?'⏸':'▶';if(e.data==0)next(1)}}})};
const sc=document.createElement('script');sc.src='https://www.youtube.com/iframe_api';document.head.append(sc);
$('#pp').onclick=()=>P&&(P.getPlayerState()==1?P.pauseVideo():P.playVideo());
$('#nx').onclick=()=>next();$('#pv').onclick=()=>cur>0&&play(cur-1);$('#more').onclick=more;
$('#sh').onclick=e=>{shuf^=1;e.target.classList.toggle('on',!!shuf)};
$('#rp').onclick=e=>{rep=(rep+1)%3;e.target.textContent=rep==2?'🔂':'🔁';e.target.classList.toggle('on',rep>0)};
$('#sl').onclick=e=>{clearTimeout(timer);ti=(ti+1)%4;const m=+T[ti];e.target.textContent=m?'😴'+m:'😴';e.target.classList.toggle('on',!!m);if(m)timer=setTimeout(()=>{P&&P.pauseVideo();ti=0;e.target.textContent='😴';e.target.classList.remove('on')},m*6e4)};
$('#q').oninput=e=>{const q=e.target.value.toLowerCase().trim();q?show(all.filter(s=>(s[1]+' '+s[2]).toLowerCase().includes(q)),'Results'):show(all,'New releases')};
for(const n in M){const b=document.createElement('button');b.textContent=n;b.onclick=()=>show(all.filter(s=>M[n].test(s[1]+' '+s[2])),n);$('#moods').append(b)}
function init(){$('#ob').hidden=true;chips($('#langs'),()=>{save();load()});load()}
if(S)init();else{S={name:'',langs:['hi','en']};chips($('#ol'),()=>{});$('#go').onclick=()=>{S.name=$('#nm').value.trim();save();init()}}
