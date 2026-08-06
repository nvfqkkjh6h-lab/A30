// Storage Key（古い残存データを一括クリアするためキー名を更新）
const STORAGE_KEY = 'my_text_app_data_clean_v6';

// Global State
let appData = {
  questions: [],
  folders: [],
  goals: {
    main: '',
    mainDate: '',
    miniList: []
  },
  logs: [],
  theme: 'theme-purple',
  totalSolvedCount: 0
};

let currentImages = [];
let subjectChartInstance = null;
let currentSelectedReviewSubject = null;
let currentReviewFilterType = 'all';

// ギャラリービューアー用ステート
let galleryImagesList = [];
let galleryCurrentIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let isViewerControlsVisible = true;

// On Load
window.onload = function() {
  loadData();
  applyTheme(appData.theme || 'theme-purple');
  renderFolders();
  updateSubjectFilterOptions();
  renderQuestions();
  initAnalytics();
  renderGoals();
  renderMyPage();
  setupGallerySwipe();
};

// 永久データ保存 (LocalStorage)
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch(e) {
    showToast('データ容量制限を超えた可能性があります。不要な画像を削除してください。');
  }
}

// データ読み込み（過去キーからの勝手な自動移行を行わない設計）
function loadData() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  
  if (rawData) {
    try {
      appData = JSON.parse(rawData);
    } catch(e) {
      console.error('Data parsing error', e);
      resetAppData();
    }
  } else {
    resetAppData();
  }

  if (!appData || typeof appData !== 'object') resetAppData();
  if (!appData.goals) appData.goals = { main: '', mainDate: '', miniList: [] };
  if (!Array.isArray(appData.goals.miniList)) appData.goals.miniList = [];
  if (!Array.isArray(appData.questions)) appData.questions = [];
  if (!Array.isArray(appData.folders)) appData.folders = [];
  if (!Array.isArray(appData.logs)) appData.logs = [];
  if (!appData.theme) appData.theme = 'theme-purple';
  if (typeof appData.totalSolvedCount !== 'number') appData.totalSolvedCount = appData.logs.length || 0;

  saveData();
}

function resetAppData() {
  appData = {
    questions: [],
    folders: [],
    goals: { main: '', mainDate: '', miniList: [] },
    logs: [],
    theme: 'theme-purple',
    totalSolvedCount: 0
  };
}

// マイページからの手動全消去機能
function clearAllDataAndReset() {
  if (confirm('すべての登録データと過去の履歴を消去します。よろしいですか？')) {
    localStorage.removeItem(STORAGE_KEY);
    resetAppData();
    saveData();
    location.reload();
  }
}

function showToast(message) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.add('active');
  
  const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(btn => 
    btn.getAttribute('onclick')?.includes(tabName)
  );
  if (activeBtn) activeBtn.classList.add('active');

  if (tabName === 'analytics') renderAnalytics();
  if (tabName === 'review') renderReviewSubjectFolders();
  if (tabName === 'home') renderQuestions();
  if (tabName === 'mypage') renderMyPage();
}

/* ==================== 全画面画像ギャラリー（スワイプ・トグル表示） ==================== */
function openImageViewer(imagesArray, startIndex = 0) {
  if (!imagesArray || imagesArray.length === 0) return;

  galleryImagesList = typeof imagesArray === 'string' ? [imagesArray] : imagesArray;
  galleryCurrentIndex = startIndex;
  isViewerControlsVisible = true; // 開いた時はコントロールを表示

  const modal = document.getElementById('modal-image-viewer');
  if (modal) {
    modal.style.display = 'flex';
    updateGalleryDisplay();
    setViewerControlsVisibility(true);
  }
}

function updateGalleryDisplay() {
  const imgEl = document.getElementById('full-image-display');
  const counterEl = document.getElementById('image-viewer-counter');
  const prevBtn = document.getElementById('viewer-prev-btn');
  const nextBtn = document.getElementById('viewer-next-btn');

  if (imgEl) {
    imgEl.src = galleryImagesList[galleryCurrentIndex];
  }

  if (counterEl) {
    if (galleryImagesList.length > 1) {
      counterEl.innerText = `${galleryCurrentIndex + 1} / ${galleryImagesList.length}`;
      counterEl.style.display = 'block';
    } else {
      counterEl.style.display = 'none';
    }
  }

  if (prevBtn && nextBtn) {
    if (galleryImagesList.length > 1) {
      prevBtn.style.display = galleryCurrentIndex > 0 ? 'flex' : 'none';
      nextBtn.style.display = galleryCurrentIndex < galleryImagesList.length - 1 ? 'flex' : 'none';
    } else {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    }
  }
}

// 画面タップでUI（矢印・閉じるボタン・カウンター）の表示/非表示をトグル
function toggleViewerControls() {
  isViewerControlsVisible = !isViewerControlsVisible;
  setViewerControlsVisibility(isViewerControlsVisible);
}

function setViewerControlsVisibility(visible) {
  const closeBtn = document.getElementById('viewer-close-btn');
  const prevBtn = document.getElementById('viewer-prev-btn');
  const nextBtn = document.getElementById('viewer-next-btn');
  const counter = document.getElementById('image-viewer-counter');

  const action = visible ? 'remove' : 'add';

  if (closeBtn) closeBtn.classList[action]('controls-hidden');
  if (prevBtn) prevBtn.classList[action]('controls-hidden');
  if (nextBtn) nextBtn.classList[action]('controls-hidden');
  if (counter) counter.classList[action]('controls-hidden');
}

function prevImageViewer() {
  if (galleryCurrentIndex > 0) {
    galleryCurrentIndex--;
    updateGalleryDisplay();
  }
}

function nextImageViewer() {
  if (galleryCurrentIndex < galleryImagesList.length - 1) {
    galleryCurrentIndex++;
    updateGalleryDisplay();
  }
}

function closeImageViewer() {
  const modal = document.getElementById('modal-image-viewer');
  if (modal) {
    modal.style.display = 'none';
  }
}

// スマホスワイプ ＆ キーボード操作の設定
function setupGallerySwipe() {
  const modal = document.getElementById('modal-image-viewer');
  if (!modal) return;

  modal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleGallerySwipe();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.key === 'ArrowLeft') prevImageViewer();
      if (e.key === 'ArrowRight') nextImageViewer();
      if (e.key === 'Escape') closeImageViewer();
    }
  });
}

function handleGallerySwipe() {
  const swipeThreshold = 40;
  if (touchEndX < touchStartX - swipeThreshold) {
    nextImageViewer();
  }
  if (touchEndX > touchStartX + swipeThreshold) {
    prevImageViewer();
  }
}

/* ==================== テーマ切り替え ==================== */
function changeTheme(themeName) {
  appData.theme = themeName;
  applyTheme(themeName);
  saveData();
  showToast('テーマを変更しました');
}

function applyTheme(themeName) {
  document.body.className = themeName;
}

/* ==================== マイページ描画 ==================== */
function renderMyPage() {
  const el = document.getElementById('total-solved-count');
  if (el) {
    el.innerHTML = `${appData.totalSolvedCount} <span style="font-size:1.2rem; color:#64748b;">回</span>`;
  }
}

/* ==================== 画像リサイズ & 処理 ==================== */
function handleImageUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const spinner = document.getElementById('image-loading-spinner');
  if (spinner) spinner.style.display = 'block';

  let processedCount = 0;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        currentImages.push(compressedDataUrl);

        processedCount++;
        if (processedCount === files.length) {
          if (spinner) spinner.style.display = 'none';
          renderImagePreviews();
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById('image-preview');
  if (!container) return;
  container.innerHTML = currentImages.map((src, idx) => `
    <div class="compact-thumb-container">
      <img src="${src}" class="compact-thumb" alt="thumb" onclick="openImageViewer(currentImages, ${idx})">
      <button type="button" class="remove-thumb-btn" onclick="removeImage(${idx})">&times;</button>
    </div>
  `).join('');
}

function removeImage(index) {
  currentImages.splice(index, 1);
  renderImagePreviews();
}

/* ==================== 目標設定ロジック ==================== */
function renderGoals() {
  const mainText = document.getElementById('main-goal-display');
  const mainDate = document.getElementById('main-goal-date');
  if (mainText) mainText.innerText = appData.goals.main || '目標が設定されていません';
  if (mainDate) mainDate.innerText = appData.goals.mainDate ? `${appData.goals.mainDate}まで` : '期日未定';

  const listContainer = document.getElementById('mini-goals-list');
  if (listContainer) {
    if (appData.goals.miniList.length === 0) {
      listContainer.innerHTML = `<p style="font-size:0.85rem; opacity:0.8;">直近のミニ目標はありません</p>`;
    } else {
      listContainer.innerHTML = appData.goals.miniList.map(item => `
        <div class="mini-goal-item">
          <div>
            <div class="mini-text">${item.text}</div>
            <div class="mini-date">${item.date ? `${item.date}まで` : '期日未定'}</div>
          </div>
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.2); color:#fff; padding:2px 6px;" onclick="deleteMiniGoal('${item.id}')">削除</button>
        </div>
      `).join('');
    }
  }
}

function toggleGoalEdit(type) {
  const form = document.getElementById(`${type}-goal-edit`);
  if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

function saveMainGoal() {
  const text = document.getElementById('main-goal-input').value;
  const date = document.getElementById('main-goal-date-input').value;
  appData.goals.main = text;
  appData.goals.mainDate = date;
  saveData();
  renderGoals();
  toggleGoalEdit('main');
  showToast('大きな目標を保存しました');
}

function clearMainGoal() {
  appData.goals.main = '';
  appData.goals.mainDate = '';
  document.getElementById('main-goal-input').value = '';
  document.getElementById('main-goal-date-input').value = '';
  saveData();
  renderGoals();
  toggleGoalEdit('main');
  showToast('目標を消去しました');
}

function addMiniGoal() {
  const text = document.getElementById('mini-goal-text-input').value;
  const date = document.getElementById('mini-goal-date-input').value;
  if (!text) return;

  appData.goals.miniList.push({
    id: Date.now().toString(),
    text: text,
    date: date
  });

  document.getElementById('mini-goal-text-input').value = '';
  document.getElementById('mini-goal-date-input').value = '';

  saveData();
  renderGoals();
  toggleGoalEdit('mini');
  showToast('ミニ目標を追加しました');
}

function deleteMiniGoal(id) {
  appData.goals.miniList = appData.goals.miniList.filter(item => item.id !== id);
  saveData();
  renderGoals();
  showToast('ミニ目標を削除しました');
}

/* ==================== 復習モード ==================== */
function renderReviewSubjectFolders() {
  currentSelectedReviewSubject = null;
  
  const titleEl = document.getElementById('review-header-title');
  const backBtn = document.getElementById('review-back-btn');
  const segmentControls = document.getElementById('review-segment-controls');
  const gridContainer = document.getElementById('review-subject-grid');
  const listContainer = document.getElementById('review-compact-list');

  if (titleEl) titleEl.innerText = '復習モード (科目選択)';
  if (backBtn) backBtn.style.display = 'none';
  if (segmentControls) segmentControls.style.display = 'none';
  if (gridContainer) gridContainer.style.display = 'grid';
  if (listContainer) listContainer.style.display = 'none';

  const subjects = [...new Set(appData.questions.map(q => q.subject).filter(Boolean))];

  if (subjects.length === 0) {
    gridContainer.innerHTML = `<p style="grid-column:1/-1; color:#64748b; text-align:center; padding: 20px 0;">登録された問題はありません。</p>`;
    return;
  }

  gridContainer.innerHTML = subjects.map(sub => {
    const count = appData.questions.filter(q => q.subject === sub).length;
    return `
      <div class="book-card" onclick="openReviewSubject('${sub}')">
        <div class="book-title">${sub}</div>
        <div class="book-count">${count}問の復習</div>
      </div>
    `;
  }).join('');
}

function openReviewSubject(subjectName) {
  currentSelectedReviewSubject = subjectName;

  const titleEl = document.getElementById('review-header-title');
  const backBtn = document.getElementById('review-back-btn');
  const segmentControls = document.getElementById('review-segment-controls');
  const gridContainer = document.getElementById('review-subject-grid');
  const listContainer = document.getElementById('review-compact-list');

  if (titleEl) titleEl.innerText = `${subjectName} の復習`;
  if (backBtn) backBtn.style.display = 'block';
  if (segmentControls) segmentControls.style.display = 'flex';
  if (gridContainer) gridContainer.style.display = 'none';
  if (listContainer) listContainer.style.display = 'flex';

  filterReviewList('all');
}

function filterReviewList(type, btnEl) {
  currentReviewFilterType = type;

  if (btnEl) {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const today = new Date().toISOString().split('T')[0];
  let list = appData.questions.filter(q => q.subject === currentSelectedReviewSubject);

  if (type === 'due') {
    list = list.filter(q => q.nextReviewDate && q.nextReviewDate <= today);
  } else if (type === 'incorrect') {
    list = list.filter(q => q.lastStatus === '不正解' || q.lastStatus === 'イマイチ');
  } else if (type === 'bedtime') {
    list = list.filter(q => q.bedtimeList);
  } else if (type === 'exam') {
    list = list.filter(q => q.examList);
  }

  renderCompactReviewList(list);
}

function renderCompactReviewList(list) {
  const container = document.getElementById('review-compact-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#64748b; padding:2rem 0;">対象の問題はありません。</p>`;
    return;
  }

  container.innerHTML = list.map(q => {
    let statusBadge = '<span class="status-badge status-none">未演習</span>';
    if (q.lastStatus === '解けた') statusBadge = '<span class="status-badge status-solved">解けた</span>';
    else if (q.lastStatus === 'イマイチ') statusBadge = '<span class="status-badge status-so-so">イマイチ</span>';
    else if (q.lastStatus === '不正解') statusBadge = '<span class="status-badge status-failed">不正解</span>';

    const lastDate = q.lastSolvedDate ? q.lastSolvedDate : '未解いた';

    return `
      <div class="compact-row" onclick="openReviewModal('${q.id}')">
        <div class="compact-left">
          <span class="compact-title">${q.title}</span>
          <span class="compact-sub">${q.field ? `/ ${q.field}` : ''}</span>
        </div>
        <div class="compact-right">
          <span class="compact-date">解いた日: ${lastDate}</span>
          ${statusBadge}
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== 問題保存 & 編集 & ホーム一覧 ==================== */
function handleSaveQuestion(e) {
  e.preventDefault();

  const idInput = document.getElementById('edit-id').value;
  const id = idInput ? idInput : Date.now().toString();
  const selectedFolders = Array.from(document.getElementById('q-folders').selectedOptions).map(o => o.value);
  const tags = document.getElementById('q-tags').value.split(',').map(t => t.trim()).filter(t => t);

  const existing = appData.questions.find(q => q.id === id);

  const questionObj = {
    id: id,
    title: document.getElementById('q-title').value,
    images: [...currentImages],
    memo: document.getElementById('q-memo').value,
    subject: document.getElementById('q-subject').value.trim() || '未分類',
    field: document.getElementById('q-field').value.trim() || '',
    tags: tags,
    label: document.getElementById('q-label').value,
    folders: selectedFolders,
    lastSolvedDate: existing ? existing.lastSolvedDate : null,
    lastStatus: existing ? existing.lastStatus : null,
    nextReviewDate: existing ? existing.nextReviewDate : new Date().toISOString().split('T')[0],
    bedtimeList: existing ? existing.bedtimeList : false,
    examList: existing ? existing.examList : false,
    history: existing ? existing.history : []
  };

  if (existing) {
    const idx = appData.questions.findIndex(q => q.id === id);
    appData.questions[idx] = questionObj;
  } else {
    appData.questions.push(questionObj);
  }

  saveData();
  updateSubjectFilterOptions();
  resetForm();
  showToast('問題を保存しました');
  switchTab('home');
}

function resetForm() {
  const form = document.getElementById('question-form');
  if (form) form.reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('q-image-file').value = '';
  currentImages = [];
  renderImagePreviews();
}

function updateSubjectFilterOptions() {
  const select = document.getElementById('filter-subject');
  if (!select) return;

  const currentVal = select.value;
  const subjects = [...new Set(appData.questions.map(q => q.subject).filter(Boolean))];

  select.innerHTML = `<option value="">すべての科目</option>` + 
    subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  
  select.value = currentVal;
}

function renderQuestions() {
  const container = document.getElementById('questions-list');
  const search = document.getElementById('search-input')?.value.toLowerCase() || '';
  const subject = document.getElementById('filter-subject')?.value || '';
  const folder = document.getElementById('filter-folder')?.value || '';

  const filtered = appData.questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(search) || 
                          (q.memo && q.memo.toLowerCase().includes(search));
                          
    const matchesSubject = !subject || q.subject === subject;
    const matchesFolder = !folder || q.folders.includes(folder);

    return matchesSearch && matchesSubject && matchesFolder;
  });

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2.5rem 0; font-weight: 500;">該当する問題がありません。</p>`;
    return;
  }

  container.innerHTML = filtered.map(q => {
    let statusBadge = '';
    if (q.lastStatus === '解けた') statusBadge = '<span class="status-badge status-solved">解けた</span>';
    else if (q.lastStatus === 'イマイチ') statusBadge = '<span class="status-badge status-so-so">イマイチ</span>';
    else if (q.lastStatus === '不正解') statusBadge = '<span class="status-badge status-failed">不正解</span>';

    return `
      <div class="apple-card card-item">
        <div>
          <div class="card-header-row">
            <span class="card-title">${q.title}</span>
            ${q.label ? `<span class="badge">${q.label}</span>` : ''}
          </div>
          <p class="card-sub">科目: ${q.subject} ${q.field ? `/ ${q.field}` : ''}</p>
          <p class="card-text-preview">${q.memo ? q.memo.substring(0, 50) + '...' : '（メモなし）'}</p>
          <div class="tags-row">
            ${q.folders.map(f => `<span class="tag-item">${f}</span>`).join('')}
            ${q.tags.map(t => `<span class="tag-item">#${t}</span>`).join('')}
          </div>
        </div>
        <div>
          <div class="divider"></div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <small style="color:#64748b;">次回復習: ${q.nextReviewDate || '未設定'}</small>
            ${statusBadge}
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary" style="flex:1" onclick="openReviewModal('${q.id}')">解く</button>
            <button class="btn btn-secondary" onclick="editQuestion('${q.id}')">編集</button>
            <button class="btn btn-danger" onclick="deleteQuestion('${q.id}')">削除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function editQuestion(id) {
  const q = appData.questions.find(item => item.id === id);
  if (!q) return;

  switchTab('add');
  document.getElementById('edit-id').value = q.id;
  document.getElementById('q-title').value = q.title;
  document.getElementById('q-memo').value = q.memo || '';
  document.getElementById('q-subject').value = q.subject;
  document.getElementById('q-field').value = q.field || '';
  document.getElementById('q-tags').value = q.tags ? q.tags.join(', ') : '';
  document.getElementById('q-label').value = q.label || '';
  
  const folderSelect = document.getElementById('q-folders');
  if (folderSelect) {
    Array.from(folderSelect.options).forEach(opt => {
      opt.selected = q.folders.includes(opt.value);
    });
  }

  currentImages = q.images ? [...q.images] : [];
  renderImagePreviews();
}

function deleteQuestion(id) {
  appData.questions = appData.questions.filter(q => q.id !== id);
  saveData();
  updateSubjectFilterOptions();
  renderQuestions();
  showToast('問題を削除しました');
}

/* ==================== 問題解くモーダル ＆ 全画面表示連携 ==================== */
function openReviewModal(id) {
  const q = appData.questions.find(item => item.id === id);
  if (!q) return;

  const modal = document.getElementById('modal-review');
  document.getElementById('modal-q-title').innerText = q.title;

  const imagesJson = JSON.stringify(q.images || []).replace(/"/g, '&quot;');

  const body = document.getElementById('modal-review-body');
  body.innerHTML = `
    <p style="color:#64748b; margin-bottom:10px;">科目: ${q.subject} ${q.field ? `/ ${q.field}` : ''}</p>
    
    <div style="margin: 10px 0; display:flex; gap:8px; flex-wrap:wrap;">
      ${(q.images || []).map((img, idx) => `
        <img src="${img}" class="expandable-image" onclick="openImageViewer(${imagesJson}, ${idx})" style="max-width:100%; height:auto; border-radius:12px; max-height:220px;" title="タップして拡大">
      `).join('')}
    </div>

    <button class="btn btn-secondary" style="width:100%; margin-bottom:1rem;" onclick="document.getElementById('modal-memo').style.display='block'">メモを表示</button>

    <div id="modal-memo" style="display:none; background:rgba(79, 70, 229, 0.08); padding:1rem; border-radius:12px; margin-bottom:1rem;">
      <h4 style="color:#4f46e5; margin-bottom:5px;">メモ</h4>
      <p style="white-space: pre-wrap; color:#334155;">${q.memo || 'メモはありません'}</p>
    </div>

    <div class="divider"></div>

    <p style="font-size:0.9rem; font-weight:bold; color:#1e293b; margin-bottom:8px;">理解度を選択して記録:</p>
    <div style="display:flex; gap:8px; margin-bottom:1rem;">
      <button class="btn btn-success" style="flex:1;" onclick="recordAssessment('${q.id}', '解けた')">解けた</button>
      <button class="btn btn-warning" style="flex:1;" onclick="recordAssessment('${q.id}', 'イマイチ')">イマイチ</button>
      <button class="btn btn-danger" style="flex:1;" onclick="recordAssessment('${q.id}', '不正解')">不正解</button>
    </div>

    <div style="display:flex; gap:15px; font-size:0.85rem; color:#475569;">
      <label><input type="checkbox" ${q.bedtimeList ? 'checked' : ''} onchange="toggleList('${q.id}', 'bedtimeList', this.checked)"> 寝る前リストに追加</label>
      <label><input type="checkbox" ${q.examList ? 'checked' : ''} onchange="toggleList('${q.id}', 'examList', this.checked)"> 試験直前リストに追加</label>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeReviewModal() {
  document.getElementById('modal-review').style.display = 'none';
}

function recordAssessment(qId, status) {
  const q = appData.questions.find(item => item.id === qId);
  if (!q) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();

  q.lastSolvedDate = todayStr;
  q.lastStatus = status;

  let daysToAdd = 1;
  if (status === '解けた') daysToAdd = 4;
  else if (status === 'イマイチ') daysToAdd = 2;
  else if (status === '不正解') daysToAdd = 1;

  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysToAdd);
  q.nextReviewDate = nextDate.toISOString().split('T')[0];

  if (!q.history) q.history = [];
  q.history.push({ date: todayStr, status: status });

  appData.totalSolvedCount = (appData.totalSolvedCount || 0) + 1;

  appData.logs.unshift({
    date: todayStr,
    title: q.title,
    subject: q.subject,
    status: status
  });

  saveData();
  closeReviewModal();

  if (currentSelectedReviewSubject) {
    filterReviewList(currentReviewFilterType);
  }
  renderQuestions();
  renderMyPage();
  showToast(`記録しました（${status}）`);
}

function toggleList(id, listType, isChecked) {
  const q = appData.questions.find(item => item.id === id);
  if (q) {
    q[listType] = isChecked;
    saveData();
  }
}

/* ==================== フォルダ & 分析 ==================== */
function renderFolders() {
  const select = document.getElementById('q-folders');
  const filterSelect = document.getElementById('filter-folder');

  if (select) {
    select.innerHTML = appData.folders.map(f => `<option value="${f}">${f}</option>`).join('');
  }
  if (filterSelect) {
    filterSelect.innerHTML = `<option value="">すべてのフォルダ</option>` + appData.folders.map(f => `<option value="${f}">${f}</option>`).join('');
  }
}

function initAnalytics() {
  const canvas1 = document.getElementById('subjectChart');
  if (!canvas1) return;
  
  const ctx1 = canvas1.getContext('2d');

  subjectChartInstance = new Chart(ctx1, {
    type: 'bar',
    data: { 
      labels: [], 
      datasets: [{ 
        label: '「解けた」割合 (%)', 
        data: [], 
        backgroundColor: '#4f46e5', 
        borderRadius: 8 
      }] 
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function renderAnalytics() {
  const subjects = [...new Set(appData.questions.map(q => q.subject).filter(Boolean))];
  const accuracyData = [];

  subjects.forEach(sub => {
    const qList = appData.questions.filter(q => q.subject === sub);
    const solvedList = qList.filter(q => q.lastStatus === '解けた').length;
    const rate = qList.length > 0 ? Math.round((solvedList / qList.length) * 100) : 0;
    accuracyData.push(rate);
  });

  if (subjectChartInstance) {
    subjectChartInstance.data.labels = subjects;
    subjectChartInstance.data.datasets[0].data = accuracyData;
    subjectChartInstance.update();
  }

  const logContainer = document.getElementById('analytics-log-list');
  if (logContainer) {
    if (!appData.logs || appData.logs.length === 0) {
      logContainer.innerHTML = `<p style="color:#64748b; font-size:0.85rem;">まだ学習履歴がありません。</p>`;
    } else {
      logContainer.innerHTML = appData.logs.slice(0, 10).map(log => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.7); padding:8px 12px; border-radius:8px;">
          <div>
            <span style="font-weight:bold; font-size:0.9rem;">${log.title}</span>
            <small style="color:#64748b; margin-left:6px;">(${log.subject})</small>
          </div>
          <div>
            <small style="color:#64748b; margin-right:8px;">${log.date}</small>
            <span class="status-badge ${log.status === '解けた' ? 'status-solved' : log.status === 'イマイチ' ? 'status-so-so' : 'status-failed'}">${log.status}</span>
          </div>
        </div>
      `).join('');
    }
  }
}
