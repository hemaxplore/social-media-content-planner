// =======================================
// Social Media Content Planner - app.js
// =======================================

const STORAGE_KEY = 'content_planner_v1';

// --- Splash Screen ---
// Shows once per session. Safe fallback if sessionStorage is blocked.
SplashScreen.init();

// --- Data: Load & Save ---

function loadPlans() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultPlans();
  } catch (e) {
    return defaultPlans();
  }
}

function savePlans() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function defaultPlans() {
  return [
    { id: 1, title: 'Summer Collection Teaser', platform: 'Instagram', status: 'Published', date: '2026-04-10' },
    { id: 2, title: 'Product Launch: Core Pro', platform: 'Facebook', status: 'Scheduled', date: '2026-04-15' },
    { id: 3, title: 'New Story Concept', platform: 'LinkedIn', status: 'Idea', date: '2026-04-20' }
  ];
}

// --- State ---

let plans = loadPlans();
let editId = null;   // id of plan being edited (null = add mode)
let deleteId = null;  // id of plan pending deletion

// --- Render ---

function renderPlans() {
  const container = document.querySelector('#plans-container');
  const emptyState = document.querySelector('#empty-state');
  const resultsEl = document.querySelector('#results-count');

  if (!container) return;

  // Read filter values
  const search = document.querySelector('#plan-search').value.toLowerCase().trim();
  const platform = document.querySelector('#platform-filter').value;
  const status = document.querySelector('#status-filter').value;
  const sortOrder = document.querySelector('#sort-filter').value;

  // Update summary chips
  const statuses = ['idea', 'draft', 'scheduled', 'published'];
  document.querySelector('#chip-total span').innerText = plans.length;
  statuses.forEach(s => {
    const el = document.querySelector(`#chip-${s} span`);
    if (el) el.innerText = plans.filter(p => p.status.toLowerCase() === s).length;
  });

  // Filter
  let filtered = plans.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search);
    const matchPlatform = platform === 'all' || p.platform === platform;
    const matchStatus = status === 'all' || p.status === status;
    return matchSearch && matchPlatform && matchStatus;
  });

  // Sort
  filtered.sort((a, b) => {
    const diff = new Date(a.date) - new Date(b.date);
    return sortOrder === 'newest' ? -diff : diff;
  });

  // Result count badge
  resultsEl.innerText = `${filtered.length} ${filtered.length === 1 ? 'plan' : 'plans'}`;

  // Empty state
  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    return;
  }
  emptyState.classList.add('hidden');

  // Returns date badge info based on planned date vs today
  function getDateBadge(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planned = new Date(dateStr);
    planned.setHours(0, 0, 0, 0);
    const diff = planned - today;

    if (diff < 0) return { label: 'Overdue', cls: 'badge-overdue' };
    if (diff === 0) return { label: 'Today', cls: 'badge-today' };
    return { label: 'Upcoming', cls: 'badge-upcoming' };
  }

  // Render cards
  container.innerHTML = filtered.map(p => {
    const dateBadge = getDateBadge(p.date);
    const notesHtml = p.notes
      ? `<p class="plan-notes">${escapeHtml(p.notes)}</p>`
      : '';
    return `
    <div class="plan-card glass border-${p.status.toLowerCase()}">
      <div class="plan-info">
        <div class="plan-title-row">
          <h4>${escapeHtml(p.title)}</h4>
          <span class="date-badge ${dateBadge.cls}">${dateBadge.label}</span>
        </div>
        <div class="plan-meta">
          <span class="badge badge-platform">${p.platform}</span>
          <span class="badge status-${p.status.toLowerCase()}">${p.status}</span>
          <div class="plan-date-wrapper">
            <i data-lucide="calendar"></i>
            <span>${p.date}</span>
          </div>
        </div>
        ${notesHtml}
      </div>
      <div class="plan-actions">
        <button class="action-btn edit-btn"      onclick="editPlan(${p.id})"        title="Edit plan">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="action-btn duplicate-btn" onclick="duplicatePlan(${p.id})"  title="Duplicate plan">
          <i data-lucide="copy"></i>
        </button>
        <button class="action-btn delete-btn"    onclick="openDeleteModal(${p.id})" title="Delete plan">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Prevent XSS from user-entered titles
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// --- Form: Add / Edit ---

function handleForm(e) {
  e.preventDefault();

  const data = {
    title: document.querySelector('#plan-title').value.trim(),
    platform: document.querySelector('#plan-platform').value,
    status: document.querySelector('#plan-status').value,
    date: document.querySelector('#plan-date').value,
    notes: document.querySelector('#plan-notes').value.trim()
  };

  if (editId !== null) {
    plans = plans.map(p => p.id == editId ? { ...p, ...data } : p);
    showNotification('Content plan updated.');
  } else {
    plans.unshift({ id: Date.now(), ...data });
    showNotification('New content plan added.');
  }

  savePlans();
  renderPlans();
  resetForm();
}

function resetForm() {
  document.querySelector('#plan-form').reset();
  editId = null;
  document.querySelector('#submit-plan-btn').textContent = 'Add Plan';
  document.querySelector('#cancel-edit-btn').classList.add('hidden');
}

// --- Card Actions ---

function editPlan(id) {
  const plan = plans.find(p => p.id == id);
  if (!plan) return;

  document.querySelector('#plan-title').value = plan.title;
  document.querySelector('#plan-platform').value = plan.platform;
  document.querySelector('#plan-status').value = plan.status;
  document.querySelector('#plan-date').value = plan.date;
  document.querySelector('#plan-notes').value = plan.notes || '';

  editId = plan.id;
  document.querySelector('#submit-plan-btn').textContent = 'Update Plan';
  document.querySelector('#cancel-edit-btn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDeleteModal(id) {
  deleteId = id;
  document.querySelector('#confirm-modal').classList.remove('hidden');
}

// Keep event delegation as backup
function handleCardAction(e) {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'edit') editPlan(id);
  if (action === 'delete') openDeleteModal(id);
}

// --- Delete Modal ---

function closeModal(e) {
  const modal = document.querySelector('#confirm-modal');
  // Close when: direct call (no event), clicked backdrop, or clicked cancel
  if (!e || e.target === modal || e.target.id === 'confirm-cancel') {
    deleteId = null;
    modal.classList.add('hidden');
  }
}

function confirmDelete() {
  if (deleteId !== null) {
    plans = plans.filter(p => p.id != deleteId);
    if (editId == deleteId) resetForm();
    savePlans();
    renderPlans();
    showNotification('Content plan removed.');
  }
  closeModal();
}

// --- Toast Notification ---

function showNotification(message) {
  const container = document.querySelector('#notification-container');
  const note = document.createElement('div');
  note.className = 'notification';
  note.innerText = message;
  container.appendChild(note);
  setTimeout(() => {
    note.style.opacity = '0';
    setTimeout(() => note.remove(), 300);
  }, 2800);
}

// --- Clear All Filters ---

function clearFilters() {
  document.querySelector('#plan-search').value = '';
  document.querySelector('#platform-filter').value = 'all';
  document.querySelector('#status-filter').value = 'all';
  document.querySelector('#sort-filter').value = 'newest';
  renderPlans();
}

// --- Initialise App ---

document.addEventListener('DOMContentLoaded', () => {

  // Form
  document.querySelector('#plan-form').addEventListener('submit', handleForm);
  document.querySelector('#cancel-edit-btn').addEventListener('click', resetForm);

  // Card actions (event delegation as backup)
  document.querySelector('#plans-container').addEventListener('click', handleCardAction);

  // --- Duplicate Plan ---

  function duplicatePlan(id) {
    const plan = plans.find(p => p.id == id);
    if (!plan) return;
    const copy = { ...plan, id: Date.now(), title: plan.title + ' (Copy)' };
    plans.unshift(copy);
    savePlans();
    renderPlans();
    showNotification('Content plan duplicated.');
  }

  // Expose functions globally (required for inline onclick handlers)
  window.editPlan = editPlan;
  window.openDeleteModal = openDeleteModal;
  window.duplicatePlan = duplicatePlan;

  // Filters (live update on every change/keypress)
  ['#plan-search', '#platform-filter', '#status-filter', '#sort-filter'].forEach(sel => {
    document.querySelector(sel).addEventListener('input', renderPlans);
  });
  document.querySelector('#clear-filters').addEventListener('click', clearFilters);

  // Modal
  const modal = document.querySelector('#confirm-modal');
  modal.addEventListener('click', closeModal);
  document.querySelector('#confirm-cancel').addEventListener('click', closeModal);
  document.querySelector('#confirm-delete').addEventListener('click', confirmDelete);

  // First render
  renderPlans();
});