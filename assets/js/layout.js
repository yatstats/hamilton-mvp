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
});
