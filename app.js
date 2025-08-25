/* ---------- Static demo data so the page always renders ---------- */
const players = [
  {
    id:"bellinger",
    name:"Cody Bellinger",
    graduatingClass:2013,
    currentLevel:"MLB",
    position:"CF/1B",
    team:"New York Yankees",
    frontImg:"https://i.postimg.cc/Y2PVpqNK/new-york-yankees-outfielder-cody-bellinger.jpg",
    highSchoolImg:"https://i.postimg.cc/z3h5j6H9/Bellinger-Hamilton-HS.jpg",
    seasonStats:{avg:"—",hr:"—",rbi:"—",ops:"—"},
    lastGame:{line:"—"}, nextGame:{opponent:"—",time:"—"}
  },
  {
    id:"patrick-murphy",
    name:"Patrick Murphy",
    graduatingClass:2013,
    currentLevel:"KBO",
    position:"P",
    team:"KT Wiz Suwon",
    frontImg:"https://i.postimg.cc/gc32dtQG/MURPH.avif",
    highSchoolImg:"https://i.postimg.cc/pL6kR3Fq/21-Murphy-Back-page-00001.jpg",
    seasonStats:{era:"—",so:"—",whip:"—"},
    lastGame:{line:"—"}, nextGame:{opponent:"—",time:"—"}
  },
  {
    id:"dom-hamel",
    name:"Dom Hamel",
    graduatingClass:2017,
    currentLevel:"AAA",
    position:"P",
    team:"Syracuse Mets",
    frontImg:"https://i.postimg.cc/Vv9fR5nJ/dom.webp",
    highSchoolImg:"https://i.postimg.cc/85zK09qS/23-Hamel-Back-page-00001.jpg",
    seasonStats:{era:"—",k9:"—",wl:"—"},
    lastGame:{line:"—"}, nextGame:{opponent:"—",time:"—"}
  }
];

/* ---------- Helpers ---------- */
const levelColors = {
  mlb:"#7A0019", aaa:"#2563eb", aa:"#3b82f6", "a+":"%234f46e5", a:"#4338ca",
  ncaa:"#166534", njcaa:"#a16207", naia:"#92400e", indy:"#3f6212", kbo:"#0ea5e9"
};
const $ = sel => document.querySelector(sel);
function tagColor(level){
  const k=String(level||"").toLowerCase();
  return levelColors[k] || "#7A0019";
}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]))}
function safeImg(el, src, alt){
  el.src = src; el.alt = alt;
  el.onerror = () => {
    const ph = document.createElement('div');
    ph.style.cssText = "background:#e5e7eb;border-radius:8px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px";
    ph.textContent = "Image unavailable";
    el.replaceWith(ph);
  };
}

/* ---------- Rendering ---------- */
function makeCard(p){
  const tpl = document.getElementById('player-card-template');
  const node = tpl.content.firstElementChild.cloneNode(true);

  // sides
  const imgFront = node.querySelector('.s1 .img');
  safeImg(imgFront, p.frontImg, p.name);

  const tagFront = node.querySelector('.s1 .tag');
  tagFront.textContent = p.currentLevel || '';
  tagFront.style.background = tagColor(p.currentLevel);

  node.querySelector('.s1 .name').textContent = p.name;
  node.querySelector('.s1 .meta').textContent = `${p.team} • ${p.position}`;
  node.querySelector('.s1 .last-game').textContent = p.lastGame?.line || '—';
  node.querySelector('.s1 .next-game').textContent = `${p.nextGame?.opponent||'—'} • ${p.nextGame?.time||'—'}`;

  // side 2
  node.querySelector('.s2 .name').textContent = p.name;
  node.querySelector('.s2 .meta').textContent = `${p.team} • ${p.position}`;
  const tag2 = node.querySelector('.s2 .tag');
  tag2.textContent = p.currentLevel || '';
  tag2.style.background = tagColor(p.currentLevel);

  const kvs = node.querySelector('.s2 .kvs');
  const isPitcher = /\bp\b|pitch/i.test(p.position||'');
  kvs.innerHTML = isPitcher
    ? `
      <div class="kv"><div class="k">ERA</div><div class="v">${esc(p.seasonStats?.era||'—')}</div></div>
      <div class="kv"><div class="k">SO/K9</div><div class="v">${esc(p.seasonStats?.so||p.seasonStats?.k9||'—')}</div></div>
      <div class="kv"><div class="k">WHIP/W‑L</div><div class="v">${esc(p.seasonStats?.whip||p.seasonStats?.wl||'—')}</div></div>
      <div class="kv"><div class="k">Class</div><div class="v">${esc(p.graduatingClass||'—')}</div></div>`
    : `
      <div class="kv"><div class="k">AVG</div><div class="v">${esc(p.seasonStats?.avg||'—')}</div></div>
      <div class="kv"><div class="k">HR</div><div class="v">${esc(p.seasonStats?.hr||'—')}</div></div>
      <div class="kv"><div class="k">RBI</div><div class="v">${esc(p.seasonStats?.rbi||'—')}</div></div>
      <div class="kv"><div class="k">OPS</div><div class="v">${esc(p.seasonStats?.ops||'—')}</div></div>`;

  node.querySelector('.s2 .muted:last-child').textContent = `Hamilton Class of ${p.graduatingClass||'—'}`;

  // side 3 (HS image or placeholder)
  const s3Box = node.querySelector('.s3 .imgbox');
  if (p.highSchoolImg){
    const hs = document.createElement('img');
    hs.className = 'img';
    safeImg(hs, p.highSchoolImg, `${p.name} — Hamilton HS`);
    s3Box.appendChild(hs);
  } else {
    const ph = document.createElement('div');
    ph.className = 'img';
    ph.style.display = 'flex';
    ph.style.alignItems = 'center';
    ph.style.justifyContent = 'center';
    ph.style.color = '#6b7280';
    ph.style.fontSize = '12px';
    ph.style.background = '#e5e7eb';
    ph.textContent = 'No HS image yet';
    s3Box.appendChild(ph);
  }

  return node;
}

function render(list){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(p => frag.appendChild(makeCard(p)));
  grid.appendChild(frag);
}

function populateFilters(){
  const classes=[...new Set(players.map(p=>p.graduatingClass))].filter(Boolean).sort((a,b)=>b-a);
  const levels=[...new Set(players.map(p=>p.currentLevel))];

  const gf=document.getElementById('grad');
  classes.forEach(c=>{const o=document.createElement('option'); o.value=c; o.textContent=c; gf.appendChild(o);});
  const lf=document.getElementById('lvl');
  levels.forEach(l=>{const o=document.createElement('option'); o.value=l; o.textContent=l; lf.appendChild(o);});
}

function applyFilters(){
  const q=($('#q').value||'').toLowerCase();
  const g=$('#grad').value;
  const l=$('#lvl').value;
  const list=players.filter(p =>
    (!q || p.name.toLowerCase().includes(q)) &&
    (!g || String(p.graduatingClass)===g) &&
    (!l || p.currentLevel===l)
  );
  render(list);
}

/* Flip interaction: right half = next side; left half = previous */
function rotate(card, right){
  if(card.classList.contains('rot0')) card.classList.replace('rot0', right?'rot120':'rot240');
  else if(card.classList.contains('rot120')) card.classList.replace('rot120', right?'rot240':'rot0');
  else card.classList.replace('rot240', right?'rot0':'rot120');
}
document.addEventListener('click', (e)=>{
  const card=e.target.closest('.card');
  if(!card) return;
  const r=card.getBoundingClientRect();
  const right=(e.clientX - r.left) > r.width/2;
  rotate(card,right);
});
document.addEventListener('keydown', (e)=>{
  if(!['ArrowLeft','ArrowRight'].includes(e.key)) return;
  const card=document.activeElement?.closest?.('.card'); if(!card) return;
  rotate(card, e.key==='ArrowRight');
});

/* Init */
populateFilters();
render(players);

/* --- HOW TO ADD YOUR 32 PLAYERS ---
1) Replace the 'players' array above with your 32 entries.
   Use the same keys:
   {
     id:"slug",
     name:"Full Name",
     graduatingClass:2021,
     currentLevel:"AAA|AA|MLB|NCAA|NJCAA|KBO|A|A+|INDY",
     position:"P/IF/OF",
     team:"Organization / School",
     frontImg:"https://...jpg",
     highSchoolImg:"https://...jpg",
     seasonStats:{avg:"—",hr:"—",rbi:"—",ops:"—"} // or {era:"—",so:"—",whip:"—"}
   }
2) Commit. GitHub Pages will refresh automatically.
*/