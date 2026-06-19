/* ════════════════════════════════════════════
   PAINEL ADMIN — SME Afrânio
   Backend-less via GitHub Contents API
   ════════════════════════════════════════════ */

const STORAGE_KEY = 'sme_afranio_projects';
const PASS_KEY    = 'sme_admin_hash';
const TOKEN_KEY   = 'gh_token';
const DEFAULT_PASS = 'SME@Afranio2026';

/* ── SHA-256 ── */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getStoredHash() {
  let h = localStorage.getItem(PASS_KEY);
  if (!h) { h = await sha256(DEFAULT_PASS); localStorage.setItem(PASS_KEY, h); }
  return h;
}

/* ── GITHUB CONFIG ── */
let githubConfig = null;

async function getGithubConfig() {
  if (githubConfig) return githubConfig;
  const res = await fetch('../data/config.json');
  githubConfig = (await res.json()).github;
  return githubConfig;
}

/* ── STATE ── */
let projects  = [];
let editingId = null;

/* ── TOAST ── */
const toast = document.getElementById('toast');
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ── AUTH ── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const input     = document.getElementById('adminPassword').value;
  const inputHash = await sha256(input);
  const stored    = await getStoredHash();

  if (inputHash === stored) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'block';
    loadAndRender();
  } else {
    const err = document.getElementById('loginError');
    err.style.display = 'block';
    err.textContent   = 'Senha incorreta.';
    document.getElementById('adminPassword').value = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('adminSection').style.display = 'none';
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('adminPassword').value = '';
});

/* ── LOAD & RENDER ── */
async function loadAndRender() {
  const token = localStorage.getItem(TOKEN_KEY);
  document.getElementById('tokenStatus').style.display = token ? 'none' : 'flex';
  document.getElementById('tokenInput').value = token || '';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { projects = JSON.parse(stored); }
    catch (_) { projects = await fetchFromGitHub(); }
  } else {
    projects = await fetchFromGitHub();
    saveDraft();
  }
  renderList();
}

async function fetchFromGitHub() {
  try {
    const cfg = await getGithubConfig();
    const url = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/data/projects.json?cb=${Date.now()}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (_) {}
  try {
    const res = await fetch('../data/projects.json');
    return await res.json();
  } catch (_) { return []; }
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function renderList() {
  const count = document.getElementById('projectsCount');
  count.textContent = projects.length + (projects.length === 1 ? ' projeto' : ' projetos');

  const list = document.getElementById('projectsList');
  if (projects.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Nenhum projeto cadastrado. Clique em "Novo Projeto" para começar.</p></div>`;
    return;
  }

  list.innerHTML = projects.map(p => `
    <div class="admin-card">
      <div class="admin-card-icon"><i class="${p.icone}"></i></div>
      <div class="admin-card-info">
        <span class="admin-card-cat">${p.categoria}</span>
        <h3 class="admin-card-title">${p.titulo}</h3>
        <p class="admin-card-desc">${p.descricao}</p>
      </div>
      <div class="admin-card-actions">
        <button class="btn-edit" onclick="openEdit(${p.id})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn-del"  onclick="deleteProject(${p.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

/* ── MODAL ── */
const modalBackdrop  = document.getElementById('modalBackdrop');
const projectForm    = document.getElementById('projectForm');

function openModal()  { modalBackdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal() { modalBackdrop.classList.remove('open'); document.body.style.overflow = ''; projectForm.reset(); editingId = null; document.getElementById('iconPreview').className = 'fa-solid fa-circle-question'; }

document.getElementById('btnNewProject').addEventListener('click', () => {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Novo Projeto';
  projectForm.reset();
  openModal();
});

document.getElementById('btnCancelModal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

window.openEdit = function(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Editar Projeto';
  document.getElementById('fTitulo').value    = p.titulo;
  document.getElementById('fDescricao').value = p.descricao;
  document.getElementById('fCategoria').value = p.categoria;
  document.getElementById('fIcone').value     = p.icone;
  document.getElementById('iconPreview').className = p.icone;
  openModal();
};

window.deleteProject = function(id) {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
  projects = projects.filter(p => p.id !== id);
  saveDraft();
  renderList();
  showToast('Projeto excluído. Clique em "Publicar" para salvar no site.');
};

/* ── SAVE PROJECT (rascunho local) ── */
projectForm.addEventListener('submit', e => {
  e.preventDefault();
  const titulo    = document.getElementById('fTitulo').value.trim();
  const descricao = document.getElementById('fDescricao').value.trim();
  const categoria = document.getElementById('fCategoria').value;
  const icone     = document.getElementById('fIcone').value.trim();

  if (!titulo || !descricao || !categoria || !icone) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }

  if (editingId !== null) {
    projects = projects.map(p => p.id === editingId ? { ...p, titulo, descricao, categoria, icone } : p);
    showToast('Projeto atualizado! Clique em "Publicar" para salvar no site.');
  } else {
    const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
    projects.push({ id: newId, titulo, descricao, categoria, icone });
    showToast('Projeto adicionado! Clique em "Publicar" para salvar no site.');
  }

  saveDraft();
  renderList();
  closeModal();
});

/* ══════════════════════════════════════════
   PUBLICAR NO GITHUB → todo mundo vê
   ══════════════════════════════════════════ */
document.getElementById('btnPublish').addEventListener('click', async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showToast('Configure o Token do GitHub antes de publicar.', 'error');
    document.getElementById('tokenInput').focus();
    return;
  }

  const btn = document.getElementById('btnPublish');
  btn.disabled   = true;
  btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';

  try {
    const cfg = await getGithubConfig();
    const { owner, repo, branch } = cfg;

    /* 1. Busca SHA atual do arquivo */
    const fileRes  = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );

    if (fileRes.status === 401) throw new Error('Token inválido ou expirado. Verifique nas configurações.');
    if (fileRes.status === 403) throw new Error('Sem permissão. Verifique o escopo do Token (precisa de "repo" ou "contents:write").');
    if (!fileRes.ok)            throw new Error(`Erro ao acessar o repositório (${fileRes.status}).`);

    const fileData = await fileRes.json();

    /* 2. Codifica o novo conteúdo em Base64 */
    const json    = JSON.stringify(projects, null, 2);
    const content = btoa(unescape(encodeURIComponent(json)));

    /* 3. Atualiza o arquivo no GitHub */
    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Atualiza projetos via painel admin — ${new Date().toLocaleString('pt-BR')}`,
          content,
          sha: fileData.sha,
          branch,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.message || `Falha ao publicar (${updateRes.status}).`);
    }

    showToast('✅ Publicado com sucesso! O site será atualizado em instantes.');
    localStorage.removeItem(STORAGE_KEY); /* limpa rascunho local */

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publicar no Site';
  }
});

/* ── TOKEN CONFIG ── */
document.getElementById('btnSaveToken').addEventListener('click', () => {
  const val = document.getElementById('tokenInput').value.trim();
  if (!val) { showToast('Digite o token.', 'error'); return; }
  localStorage.setItem(TOKEN_KEY, val);
  document.getElementById('tokenStatus').style.display = 'none';
  showToast('Token salvo com sucesso!');
});

document.getElementById('btnRemoveToken').addEventListener('click', () => {
  if (!confirm('Remover o token? O botão "Publicar" ficará desativado até configurar novamente.')) return;
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById('tokenInput').value = '';
  document.getElementById('tokenStatus').style.display = 'flex';
  showToast('Token removido.');
});

/* ── ICON PREVIEW ── */
document.getElementById('fIcone').addEventListener('input', function() {
  document.getElementById('iconPreview').className = this.value;
});

/* ── CHANGE PASSWORD ── */
document.getElementById('changePassForm').addEventListener('submit', async e => {
  e.preventDefault();
  const current = document.getElementById('cpCurrent').value;
  const newPass = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;
  const msg     = document.getElementById('passMsg');

  const currentHash = await sha256(current);
  const storedHash  = await getStoredHash();

  if (currentHash !== storedHash) { msg.style.color = '#dc2626'; msg.textContent = 'Senha atual incorreta.'; return; }
  if (newPass !== confirm)         { msg.style.color = '#dc2626'; msg.textContent = 'As senhas não coincidem.'; return; }
  if (newPass.length < 8)          { msg.style.color = '#dc2626'; msg.textContent = 'Mínimo 8 caracteres.'; return; }

  localStorage.setItem(PASS_KEY, await sha256(newPass));
  msg.style.color = '#009933';
  msg.textContent = 'Senha alterada com sucesso!';
  document.getElementById('changePassForm').reset();
});
