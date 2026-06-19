/* ── STICKY HEADER + BACK TO TOP ── */
const header    = document.getElementById('header');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 60);
  if (backToTop) backToTop.classList.toggle('visible', y > 400);
}, { passive: true });

backToTop && backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ── ACTIVE NAV LINK ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a, .nav-mobile a');

function setActiveLink() {
  const scrollY = window.scrollY + 120;
  sections.forEach(sec => {
    const top    = sec.offsetTop;
    const height = sec.offsetHeight;
    if (scrollY >= top && scrollY < top + height) {
      navLinks.forEach(a => a.classList.remove('active'));
      navLinks.forEach(a => {
        if (a.getAttribute('href') === '#' + sec.id) a.classList.add('active');
      });
    }
  });
}
window.addEventListener('scroll', setActiveLink, { passive: true });

/* ── MOBILE MENU ── */
const menuBtn   = document.getElementById('menuBtn');
const navMobile = document.getElementById('navMobile');
const overlay   = document.getElementById('navOverlay');

function openMenu()  { navMobile.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeMenu() { navMobile.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }

menuBtn.addEventListener('click', openMenu);
overlay.addEventListener('click', closeMenu);
document.querySelectorAll('.nav-mobile a').forEach(a => a.addEventListener('click', closeMenu));

/* ── SCROLL ANIMATIONS ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

/* ── COUNTER ANIMATION ── */
function animateCounter(el) {
  const target   = parseFloat(el.dataset.target);
  const duration = 1800;
  const step     = duration / 60;
  let current    = 0;

  const timer = setInterval(() => {
    current += target / (duration / step);
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString('pt-BR');
  }, step);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* ── LOAD PROJECTS ── */
function getCategoryClass(cat) {
  const map = {
    'Tecnologia':     'cat-Tecnologia',
    'Inclusão':       'cat-Inclusao',
    'Esporte':        'cat-Esporte',
    'Pedagógico':     'cat-Pedagogico',
    'Cultura':        'cat-Cultura',
    'Social':         'cat-Social',
    'Infraestrutura': 'cat-Infra',
  };
  return map[cat] || 'cat-default';
}

async function loadProjects() {
  try {
    /* Busca direto do GitHub (sem precisar de autenticação pois o repo é público).
       Parâmetro de cache-busting garante sempre a versão mais recente. */
    const cfg = await fetch('./data/config.json').then(r => r.json());
    const { owner, repo, branch } = cfg.github;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/projects.json?cb=${Date.now()}`;
    const res    = await fetch(rawUrl);
    if (res.ok) return await res.json();
  } catch (_) { /* fallback abaixo */ }

  /* Fallback: arquivo local (versão do último deploy da Vercel) */
  return fetch('./data/projects.json').then(r => r.json());
}

function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  if (!projects || projects.length === 0) {
    grid.innerHTML = `
      <div class="projects-empty">
        <i class="fa-solid fa-folder-open"></i>
        <p>Nenhum projeto cadastrado ainda.</p>
      </div>`;
    return;
  }

  grid.innerHTML = projects.map((p, i) => `
    <article class="project-card fade-up" style="transition-delay:${i * 80}ms">
      <div class="project-icon-wrap">
        <i class="${p.icone}"></i>
      </div>
      <span class="project-category ${getCategoryClass(p.categoria)}">${p.categoria}</span>
      <h3 class="project-title">${p.titulo}</h3>
      <p class="project-desc">${p.descricao}</p>
    </article>
  `).join('');

  grid.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

loadProjects().then(renderProjects);
