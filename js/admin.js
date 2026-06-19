const STORAGE_KEY = 'sme_afranio_projects';
const PASS_KEY    = 'sme_admin_hash';
const DEFAULT_PASS = 'SME@Afranio2026';

/* ── SHA-256 HELPER ── */
async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getStoredHash() {
  let h = localStorage.getItem(PASS_KEY);
  if (!h) {
    h = await sha256(DEFAULT_PASS);
    localStorage.setItem(PASS_KEY, h);
  }
  return h;
}

/* ── STATE ── */
let projects = [];
let editingId = null;

/* ── DOM REFS ── */
const loginSection   = document.getElementById('loginSection');
const adminSection   = document.getElementById('adminSection');
const loginForm      = document.getElementById('loginForm');
const loginError     = document.getElementById('loginError');
const logoutBtn      = document.getElementById('logoutBtn');
const projectsList   = document.getElementById('projectsList');
const projectsCount  = document.getElementById('projectsCount');
const modalBackdrop  = document.getElementById('modalBackdrop');
const projectForm    = document.getElementById('projectForm');
const modalTitle     = document.getElementById('modalTitle');
const btnNewProject  = document.getElementById('btnNewProject');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnExport      = document.getElementById('btnExport');
const btnImport      = document.getElementById('btnImport');
const importInput    = document.getElementById('importInput');
const changePassForm = document.getElementById('changePassForm');
const passMsg        = document.getElementById('passMsg');
const toast          = document.getElementById('toast');

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ── AUTH ── */
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const inputPass = document.getElementById('adminPassword').value;
  const inputHash = await sha256(inputPass);
  const stored    = await getStoredHash();

  if (inputHash === stored) {
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
    loadAndRender();
  } else {
    loginError.style.display = 'block';
    loginError.textContent   = 'Senha incorreta. Tente novamente.';
    document.getElementById('adminPassword').value = '';
  }
});

logoutBtn.addEventListener('click', () => {
  adminSection.style.display = 'none';
  loginSection.style.display = 'flex';
  document.getElementById('adminPassword').value = '';
});

/* ── LOAD & RENDER ── */
async function loadAndRender() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { projects = JSON.parse(stored); }
    catch (_) { projects = await fetchDefault(); }
  } else {
    projects = await fetchDefault();
    save();
  }
  renderList();
}

async function fetchDefault() {
  try {
    const res = await fetch('../data/projects.json');
    return await res.json();
  } catch (_) { return []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function renderList() {
  projectsCount.textContent = projects.length;

  if (projects.length === 0) {
    projectsList.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Nenhum projeto cadastrado.</p></div>`;
    return;
  }

  projectsList.innerHTML = projects.map(p => `
    <div class="admin-card" data-id="${p.id}">
      <div class="admin-card-icon">
        <i class="${p.icone}"></i>
      </div>
      <div class="admin-card-info">
        <span class="admin-card-cat">${p.categoria}</span>
        <h3 class="admin-card-title">${p.titulo}</h3>
        <p class="admin-card-desc">${p.descricao}</p>
      </div>
      <div class="admin-card-actions">
        <button class="btn-edit" onclick="openEdit(${p.id})" title="Editar">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn-del" onclick="deleteProject(${p.id})" title="Excluir">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

/* ── MODAL ── */
function openModal() {
  modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  projectForm.reset();
  editingId = null;
}

btnNewProject.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Novo Projeto';
  projectForm.reset();
  openModal();
});

btnCancelModal.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

window.openEdit = function(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  modalTitle.textContent = 'Editar Projeto';
  document.getElementById('fTitulo').value    = p.titulo;
  document.getElementById('fDescricao').value = p.descricao;
  document.getElementById('fCategoria').value = p.categoria;
  document.getElementById('fIcone').value     = p.icone;
  openModal();
};

window.deleteProject = function(id) {
  if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
  projects = projects.filter(p => p.id !== id);
  save();
  renderList();
  showToast('Projeto excluído com sucesso.');
};

/* ── SAVE PROJECT ── */
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
    projects = projects.map(p =>
      p.id === editingId ? { ...p, titulo, descricao, categoria, icone } : p
    );
    showToast('Projeto atualizado com sucesso!');
  } else {
    const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
    projects.push({ id: newId, titulo, descricao, categoria, icone });
    showToast('Projeto adicionado com sucesso!');
  }

  save();
  renderList();
  closeModal();
});

/* ── EXPORT / IMPORT ── */
btnExport.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'projetos-sme.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Arquivo exportado!');
});

btnImport.addEventListener('click', () => importInput.click());

importInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      projects = data;
      save();
      renderList();
      showToast(`${projects.length} projetos importados!`);
    } catch (_) {
      showToast('Arquivo inválido.', 'error');
    }
    importInput.value = '';
  };
  reader.readAsText(file);
});

/* ── CHANGE PASSWORD ── */
changePassForm && changePassForm.addEventListener('submit', async e => {
  e.preventDefault();
  const current = document.getElementById('cpCurrent').value;
  const newPass = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;

  const currentHash = await sha256(current);
  const storedHash  = await getStoredHash();

  if (currentHash !== storedHash) {
    passMsg.style.color = '#dc2626';
    passMsg.textContent = 'Senha atual incorreta.';
    return;
  }
  if (newPass !== confirm) {
    passMsg.style.color = '#dc2626';
    passMsg.textContent = 'As novas senhas não coincidem.';
    return;
  }
  if (newPass.length < 8) {
    passMsg.style.color = '#dc2626';
    passMsg.textContent = 'A nova senha deve ter pelo menos 8 caracteres.';
    return;
  }

  const newHash = await sha256(newPass);
  localStorage.setItem(PASS_KEY, newHash);
  passMsg.style.color = '#009933';
  passMsg.textContent = 'Senha alterada com sucesso!';
  changePassForm.reset();
  showToast('Senha alterada!');
});

/* ── ICON PREVIEW ── */
document.getElementById('fIcone').addEventListener('input', function() {
  const preview = document.getElementById('iconPreview');
  preview.className = this.value;
});
