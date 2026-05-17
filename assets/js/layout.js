// Shared layout wiring for YAT?STATS microsite pages
// Relies on window.SCHOOL_CONFIG populated by school-config.js

const NAV_ITEMS = [
  { href: 'index.html', thin: 'WHERE THEY', bold: 'YAT?' },
  { href: 'alumni-news.html', thin: 'ACTIVE ALUMNI', bold: 'NEWS' },
  { href: 'current-team.html', thin: 'THE', bold: 'CURRENT TEAM' },
  { href: 'marketplace.html', thin: 'MENTORSHIP', bold: 'MARKETPLACE' },
  { href: 'all-time-list.html', thin: 'NEXT-LEVEL', bold: 'ALL-TIME LIST' },
  { href: 'partner-program.html', thin: 'PCD ACTION', bold: 'PARTNER PROGRAM' },
  { href: 'faq.html', thin: '', bold: 'FAQ’S' },
];

let galleryFlipAllActive = false;
let galleryFlipAllObserver = null;
let journeyIntroObserver = null;

function tokenReplace(str, config){
  return str
    .replace(/\{\{SCHOOL_NAME\}\}/gi, config.name || '')
    .replace(/\{\{SCHOOL_NAME_UPPER\}\}/gi, (config.name || '').toUpperCase())
    .replace(/\{\{CITY_STATE\}\}/gi, config.city_state || '')
    .replace(/\{\{TAGLINE\}\}/gi, config.tagline || '')
    .replace(/\{\{HSID\}\}/gi, config.hsid || '');
}

function replaceTokensInNode(node, config){
  if(node.nodeType===Node.TEXT_NODE){
    const next=tokenReplace(node.textContent, config);
    if(next!==node.textContent) node.textContent=next;
    return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE) return;
  if(node.tagName==='SCRIPT' || node.tagName==='STYLE') return;
  node.childNodes.forEach((child)=>replaceTokensInNode(child, config));
}

function renderNavLinks(container) {
  if (!container) return;
  container.innerHTML = NAV_ITEMS.map((item) => {
    const thin = item.thin ? `<span class="thin">${item.thin}</span>` : '';
    return `<a href="${item.href}" class="nav-pair">${thin}<span class="bold">${item.bold}</span></a>`;
  }).join('');
}

function applySchoolBranding(root = document) {
  const config = window.SCHOOL_CONFIG || {};
  root.querySelectorAll('[data-school-crest]').forEach((img) => {
    img.src = config.crest;
    img.alt = config.crestAlt;
  });
  root.querySelectorAll('[data-school-name]').forEach((el) => {
    el.textContent = (config.name || '').toUpperCase();
  });
  root.querySelectorAll('[data-school-city]').forEach((el) => {
    el.textContent = config.city_state || '';
  });
  root.querySelectorAll('[data-school-tagline]').forEach((el) => {
    el.textContent = config.tagline || '';
  });
  root.querySelectorAll('[data-tokenize]').forEach((el) => replaceTokensInNode(el, config));
  document.title = tokenReplace(document.title, config)
    .replace(/Hamilton High School/gi, config.name || '')
    .replace(/Hamilton/gi, config.name || '')
    .replace(/CHANDLER, AZ/gi, config.city_state || '')
    .replace(/5004/gi, config.hsid || '');
}

function setGalleryCardsFlipped(shouldFlip) {
  document.querySelectorAll('#cardGrid .card').forEach((card) => {
    card.classList.toggle('is-flipped', shouldFlip);
  });
}

function syncGalleryFlipAllButton() {
  const btn = document.querySelector('#flipAllCards');
  if (!btn) return;

  btn.setAttribute('aria-pressed', String(galleryFlipAllActive));
  btn.setAttribute(
    'aria-label',
    galleryFlipAllActive ? 'Flip all cards to front' : 'Flip all cards to back'
  );
  btn.title = galleryFlipAllActive ? 'Flip all to front' : 'Flip all to back';

  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = galleryFlipAllActive ? 'ri-arrow-go-back-line' : 'ri-flip-horizontal-line';
  }
}

function setupGalleryFlipAll() {
  const grid = document.querySelector('#cardGrid');
  const heroActions = document.querySelector('.hero-right');
  if (!grid || !heroActions || document.querySelector('#flipAllCards')) return;

  const btn = document.createElement('button');
  btn.id = 'flipAllCards';
  btn.type = 'button';
  btn.className = 'hero-icon icon-btn';
  btn.innerHTML = '<i class="ri-flip-horizontal-line"></i>';

  heroActions.prepend(btn);
  syncGalleryFlipAllButton();

  btn.addEventListener('click', () => {
    galleryFlipAllActive = !galleryFlipAllActive;
    setGalleryCardsFlipped(galleryFlipAllActive);
    syncGalleryFlipAllButton();
  });

  if (galleryFlipAllObserver) galleryFlipAllObserver.disconnect();
  galleryFlipAllObserver = new MutationObserver(() => {
    if (galleryFlipAllActive) setGalleryCardsFlipped(true);
  });
  galleryFlipAllObserver.observe(grid, { childList: true });
}

function injectJourneyIntroStyles() {
  if (document.querySelector('#journeyIntroStyles')) return;

  const style = document.createElement('style');
  style.id = 'journeyIntroStyles';
  style.textContent = `
    .journey-intro-card{
      position:relative;
      aspect-ratio:16/9;
      width:100%;
      overflow:hidden;
      margin:0 0 12px;
      border:1px solid var(--line);
      border-radius:16px;
      background:#101010;
      box-shadow:0 8px 18px rgba(0,0,0,.35);
      isolation:isolate;
    }
    .journey-intro-card::before{
      content:'';
      position:absolute;
      inset:0;
      background:linear-gradient(90deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,.10) 38%,rgba(0,0,0,.46) 100%);
      z-index:1;
    }
    .journey-intro-bg{
      position:absolute;
      inset:-10%;
      width:120%;
      height:120%;
      object-fit:cover;
      filter:blur(14px) saturate(1.05) brightness(.74);
      transform:scale(1.05);
      z-index:0;
    }
    .journey-intro-player{
      position:absolute;
      left:2.5%;
      bottom:0;
      width:36%;
      height:94%;
      z-index:3;
      display:flex;
      align-items:flex-end;
      justify-content:center;
      pointer-events:none;
    }
    .journey-intro-player img{
      max-width:100%;
      height:100%;
      object-fit:cover;
      object-position:top center;
      border-radius:12px 12px 0 0;
      filter:drop-shadow(0 12px 20px rgba(0,0,0,.55));
    }
    .journey-intro-copy{
      position:absolute;
      top:8%;
      right:6%;
      width:56%;
      z-index:4;
      text-align:center;
      color:#fff;
      text-shadow:0 2px 8px rgba(0,0,0,.58);
    }
    .journey-intro-quote{
      font-family:Georgia,'Times New Roman',serif;
      font-weight:800;
      font-size:clamp(26px,7vw,74px);
      line-height:.96;
      letter-spacing:-.025em;
    }
    .journey-intro-quote span{display:block;}
    .journey-intro-quote .quote-open{display:inline;}
    .journey-intro-banner{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      margin-top:clamp(8px,1.5vw,14px);
      padding:clamp(6px,1.2vw,12px) clamp(16px,2.2vw,26px);
      min-width:78%;
      background:linear-gradient(180deg,#ffd968 0%,#f5b02f 48%,#d58c15 100%);
      color:#111;
      border:1px solid rgba(255,237,145,.78);
      box-shadow:0 0 18px rgba(255,187,44,.38), inset 0 1px 4px rgba(255,255,255,.35);
      font-family:Georgia,'Times New Roman',serif;
      font-weight:900;
      font-size:clamp(12px,2.6vw,32px);
      line-height:1;
      letter-spacing:.02em;
      white-space:nowrap;
      text-transform:uppercase;
    }
    .journey-intro-swoosh{
      position:absolute;
      inset:auto -8% -6% -3%;
      width:116%;
      height:58%;
      z-index:2;
      overflow:visible;
      pointer-events:none;
    }
    .journey-intro-swoosh path{
      fill:none;
      stroke:#f5a533;
      stroke-width:6;
      stroke-linecap:round;
      filter:drop-shadow(0 0 8px rgba(255,207,62,.95)) drop-shadow(0 0 22px rgba(255,180,32,.75));
    }
    .journey-intro-swoosh .core{
      stroke:#fff0a4;
      stroke-width:2.2;
      filter:drop-shadow(0 0 8px rgba(255,231,118,.95));
    }
    .journey-intro-watermark{
      position:absolute;
      right:5%;
      bottom:8%;
      width:16%;
      max-width:150px;
      opacity:.24;
      filter:grayscale(1) brightness(2.4) contrast(.7);
      z-index:3;
      pointer-events:none;
    }
    body.light-theme .journey-intro-card{box-shadow:0 8px 18px rgba(0,0,0,.12);}
    @media (max-width:600px){
      .journey-intro-card{border-radius:12px;}
      .journey-intro-player{left:0;width:40%;height:96%;}
      .journey-intro-copy{right:3%;top:8%;width:62%;}
      .journey-intro-quote{font-size:clamp(25px,12.2vw,46px);line-height:.95;}
      .journey-intro-banner{font-size:clamp(11px,4vw,18px);padding:6px 10px;min-width:92%;}
      .journey-intro-watermark{width:20%;right:5%;bottom:8%;}
      .journey-intro-swoosh{inset:auto -10% -7% -10%;width:126%;height:58%;}
      .journey-intro-swoosh path{stroke-width:5;}
    }
  `;
  document.head.appendChild(style);
}

function createJourneyIntro(imageSrc, imageAlt) {
  const safeSrc = imageSrc || 'assets/img/placeholder.png';
  const safeAlt = imageAlt || 'Player high school photo';
  const fallback = 'assets/img/placeholder.png';

  const section = document.createElement('section');
  section.className = 'journey-intro-card';
  section.setAttribute('aria-label', 'Baseball journey intro');
  section.innerHTML = `
    <img class="journey-intro-bg" src="${safeSrc}" alt="" aria-hidden="true">
    <div class="journey-intro-player">
      <img src="${safeSrc}" alt="${safeAlt}">
    </div>
    <div class="journey-intro-copy">
      <div class="journey-intro-quote" aria-label="Baseball journeys don't always end at graduation.">
        <span><span class="quote-open">“</span>Baseball</span>
        <span>journeys don’t</span>
        <span>always end at</span>
        <span>graduation.”</span>
      </div>
      <div class="journey-intro-banner">NEITHER SHOULD THEIR STORIES</div>
    </div>
    <svg class="journey-intro-swoosh" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true">
      <path d="M42 318 C152 112 355 70 540 142 C706 207 826 344 1218 358" />
      <path d="M42 318 C152 112 355 70 540 142 C706 207 826 344 1218 358" class="core" />
    </svg>
    <img class="journey-intro-watermark" src="assets/img/yatstats-logo.png" alt="" aria-hidden="true">
  `;

  section.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      if (img.src.endsWith('/placeholder.png')) return;
      img.src = fallback;
    }, { once: true });
  });

  return section;
}

function ensureJourneyIntro() {
  const shell = document.querySelector('#profileShell');
  if (!shell || shell.querySelector('.journey-intro-card')) return;

  const anchor = shell.querySelector('.back-top-section');
  const playerPhoto = shell.querySelector('.back-player-photo');
  if (!anchor || !playerPhoto) return;

  const intro = createJourneyIntro(
    playerPhoto.currentSrc || playerPhoto.getAttribute('src'),
    playerPhoto.getAttribute('alt') || 'Player high school photo'
  );
  shell.insertBefore(intro, anchor);
}

function setupProfileJourneyIntro() {
  const shell = document.querySelector('#profileShell');
  if (!shell) return;

  injectJourneyIntroStyles();
  ensureJourneyIntro();

  if (journeyIntroObserver) journeyIntroObserver.disconnect();
  journeyIntroObserver = new MutationObserver(() => ensureJourneyIntro());
  journeyIntroObserver.observe(shell, { childList: true, subtree: true });
}

function wireLayoutToggles() {
  const drawerMask = document.querySelector('.drawer-mask');
  drawerMask?.addEventListener('click', () => {
    document.body.classList.remove('drawer-left-open', 'drawer-right-open');
  });

  document.querySelectorAll('#btnMenu').forEach((btn) => {
    btn.addEventListener('click', () => document.body.classList.add('drawer-left-open'));
  });
  document.querySelectorAll('#btnAccount').forEach((btn) => {
    btn.addEventListener('click', () => document.body.classList.add('drawer-right-open'));
  });

  document.querySelectorAll('.close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('drawer-left-open', 'drawer-right-open');
    });
  });

  const themeButtons = [
    ...document.querySelectorAll('#theme-toggle'),
    ...document.querySelectorAll('#btnTheme'),
  ];
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });
  });
}

function hydrateNav() {
  renderNavLinks(document.querySelector('.topnav'));
  renderNavLinks(document.querySelector('.drawer-nav'));
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateNav();
  applySchoolBranding();
  wireLayoutToggles();
  setupGalleryFlipAll();
  setupProfileJourneyIntro();
});
