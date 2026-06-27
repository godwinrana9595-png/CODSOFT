/* -------------------------------------------------------------
 * ZEN-TODO CORE APPLICATION LOGIC
 * Manages task state, rendering, search, filters, sorting, PWA setup,
 * toast notifications with Undo capability, and theme toggling.
 * ------------------------------------------------------------- */

// State Management
let tasks = [];
let lastDeletedTask = null;
let lastDeletedIndex = -1;
let currentFilter = 'all';
let currentSort = 'createdAt-desc';
let searchQuery = '';

// PWA Deferment Prompt
let deferredPrompt = null;

// DOM Selectors
const taskListContainer = document.getElementById('task-list');
const emptyStateContainer = document.getElementById('empty-state');
const emptyAddBtn = document.getElementById('empty-add-btn');
const fabAddTask = document.getElementById('fab-add-task');
const currentDateEl = document.getElementById('current-date');
const themeToggleBtn = document.getElementById('theme-toggle');
const statsSummaryEl = document.getElementById('stats-summary');
const statsPercentageEl = document.getElementById('stats-percentage');
const progressBarEl = document.getElementById('progress-bar');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear');
const sortSelect = document.getElementById('sort-select');
const filterTabs = document.querySelectorAll('.filter-tab');
const toastContainer = document.getElementById('toast-container');

// Modal Selectors
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskDueDateInput = document.getElementById('task-due-date');
const modalTitleText = document.getElementById('modal-title-text');
const modalCloseBtn = document.getElementById('modal-close');
const modalCancelBtn = document.getElementById('modal-cancel');
const titleErrorMsg = document.getElementById('title-error');

// PWA Install Banner Selectors
const pwaBanner = document.getElementById('pwa-install-banner');
const pwaInstallBtn = document.getElementById('pwa-btn-install');
const pwaCloseBtn = document.getElementById('pwa-btn-close');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initTheme();
  loadTasks();
  registerServiceWorker();
  setupEventListeners();
  render();
});

// Set current date in header
function initDate() {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

// Setup Event Listeners
function setupEventListeners() {
  // Add Task Buttons (FAB & Empty State)
  fabAddTask.addEventListener('click', () => openModal());
  emptyAddBtn.addEventListener('click', () => openModal());

  // Modal Control
  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);
  taskForm.addEventListener('submit', handleFormSubmit);

  // Search Interaction
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    if (searchQuery.length > 0) {
      searchClearBtn.classList.remove('hidden');
    } else {
      searchClearBtn.classList.add('hidden');
    }
    render();
  });
  
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.add('hidden');
    searchInput.focus();
    render();
  });

  // Filters Selection
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      render();
    });
  });

  // Sorting Selection
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // Close modals clicking outside
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
  });

  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Install Banner Buttons
  pwaInstallBtn.addEventListener('click', triggerInstall);
  pwaCloseBtn.addEventListener('click', () => {
    pwaBanner.classList.add('hidden');
    sessionStorage.setItem('zentodo-install-dismissed', 'true');
  });
}

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  showToast(`Switched to ${newTheme} mode`, 'info');
}

// --- Data Layer (LocalStorage) ---
function loadTasks() {
  try {
    const rawTasks = localStorage.getItem('zentodo-tasks');
    tasks = rawTasks ? JSON.parse(rawTasks) : [];
  } catch (error) {
    console.error('Failed to load tasks from local storage', error);
    showToast('Failed to load tasks', 'danger');
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem('zentodo-tasks', JSON.stringify(tasks));
    updateStats();
  } catch (error) {
    console.error('Failed to save tasks to local storage', error);
    showToast('Storage full! Could not save tasks.', 'danger');
  }
}

// --- UI Stats Calculation ---
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  
  statsSummaryEl.textContent = `${completed} of ${total} tasks completed`;
  
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  statsPercentageEl.textContent = `${percentage}%`;
  progressBarEl.style.width = `${percentage}%`;
}

// --- PWA Installation Logic ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully!', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }

  // Capture Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Check if dismissed before in session
    const isDismissed = sessionStorage.getItem('zentodo-install-dismissed');
    if (!isDismissed) {
      pwaBanner.classList.remove('hidden');
    }
  });
}

function triggerInstall() {
  if (!deferredPrompt) return;
  
  // Hide custom banner
  pwaBanner.classList.add('hidden');
  
  // Show browser prompt
  deferredPrompt.prompt();
  
  // Wait for user choices
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      showToast('ZenTodo installed successfully!', 'success');
    } else {
      console.log('User dismissed install prompt');
    }
    deferredPrompt = null;
  });
}

// --- Toast Notification System ---
function showToast(message, type = 'info', action = null) {
  const toast = document.createElement('div');
  toast.className = `toast`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'danger') iconName = 'alert-triangle';
  
  let actionBtnHtml = '';
  if (action) {
    actionBtnHtml = `<button class="toast-btn">${action.text}</button>`;
  }

  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon ${type}">
        <i data-lucide="${iconName}"></i>
      </div>
      <span class="toast-msg">${message}</span>
    </div>
    ${actionBtnHtml}
  `;
  
  toastContainer.appendChild(toast);
  createIcons(); // Hydrate the icon
  
  if (action) {
    const btn = toast.querySelector('.toast-btn');
    btn.addEventListener('click', () => {
      action.callback();
      removeToast(toast);
    });
  }
  
  // Auto remove after 4.5 seconds
  const autoRemoveTimer = setTimeout(() => {
    removeToast(toast);
  }, 4500);

  // Keep ref to cancel timeout if manually clicked
  toast.dataset.timeoutId = autoRemoveTimer;
}

function removeToast(toast) {
  if (toast.classList.contains('removing')) return;
  
  toast.classList.add('removing');
  clearTimeout(parseInt(toast.dataset.timeoutId));
  
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}

// --- CRUD Operations ---

// Open Modal (New / Edit)
function openModal(taskId = null) {
  taskForm.reset();
  titleErrorMsg.style.display = 'none';
  taskTitleInput.classList.remove('invalid');
  
  // Set default due date to empty
  taskDueDateInput.value = '';
  
  if (taskId) {
    // Edit mode
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    modalTitleText.textContent = 'Edit Task';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.desc || '';
    taskDueDateInput.value = task.dueDate || '';
    
    // Set checked priority
    const priorityRadio = taskForm.querySelector(`input[name="task-priority"][value="${task.priority}"]`);
    if (priorityRadio) priorityRadio.checked = true;
  } else {
    // Add mode
    modalTitleText.textContent = 'Create Task';
    taskIdInput.value = '';
    // Set priority to default 'low'
    taskForm.querySelector('input[name="task-priority"][value="low"]').checked = true;
  }
  
  taskModal.classList.remove('hidden');
  taskTitleInput.focus();
}

function closeModal() {
  taskModal.classList.add('hidden');
}

// Save or Update
function handleFormSubmit(e) {
  e.preventDefault();
  
  const title = taskTitleInput.value.trim();
  const desc = taskDescInput.value.trim();
  const priority = taskForm.querySelector('input[name="task-priority"]:checked').value;
  const dueDate = taskDueDateInput.value;
  const id = taskIdInput.value;

  // Validation
  if (!title) {
    taskTitleInput.classList.add('invalid');
    titleErrorMsg.style.display = 'block';
    return;
  }

  if (id) {
    // Edit task
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        title,
        desc,
        priority,
        dueDate
      };
      showToast('Task updated successfully', 'success');
    }
  } else {
    // New task
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      desc,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    showToast('Task created successfully', 'success');
  }

  saveTasks();
  closeModal();
  render();
}

// Toggle Task Completion State
function toggleTaskComplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.completed = !task.completed;
  saveTasks();
  
  // Render updates with subtle delay for satisfying checkbox animation
  setTimeout(() => {
    render();
  }, 200);

  if (task.completed) {
    showToast('Task marked as completed!', 'success');
  }
}

// Delete Task with Undo Option
function deleteTask(taskId) {
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  const taskItemDom = document.querySelector(`.task-item[data-id="${taskId}"]`);
  
  // Set undo variables
  lastDeletedTask = tasks[taskIndex];
  lastDeletedIndex = taskIndex;

  if (taskItemDom) {
    taskItemDom.classList.add('deleting');
    taskItemDom.addEventListener('animationend', () => {
      performDelete();
    });
  } else {
    performDelete();
  }

  function performDelete() {
    tasks.splice(taskIndex, 1);
    saveTasks();
    render();
    
    showToast(`Deleted task "${lastDeletedTask.title}"`, 'info', {
      text: 'Undo',
      callback: undoDelete
    });
  }
}

// Undo Action
function undoDelete() {
  if (lastDeletedTask && lastDeletedIndex !== -1) {
    tasks.splice(lastDeletedIndex, 0, lastDeletedTask);
    saveTasks();
    render();
    showToast('Task restored', 'success');
    
    // Clear references
    lastDeletedTask = null;
    lastDeletedIndex = -1;
  }
}

// --- Rendering View Engine ---
function render() {
  // Clear previous render
  taskListContainer.innerHTML = '';
  
  // Filter Tasks
  let filteredTasks = tasks.filter(task => {
    // Search Query Match
    const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                          (task.desc && task.desc.toLowerCase().includes(searchQuery));
    
    if (!matchesSearch) return false;

    // Status Filters
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Sort Tasks
  filteredTasks.sort((a, b) => {
    const [field, direction] = currentSort.split('-');
    const multiplier = direction === 'desc' ? -1 : 1;

    if (field === 'createdAt') {
      return (new Date(a.createdAt) - new Date(b.createdAt)) * multiplier;
    }
    
    if (field === 'dueDate') {
      // Push tasks without due dates to the end
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; // puts a at end
      if (!b.dueDate) return -1; // puts b at end
      return (new Date(a.dueDate) - new Date(b.dueDate)) * multiplier;
    }
    
    if (field === 'priority') {
      const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };
      return (priorityMap[a.priority] - priorityMap[b.priority]) * multiplier;
    }

    return 0;
  });

  // Toggle empty state visualization
  if (filteredTasks.length === 0) {
    taskListContainer.style.display = 'none';
    emptyStateContainer.style.display = 'flex';
  } else {
    taskListContainer.style.display = 'flex';
    emptyStateContainer.style.display = 'none';
    
    // Render list cards
    filteredTasks.forEach(task => {
      const card = createTaskCardDOM(task);
      taskListContainer.appendChild(card);
    });
  }
  
  // Hydrate Lucide Icons
  createIcons();
  
  // Update Header Progress Stats
  updateStats();
}

// Helper to construct individual task card DOM elements
function createTaskCardDOM(task) {
  const card = document.createElement('div');
  card.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
  card.dataset.id = task.id;

  // Format Due Date Display
  let dueDateBadge = '';
  if (task.dueDate) {
    const dateInfo = getDueDateInfo(task.dueDate);
    let classModifier = '';
    if (dateInfo.isOverdue && !task.completed) classModifier = 'date-overdue';
    else if (dateInfo.isToday && !task.completed) classModifier = 'date-today';

    dueDateBadge = `
      <span class="meta-badge ${classModifier}">
        <i data-lucide="calendar"></i>
        ${dateInfo.text}
      </span>
    `;
  }

  // Priority badge
  const priorityBadge = `
    <span class="meta-badge prio-${task.priority}">
      <i data-lucide="flag"></i>
      ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
    </span>
  `;

  // Description view
  const descriptionHtml = task.desc 
    ? `<p class="task-desc">${escapeHTML(task.desc)}</p>` 
    : '';

  card.innerHTML = `
    <div class="task-checkbox-wrapper">
      <div class="custom-checkbox" aria-label="Toggle Complete">
        <i data-lucide="check"></i>
      </div>
    </div>
    <div class="task-details">
      <h3 class="task-title">${escapeHTML(task.title)}</h3>
      ${descriptionHtml}
      <div class="task-meta">
        ${priorityBadge}
        ${dueDateBadge}
      </div>
    </div>
    <div class="task-item-actions">
      <button class="btn-action edit-btn" aria-label="Edit task">
        <i data-lucide="pencil"></i>
      </button>
      <button class="btn-action delete-btn" aria-label="Delete task">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  // Attach card event listeners
  const checkbox = card.querySelector('.custom-checkbox');
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  });

  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(task.id);
  });

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  // Enable double-click to edit card
  card.addEventListener('dblclick', () => {
    openModal(task.id);
  });

  return card;
}

// --- Date Math Helpers ---
function getDueDateInfo(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Format Date Nicely
  const options = { month: 'short', day: 'numeric' };
  let formattedText = dueDate.toLocaleDateString('en-US', options);

  if (diffDays === 0) {
    return { text: 'Today', isToday: true, isOverdue: false };
  } else if (diffDays === 1) {
    return { text: 'Tomorrow', isToday: false, isOverdue: false };
  } else if (diffDays === -1) {
    return { text: 'Yesterday (Overdue)', isToday: false, isOverdue: true };
  } else if (diffDays < 0) {
    return { text: `${formattedText} (Overdue)`, isToday: false, isOverdue: true };
  }
  
  return { text: formattedText, isToday: false, isOverdue: false };
}

// XSS Sanitizer
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Local SVG Icons dictionary to support 100% offline-first rendering
const ICONS = {
  'x': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  'check-check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check"><path d="m2 12 5.25 5.25L18 7.25"/><path d="m9 18 3.5 3.5L22 11.5"/></svg>',
  'moon': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  'sun': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  'search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  'sliders-horizontal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-horizontal"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="10" y1="12" y2="12"/><line x1="6" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="6" x2="6" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
  'clipboard-list': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>',
  'plus': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  'calendar': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
  'flag': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
  'pencil': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  'trash-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  'check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>',
  'info': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12" y1="17" y2="17.01"/></svg>'
};

function createIcons() {
  const elements = document.querySelectorAll('[data-lucide]');
  elements.forEach(el => {
    const iconName = el.getAttribute('data-lucide');
    if (ICONS[iconName]) {
      el.innerHTML = ICONS[iconName];
    }
  });
}
