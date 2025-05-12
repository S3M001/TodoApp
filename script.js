// Todoアプリの状態管理
const state = {
  todos: JSON.parse(localStorage.getItem('todos')) || [],
  tags: new Set(JSON.parse(localStorage.getItem('tags')) || []),
  filters: {
    search: '',
    sortBy: 'date',
    selectedTags: new Set(),
    showCompleted: true
  },
  settings: {
    hideDeleteConfirm: JSON.parse(localStorage.getItem('hideDeleteConfirm')) || false
  }
};

// DOM要素の取得
const elements = {
  todoForm: document.querySelector('.todo-form'),
  todoInput: document.querySelector('.todo-form input[type="text"]'),
  todoList: document.querySelector('.todo-list'),
  searchInput: document.querySelector('.search-box input'),
  sortSelect: document.querySelector('.sort-options select'),
  tagFilter: document.querySelector('.tag-filter'),
  statsBar: document.querySelector('.stats-bar'),
  tagSelector: document.querySelector('.tag-selector'),
  prioritySelect: document.querySelector('.priority-select'),
  dueDateInput: document.querySelector('.due-date-input'),
  showCompletedToggle: document.querySelector('.show-completed-toggle'),
  toggleCompletedBtn: document.querySelector('.toggle-completed-btn'),
  completedList: document.querySelector('.completed-list')
};

// デバッグ用の関数
function debugState() {
  console.log('Current State:', {
    todos: state.todos,
    tags: Array.from(state.tags),
    filters: {
      ...state.filters,
      selectedTags: Array.from(state.filters.selectedTags)
    }
  });
}

// DOM要素の存在確認
function checkElements() {
  console.log('Checking DOM elements...');
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Element not found: ${key}`);
    } else {
      console.log(`Element found: ${key}`);
    }
  }
}

// ローカルストレージへの保存
function saveToLocalStorage() {
  try {
    localStorage.setItem('todos', JSON.stringify(state.todos));
    localStorage.setItem('tags', JSON.stringify(Array.from(state.tags)));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// 統計情報の更新
function updateStats() {
  const total = state.todos.length;
  const completed = state.todos.filter(todo => todo.completed).length;
  const pending = total - completed;
  const overdue = state.todos.filter(todo => !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date()).length;

  if (elements.statsBar) {
    elements.statsBar.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${total}</div>
        <div class="stat-label">全タスク</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${completed}</div>
        <div class="stat-label">完了済み</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${pending}</div>
        <div class="stat-label">未完了</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${overdue}</div>
        <div class="stat-label">期限切れ</div>
      </div>
    `;
  }
}

// タグの選択/解除（複数選択 AND 絞り込み）
function toggleTag(tag) {
  if (state.filters.selectedTags.has(tag)) {
    state.filters.selectedTags.delete(tag);
  } else {
    state.filters.selectedTags.add(tag);
  }
  updateTags();
  updateTodoLists();
}

// Todoリストの更新（未完了・完了済み分離）
function updateTodoLists() {
  // 未完了タスク
  const todoListElem = document.querySelector('.todo-list');
  // 完了済みタスク
  const completedListElem = document.querySelector('.completed-list');

  if (!todoListElem || !completedListElem) return;

  // フィルタリング
  let filteredTodos = [...state.todos];
  if (state.filters.search) {
    filteredTodos = filteredTodos.filter(todo =>
      todo.text.toLowerCase().includes(state.filters.search.toLowerCase())
    );
  }
  if (state.filters.selectedTags.size > 0) {
    filteredTodos = filteredTodos.filter(todo =>
      Array.from(state.filters.selectedTags).every(tag => (todo.tags || []).includes(tag))
    );
  }
  if (!state.filters.showCompleted) {
    filteredTodos = filteredTodos.filter(todo => !todo.completed);
  }
  // ソート
  filteredTodos.sort((a, b) => {
    switch (state.filters.sortBy) {
      case 'date':
        return b.date - a.date;
      case 'priority':
        return b.priority - a.priority;
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      default:
        return 0;
    }
  });

  // 未完了・完了済みで分割
  const incomplete = filteredTodos.filter(todo => !todo.completed);
  const completed = filteredTodos.filter(todo => todo.completed);

  // 未完了タスク描画
  todoListElem.innerHTML = incomplete.map(todo => `
    <li class="todo-item ${isOverdue(todo) ? 'overdue' : ''}" data-id="${todo.id}">
      <div class="todo-main">
        <span class="todo-text">${todo.text}</span>
        <div class="action-menu">
          <button class="menu-button" onclick="toggleActionMenu(event, ${todo.id})" title="アクション">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="menu-dropdown" id="menu-${todo.id}">
            <div class="menu-item edit" onclick="startEdit(${todo.id})">
              <i class="fas fa-edit"></i>
              <span>編集</span>
            </div>
            <div class="menu-item complete" onclick="toggleComplete(${todo.id})">
              <i class="fas fa-check"></i>
              <span>完了</span>
            </div>
            <div class="menu-item delete" onclick="deleteTodo(${todo.id})">
              <i class="fas fa-trash"></i>
              <span>削除</span>
            </div>
          </div>
        </div>
      </div>
      <div class="todo-meta">
        ${todo.priority > 0 ? `<span class="priority-badge priority-${todo.priority}">${getPriorityLabel(todo.priority)}</span>` : ''}
        ${todo.dueDate ? `<span class="due-date ${isOverdue(todo) ? 'overdue' : ''}">${formatDate(todo.dueDate)}</span>` : ''}
        ${(todo.tags || []).length > 0 ? `
          <div class="todo-tags">
            ${(todo.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </li>
  `).join('');

  // 完了済みタスク描画
  completedListElem.innerHTML = completed.map(todo => `
    <li class="todo-item completed" data-id="${todo.id}">
      <div class="todo-main">
        <span class="todo-text">${todo.text}</span>
        <div class="action-menu">
          <button class="menu-button" onclick="toggleActionMenu(event, ${todo.id})" title="アクション">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="menu-dropdown" id="menu-${todo.id}">
            <div class="menu-item edit" onclick="startEdit(${todo.id})">
              <i class="fas fa-edit"></i>
              <span>編集</span>
            </div>
            <div class="menu-item complete" onclick="toggleComplete(${todo.id})">
              <i class="fas fa-undo"></i>
              <span>未完了</span>
            </div>
            <div class="menu-item delete" onclick="deleteTodo(${todo.id})">
              <i class="fas fa-trash"></i>
              <span>削除</span>
            </div>
          </div>
        </div>
      </div>
      <div class="todo-meta">
        ${todo.priority > 0 ? `<span class="priority-badge priority-${todo.priority}">${getPriorityLabel(todo.priority)}</span>` : ''}
        ${todo.dueDate ? `<span class="due-date">${formatDate(todo.dueDate)}</span>` : ''}
        ${(todo.tags || []).length > 0 ? `
          <div class="todo-tags">
            ${(todo.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </li>
  `).join('');

  // アクションメニューの制御を設定
  setupActionMenus();
}

// アクションメニューの制御
function setupActionMenus() {
  // メニュー外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu')) {
      document.querySelectorAll('.menu-dropdown.active').forEach(menu => {
        menu.classList.remove('active');
      });
      document.querySelectorAll('.menu-button.active').forEach(button => {
        button.classList.remove('active');
      });
    }
  });
}

// アクションメニューのトグル
function toggleActionMenu(event, todoId) {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${todoId}`);
  const button = event.currentTarget;

  // 他のメニューを閉じる
  document.querySelectorAll('.menu-dropdown.active').forEach(m => {
    if (m.id !== `menu-${todoId}`) {
      m.classList.remove('active');
    }
  });
  document.querySelectorAll('.menu-button.active').forEach(b => {
    if (b !== button) {
      b.classList.remove('active');
    }
  });

  // クリックされたメニューをトグル
  menu.classList.toggle('active');
  button.classList.toggle('active');
}

// 完了済みタスクのトグル
function setupCompletedToggle() {
  const toggleBtn = document.querySelector('.toggle-completed-btn');
  const completedList = document.querySelector('.completed-list');
  if (!toggleBtn || !completedList) return;
  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      completedList.style.display = 'none';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = '▶ 完了済みタスクを表示';
    } else {
      completedList.style.display = 'block';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = '▼ 完了済みタスクを隠す';
    }
  });
}

// タグの追加
function addTag(tag) {
  if (tag && !state.tags.has(tag)) {
    state.tags.add(tag);
    updateTags();
    saveToLocalStorage();
  }
}

// タグの削除
function removeTag(tag) {
  if (state.tags.has(tag)) {
    state.tags.delete(tag);
    // タグが削除された場合、そのタグを持つタスクからもタグを削除
    state.todos.forEach(todo => {
      if (todo.tags) {
        todo.tags = todo.tags.filter(t => t !== tag);
      }
    });
    updateTags();
    updateTodoLists();
    saveToLocalStorage();
  }
}

// タグセレクターの描画（複数選択可）
function updateTags() {
  // タグセレクター（タスク追加フォーム用）
  if (elements.tagSelector) {
    const tagInputContainer = document.createElement('div');
    tagInputContainer.className = 'tag-input-container';
    tagInputContainer.innerHTML = `
      <input type="text" placeholder="新しいタグを入力..." class="tag-input">
      <button type="button" class="add-tag-btn">+</button>
    `;

    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    tagList.innerHTML = Array.from(state.tags)
      .map(tag => `
        <span class="tag ${state.filters.selectedTags.has(tag) ? 'selected' : ''}" data-tag="${tag}">
          ${tag}
          <button type="button" class="remove-tag" onclick="removeTag('${tag}')">&times;</button>
        </span>
      `).join('');

    elements.tagSelector.innerHTML = '';
    elements.tagSelector.appendChild(tagInputContainer);
    elements.tagSelector.appendChild(tagList);

    // タグ入力のイベントリスナー
    const tagInput = tagInputContainer.querySelector('.tag-input');
    const addTagBtn = tagInputContainer.querySelector('.add-tag-btn');

    const addNewTag = () => {
      const tag = tagInput.value.trim();
      if (tag) {
        addTag(tag);
        tagInput.value = '';
      }
    };

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewTag();
      }
    });

    addTagBtn.addEventListener('click', () => {
      addNewTag();
    });
  }

  // タグフィルター（サイドバー用）
  if (elements.tagFilter) {
    elements.tagFilter.innerHTML = `
      <div class="tag-filter-header">
        <h3>タグで絞り込み</h3>
        <input type="text" class="tag-search" placeholder="タグを検索...">
      </div>
      <div class="tag-list">
        ${Array.from(state.tags).map(tag => `
          <div class="tag-item ${state.filters.selectedTags.has(tag) ? 'active' : ''}" data-tag="${tag}">
            <label>
              <input type="checkbox" ${state.filters.selectedTags.has(tag) ? 'checked' : ''}>
              <span class="tag-name">${tag}</span>
              <span class="tag-count">${state.todos.filter(todo => (todo.tags || []).includes(tag)).length}</span>
            </label>
          </div>
        `).join('')}
      </div>
    `;

    // タグ検索機能
    const tagSearch = elements.tagFilter.querySelector('.tag-search');
    if (tagSearch) {
      tagSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const tagItems = elements.tagFilter.querySelectorAll('.tag-item');
        tagItems.forEach(item => {
          const tagName = item.dataset.tag.toLowerCase();
          item.style.display = tagName.includes(searchTerm) ? '' : 'none';
        });
      });
    }
  }
}

// 期限切れチェック
function isOverdue(todo) {
  return !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();
}

// 優先度ラベルの取得
function getPriorityLabel(priority) {
  switch (priority) {
    case 3: return '高';
    case 2: return '中';
    case 1: return '低';
    default: return 'なし';
  }
}

// 日付のフォーマット
function formatDate(date) {
  return new Date(date).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Todoの追加
function addTodo(text, tags = [], priority = 0, dueDate = null) {
  const todo = {
    id: Date.now(),
    text,
    tags: tags || [],
    completed: false,
    date: new Date(),
    priority,
    dueDate
  };

  state.todos.push(todo);
  if (tags && tags.length > 0) {
    tags.forEach(tag => state.tags.add(tag));
  }
  
  updateTags();
  updateTodoLists();
  updateStats();
  saveToLocalStorage();
}

// Todoの編集開始
function startEdit(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;

  const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`);
  const todoContent = todoItem.querySelector('.todo-content');
  
  todoContent.innerHTML = `
    <form class="edit-form" onsubmit="saveEdit(event, ${id})">
      <input type="text" value="${todo.text}" class="edit-input">
      <select class="edit-priority">
        <option value="0" ${todo.priority === 0 ? 'selected' : ''}>優先度なし</option>
        <option value="1" ${todo.priority === 1 ? 'selected' : ''}>低</option>
        <option value="2" ${todo.priority === 2 ? 'selected' : ''}>中</option>
        <option value="3" ${todo.priority === 3 ? 'selected' : ''}>高</option>
      </select>
      <input type="datetime-local" class="edit-due-date" value="${todo.dueDate || ''}">
      <div class="edit-tags">
        ${Array.from(state.tags).map(tag => `
          <label>
            <input type="checkbox" value="${tag}" ${todo.tags.includes(tag) ? 'checked' : ''}>
            ${tag}
          </label>
        `).join('')}
      </div>
      <div class="edit-actions">
        <button type="submit">保存</button>
        <button type="button" onclick="cancelEdit(${id})">キャンセル</button>
      </div>
    </form>
  `;
}

// Todoの編集保存
function saveEdit(event, id) {
  event.preventDefault();
  const form = event.target;
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;

  todo.text = form.querySelector('.edit-input').value;
  todo.priority = parseInt(form.querySelector('.edit-priority').value);
  todo.dueDate = form.querySelector('.edit-due-date').value || null;
  todo.tags = Array.from(form.querySelectorAll('.edit-tags input:checked')).map(input => input.value);

  updateTodoLists();
  updateStats();
  saveToLocalStorage();
}

// Todoの編集キャンセル
function cancelEdit(id) {
  updateTodoLists();
}

// Todoの完了状態の切り替え
function toggleComplete(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    updateTodoLists();
    updateStats();
    saveToLocalStorage();
  }
}

// Todoの削除
function deleteTodo(id) {
  if (state.settings.hideDeleteConfirm) {
    // 確認ダイアログを表示しない場合
    executeDelete(id);
  } else {
    // 確認ダイアログを表示
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
      <div class="confirm-dialog-content">
        <p>このタスクを削除してもよろしいですか？</p>
        <label>
          <input type="checkbox" id="hideConfirmCheckbox">
          今後表示しない
        </label>
        <div class="confirm-dialog-buttons">
          <button class="confirm-button">削除</button>
          <button class="cancel-button">キャンセル</button>
        </div>
      </div>
    `;

    document.body.appendChild(confirmDialog);

    // イベントリスナーの設定
    const confirmButton = confirmDialog.querySelector('.confirm-button');
    const cancelButton = confirmDialog.querySelector('.cancel-button');
    const hideConfirmCheckbox = confirmDialog.querySelector('#hideConfirmCheckbox');

    confirmButton.addEventListener('click', () => {
      if (hideConfirmCheckbox.checked) {
        state.settings.hideDeleteConfirm = true;
        localStorage.setItem('hideDeleteConfirm', 'true');
      }
      executeDelete(id);
      document.body.removeChild(confirmDialog);
    });

    cancelButton.addEventListener('click', () => {
      document.body.removeChild(confirmDialog);
    });
  }
}

// 削除の実行
function executeDelete(id) {
  state.todos = state.todos.filter(todo => todo.id !== id);
  updateTags();
  updateTodoLists();
  updateStats();
  saveToLocalStorage();
}

// サイドバーの制御
function setupSidebar() {
  const filterButton = document.getElementById('filterButton');
  const tagButton = document.getElementById('tagButton');
  const filterMenu = document.querySelector('.filter-menu');
  const tagMenu = document.querySelector('.tag-menu');

  // フィルターメニューの制御
  filterButton.addEventListener('click', (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle('active');
    tagMenu.classList.remove('active');
    filterButton.classList.toggle('active');
    tagButton.classList.remove('active');
  });

  // タグメニューの制御
  tagButton.addEventListener('click', (e) => {
    e.stopPropagation();
    tagMenu.classList.toggle('active');
    filterMenu.classList.remove('active');
    tagButton.classList.toggle('active');
    filterButton.classList.remove('active');
  });

  // メニュー外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-menu') && !e.target.closest('#filterButton')) {
      filterMenu.classList.remove('active');
      filterButton.classList.remove('active');
    }
    if (!e.target.closest('.tag-menu') && !e.target.closest('#tagButton')) {
      tagMenu.classList.remove('active');
      tagButton.classList.remove('active');
    }
  });

  // // 検索ボックスの制御 →TODO モバイル端末に対応させる
  // const searchBox = document.querySelector('.search-box');
  // const searchInput = document.querySelector('.search-input');

  // searchBox.addEventListener('mouseenter', () => {
  //   searchInput.style.display = 'block';
  //   searchInput.focus();
  // });

  // searchBox.addEventListener('mouseleave', () => {
  //   if (!searchInput.value) {
  //     searchInput.style.display = 'none';
  //   }
  // });
}

// イベントリスナーの設定を更新
function setupEventListeners() {
  setupSidebar();
  
  if (elements.todoForm) {
    elements.todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const text = elements.todoInput.value.trim();
      if (text) {
        const selectedTags = Array.from(elements.tagSelector?.querySelectorAll('.tag.selected') || [])
          .map(tag => tag.dataset.tag);
        const priority = parseInt(elements.prioritySelect?.value || '0');
        const dueDate = elements.dueDateInput?.value || null;
        
        addTodo(text, selectedTags, priority, dueDate);
        
        elements.todoInput.value = '';
        if (elements.prioritySelect) elements.prioritySelect.value = '0';
        if (elements.dueDateInput) elements.dueDateInput.value = '';
      }
    });
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      updateTodoLists();
    });
  }

  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', (e) => {
      state.filters.sortBy = e.target.value;
      updateTodoLists();
    });
  }

  if (elements.tagFilter) {
    elements.tagFilter.addEventListener('change', (e) => {
      const checkbox = e.target.closest('input[type="checkbox"]');
      if (checkbox) {
        const tagItem = checkbox.closest('.tag-item');
        if (tagItem) {
          toggleTag(tagItem.dataset.tag);
        }
      }
    });

    // タグアイテム全体のクリックでも選択可能に
    elements.tagFilter.addEventListener('click', (e) => {
      const tagItem = e.target.closest('.tag-item');
      if (tagItem && !e.target.closest('input[type="checkbox"]')) {
        const checkbox = tagItem.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleTag(tagItem.dataset.tag);
        }
      }
    });
  }

  if (elements.tagSelector) {
    elements.tagSelector.addEventListener('click', (e) => {
      const tag = e.target.closest('.tag');
      if (tag) {
        tag.classList.toggle('selected');
      }
    });
  }

  if (elements.showCompletedToggle) {
    elements.showCompletedToggle.addEventListener('change', (e) => {
      state.filters.showCompleted = e.target.checked;
      updateTodoLists();
    });
  }
}

// モバイル用タスク追加フォームの制御
const addTaskFab = document.getElementById('addTaskFab');
const mobileTodoForm = document.querySelector('.mobile-todo-form');
const closeBtn = document.querySelector('.close-btn');
const mobileTodoFormElement = document.getElementById('mobileTodoForm');
const mobileTaskInput = document.getElementById('mobileTaskInput');
const mobilePrioritySelect = document.getElementById('mobilePrioritySelect');
const mobileDueDateInput = document.getElementById('mobileDueDateInput');

addTaskFab.addEventListener('click', () => {
  mobileTodoForm.classList.add('active');
});

closeBtn.addEventListener('click', () => {
  mobileTodoForm.classList.remove('active');
});

mobileTodoFormElement.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const task = {
    id: Date.now(),
    text: mobileTaskInput.value,
    completed: false,
    priority: mobilePrioritySelect.value,
    dueDate: mobileDueDateInput.value,
    tags: []
  };

  addTodo(task);
  mobileTodoForm.classList.remove('active');
  mobileTaskInput.value = '';
  mobilePrioritySelect.value = 'low';
  mobileDueDateInput.value = '';
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupCompletedToggle();
  updateStats();
  updateTags();
  updateTodoLists();
}); 