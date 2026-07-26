// script.js - Core logic for English Learning Hub
// Handles Vocabulary Cards, Listening Logs, Progress Dashboard, Schedule, and Essay Checking

// ---------- LocalStorage Helper ----------
const storage = {
  get(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.error('Storage get error:', e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },
};

// ---------- Tab Navigation ----------
const tabs = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.section');

function switchTab(sectionId) {
  sections.forEach(s => s.classList.toggle('active', s.id === sectionId));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.section === sectionId));
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.section));
});

// Default seed data if empty
const defaultVocab = [
  { word: 'ephemeral', phonetic: '/ɪˈfemərəl/', meaning: 'adj. 转瞬即逝的，短暂的', example: 'Fame in the world of pop music is often ephemeral.', learned: false },
  { word: 'resilience', phonetic: '/rɪˈzɪliəns/', meaning: 'n. 恢复力，弹力，适应力', example: 'Courage and resilience are essential for overcoming hardship.', learned: true },
  { word: 'serendipity', phonetic: '/ˌserənˈdɪpəti/', meaning: 'n. 意外发现珍贵事物的本领，机缘巧合', example: 'We found this charming cafe by pure serendipity.', learned: false }
];

// ---------- Vocabulary Module ----------
const vocabKey = 'vocabCards';
let vocabCards = storage.get(vocabKey, defaultVocab);
if (vocabCards.length === 0) {
  vocabCards = defaultVocab;
  storage.set(vocabKey, vocabCards);
}

let currentFilter = 'all';
let currentSearch = '';

const cardContainer = document.getElementById('card-container');
const vocabEmpty = document.getElementById('vocab-empty');
const vocabSearchInput = document.getElementById('vocab-search');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats Elements
const countAllEl = document.getElementById('count-all');
const countReviewEl = document.getElementById('count-review');
const countMasteredEl = document.getElementById('count-mastered');
const progressBarEl = document.getElementById('vocab-progress-bar');
const masteryRateEl = document.getElementById('vocab-mastery-rate');
const totalBadgeEl = document.getElementById('vocab-total-badge');

// Word Modal Elements
const addCardBtn = document.getElementById('add-card-btn');
const wordModal = document.getElementById('word-modal');
const modalTitle = document.getElementById('modal-title');
const wordForm = document.getElementById('word-form');
const editIndexInput = document.getElementById('edit-word-index');
const wordInput = document.getElementById('word-input');
const phoneticInput = document.getElementById('phonetic-input');
const meaningInput = document.getElementById('meaning-input');
const exampleInput = document.getElementById('example-input');
const learnedInput = document.getElementById('learned-input');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

function updateVocabStats() {
  const total = vocabCards.length;
  const mastered = vocabCards.filter(c => c.learned).length;
  const review = total - mastered;
  const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;

  countAllEl.textContent = total;
  countReviewEl.textContent = review;
  countMasteredEl.textContent = mastered;

  progressBarEl.style.width = `${rate}%`;
  masteryRateEl.textContent = `${rate}% 已掌握`;
  totalBadgeEl.textContent = `共 ${total} 词`;

  // Update dashboard stat numbers if visible
  const statTotal = document.getElementById('stat-total-vocab');
  const statMastered = document.getElementById('stat-mastered-vocab');
  if (statTotal) statTotal.textContent = total;
  if (statMastered) statMastered.textContent = mastered;
}

function renderVocab() {
  cardContainer.innerHTML = '';
  updateVocabStats();

  const query = currentSearch.toLowerCase().trim();
  const filtered = vocabCards.filter((card, originalIdx) => {
    card._originalIdx = originalIdx; // track real array index
    
    // Status filter
    if (currentFilter === 'mastered' && !card.learned) return false;
    if (currentFilter === 'review' && card.learned) return false;

    // Search filter
    if (query) {
      const matchWord = card.word.toLowerCase().includes(query);
      const matchMeaning = card.meaning.toLowerCase().includes(query);
      return matchWord || matchMeaning;
    }
    return true;
  });

  if (filtered.length === 0) {
    vocabEmpty.classList.remove('hidden');
  } else {
    vocabEmpty.classList.add('hidden');
  }

  filtered.forEach(cardData => {
    const origIdx = cardData._originalIdx;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'vocab-card-wrapper';

    const card = document.createElement('div');
    card.className = 'vocab-card';

    // Front Face
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    front.innerHTML = `
      <div class="card-top">
        <span class="status-tag ${cardData.learned ? 'mastered' : 'review'}">
          ${cardData.learned ? '已掌握' : '需复习'}
        </span>
        <div class="card-actions">
          <button class="icon-btn audio-btn" title="朗读发音" data-action="audio">🔊</button>
          <button class="icon-btn edit-btn" title="修改单词" data-action="edit">✏️</button>
          <button class="icon-btn delete-btn" title="删除" data-action="delete">🗑️</button>
        </div>
      </div>
      <div class="card-body-main">
        <div class="card-word">${escapeHtml(cardData.word)}</div>
        ${cardData.phonetic ? `<div class="card-phonetic">${escapeHtml(cardData.phonetic)}</div>` : ''}
      </div>
      <div class="card-hint">💡 点击翻转卡片</div>
    `;

    // Back Face
    const back = document.createElement('div');
    back.className = 'card-face card-back';
    back.innerHTML = `
      <div class="card-top">
        <span class="status-tag ${cardData.learned ? 'mastered' : 'review'}">
          ${cardData.learned ? '已掌握' : '需复习'}
        </span>
        <div class="card-actions">
          <button class="icon-btn toggle-status-btn" title="切换掌握状态" data-action="toggle-status">
            ${cardData.learned ? '🔄 设为需复习' : '✅ 设为已掌握'}
          </button>
        </div>
      </div>
      <div class="card-body-main">
        <div class="card-meaning">${escapeHtml(cardData.meaning)}</div>
        ${cardData.example ? `<div class="card-example">"${escapeHtml(cardData.example)}"</div>` : ''}
      </div>
      <div class="card-hint">💡 点击翻回正面</div>
    `;

    card.appendChild(front);
    card.appendChild(back);
    wrapper.appendChild(card);

    // Click event to flip card, avoiding action buttons
    card.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        if (action === 'audio') {
          speakWord(cardData.word);
        } else if (action === 'edit') {
          openWordModal(origIdx);
        } else if (action === 'delete') {
          deleteWord(origIdx);
        } else if (action === 'toggle-status') {
          toggleWordStatus(origIdx);
        }
        return;
      }
      card.classList.toggle('flipped');
    });

    cardContainer.appendChild(wrapper);
  });
}

function speakWord(word) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // stop active speech
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('当前浏览器不支持语音合成。');
  }
}

function deleteWord(idx) {
  if (confirm(`确定要删除单词 "${vocabCards[idx].word}" 吗？`)) {
    vocabCards.splice(idx, 1);
    storage.set(vocabKey, vocabCards);
    renderVocab();
    updateDashboard();
  }
}

function toggleWordStatus(idx) {
  vocabCards[idx].learned = !vocabCards[idx].learned;
  storage.set(vocabKey, vocabCards);
  renderVocab();
  updateDashboard();
}

// Modal Handlers for Vocabulary
function openWordModal(editIdx = -1) {
  editIndexInput.value = editIdx;
  if (editIdx >= 0) {
    const card = vocabCards[editIdx];
    modalTitle.textContent = '编辑单词信息';
    wordInput.value = card.word;
    phoneticInput.value = card.phonetic || '';
    meaningInput.value = card.meaning;
    exampleInput.value = card.example || '';
    learnedInput.checked = !!card.learned;
  } else {
    modalTitle.textContent = '新增单词';
    wordForm.reset();
    editIndexInput.value = -1;
    learnedInput.checked = false;
  }
  wordModal.classList.remove('hidden');
  wordInput.focus();
}

function closeWordModal() {
  wordModal.classList.add('hidden');
  wordForm.reset();
}

addCardBtn.addEventListener('click', () => openWordModal(-1));
modalCloseBtn.addEventListener('click', closeWordModal);
modalCancelBtn.addEventListener('click', closeWordModal);

wordModal.addEventListener('click', (e) => {
  if (e.target === wordModal) closeWordModal();
});

wordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const idx = parseInt(editIndexInput.value, 10);
  const newCard = {
    word: wordInput.value.trim(),
    phonetic: phoneticInput.value.trim(),
    meaning: meaningInput.value.trim(),
    example: exampleInput.value.trim(),
    learned: learnedInput.checked
  };

  if (!newCard.word || !newCard.meaning) {
    alert('单词和中文释义为必填项！');
    return;
  }

  if (idx >= 0) {
    vocabCards[idx] = newCard;
  } else {
    vocabCards.unshift(newCard); // Add to top
  }

  storage.set(vocabKey, vocabCards);
  closeWordModal();
  renderVocab();
  updateDashboard();
});

// Search & Filter Events
vocabSearchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  renderVocab();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderVocab();
  });
});

// ---------- Listening Log Module ----------
const listeningKey = 'listeningLogs';
const defaultListening = [
  { title: 'BBC 6 Minute English - The power of music', minutes: 6, date: new Date().toISOString() },
  { title: 'VOA Learning English - Daily News Briefing', minutes: 15, date: new Date().toISOString() }
];

let listeningLogs = storage.get(listeningKey, defaultListening);
const listeningList = document.getElementById('listening-list');
const listeningEmpty = document.getElementById('listening-empty');
const addListeningBtn = document.getElementById('add-listening-btn');
const listeningModal = document.getElementById('listening-modal');
const listeningModalClose = document.getElementById('listening-modal-close');
const listeningModalCancel = document.getElementById('listening-modal-cancel');
const listeningForm = document.getElementById('listening-form');
const listeningTitleInput = document.getElementById('listening-title-input');
const listeningMinutesInput = document.getElementById('listening-minutes-input');

function renderListening() {
  listeningList.innerHTML = '';
  const totalMinutes = listeningLogs.reduce((sum, l) => sum + (parseInt(l.minutes, 10) || 0), 0);

  // Update stat label on dashboard
  const statListening = document.getElementById('stat-total-listening');
  if (statListening) statListening.textContent = `${totalMinutes} min`;

  if (listeningLogs.length === 0) {
    listeningEmpty.classList.remove('hidden');
    return;
  }
  listeningEmpty.classList.add('hidden');

  listeningLogs.forEach((log, idx) => {
    const li = document.createElement('li');
    li.className = 'listening-item';
    const dateStr = log.date ? new Date(log.date).toLocaleDateString() : '最近';
    
    li.innerHTML = `
      <div class="listening-info">
        <h4>${escapeHtml(log.title)}</h4>
        <div class="listening-meta">📅 记录于 ${dateStr}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.8rem;">
        <span class="listening-time-badge">⏱️ ${log.minutes} 分钟</span>
        <button class="icon-btn delete-btn" title="删除记录">🗑️</button>
      </div>
    `;

    const delBtn = li.querySelector('.delete-btn');
    delBtn.addEventListener('click', () => {
      listeningLogs.splice(idx, 1);
      storage.set(listeningKey, listeningLogs);
      renderListening();
      updateDashboard();
    });

    listeningList.appendChild(li);
  });
}

function openListeningModal() {
  listeningForm.reset();
  listeningModal.classList.remove('hidden');
  listeningTitleInput.focus();
}

function closeListeningModal() {
  listeningModal.classList.add('hidden');
  listeningForm.reset();
}

addListeningBtn.addEventListener('click', openListeningModal);
listeningModalClose.addEventListener('click', closeListeningModal);
listeningModalCancel.addEventListener('click', closeListeningModal);

listeningForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = listeningTitleInput.value.trim();
  const minutes = parseInt(listeningMinutesInput.value, 10) || 0;
  if (!title || minutes <= 0) return;

  listeningLogs.unshift({ title, minutes, date: new Date().toISOString() });
  storage.set(listeningKey, listeningLogs);
  closeListeningModal();
  renderListening();
  updateDashboard();
});

// ---------- Progress Dashboard ----------
let chart = null;
function updateDashboard() {
  const chartCanvas = document.getElementById('progress-chart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  
  const totalWords = vocabCards.length;
  const masteredWords = vocabCards.filter(c => c.learned).length;
  const totalListening = listeningLogs.reduce((sum, l) => sum + (parseInt(l.minutes, 10) || 0), 0);

  const data = {
    labels: ['总词汇量', '已掌握词汇', '听力时长(分钟)'],
    datasets: [{
      label: '数量 / 时长',
      data: [totalWords, masteredWords, totalListening],
      backgroundColor: [
        'rgba(99, 102, 241, 0.75)',
        'rgba(16, 185, 129, 0.75)',
        'rgba(56, 189, 248, 0.75)'
      ],
      borderColor: [
        '#6366f1',
        '#10b981',
        '#38bdf8'
      ],
      borderWidth: 1.5,
      borderRadius: 8
    }]
  };

  if (chart) {
    chart.data = data;
    chart.update();
  } else if (window.Chart) {
    chart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }
}

// ---------- Daily Schedule ----------
const scheduleContainer = document.getElementById('schedule-container');
async function loadSchedule() {
  try {
    const res = await fetch('schedule.json');
    const schedule = await res.json();
    if (!schedule || schedule.length === 0) {
      scheduleContainer.innerHTML = '<p class="placeholder-text">暂无安排。</p>';
      return;
    }
    
    scheduleContainer.innerHTML = schedule.map(item => `
      <div class="schedule-card">
        <div class="schedule-date">📅 日期: ${item.date}</div>
        <div class="schedule-item">📖 目标新增: <strong>${item.vocab}</strong> 词汇</div>
        <div class="schedule-item">🎧 推荐听力: <a href="${item.listening.url}" target="_blank" style="color: var(--accent);">${escapeHtml(item.listening.title)}</a> (${item.listening.minutes} 分钟)</div>
        <div class="schedule-item">💬 口语练习: ${escapeHtml(item.speakingPrompt)}</div>
        <div class="schedule-item">✏️ 语法阅读: ${escapeHtml(item.grammar || '自主复习')}</div>
      </div>
    `).join('');
  } catch (e) {
    scheduleContainer.innerHTML = '<p class="placeholder-text">获取计划数据失败。</p>';
  }
}

// ---------- Essay Checker ----------
const essayInput = document.getElementById('essay-input');
const checkBtn = document.getElementById('check-essay-btn');
const essayResult = document.getElementById('essay-result');
const charCount = document.getElementById('essay-char-count');

if (essayInput) {
  essayInput.addEventListener('input', () => {
    const len = essayInput.value.length;
    charCount.textContent = `${len} 字`;
  });
}

async function checkEssay() {
  const text = essayInput.value.trim();
  if (!text) {
    alert('请输入需要检查的英文内容！');
    return;
  }
  essayResult.innerHTML = '<p class="placeholder-text">🔍 正在使用 AI 引擎批改中，请稍候...</p>';
  try {
    const resp = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'en-US' })
    });
    const data = await resp.json();
    if (!data.matches || data.matches.length === 0) {
      essayResult.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <span style="font-size: 2.5rem;">🎉</span>
          <h4 style="color: var(--success); margin-top: 0.5rem;">太棒了！未发现拼写或语法错误。</h4>
        </div>
      `;
      return;
    }
    
    const html = data.matches.map(m => {
      const context = m.context.text;
      const offset = m.context.offset;
      const length = m.context.length;
      const before = context.slice(0, offset);
      const error = context.slice(offset, offset + length);
      const after = context.slice(offset + length);
      const repl = m.replacements.slice(0, 3).map(r => `<code>${escapeHtml(r.value)}</code>`).join(', ');

      return `
        <div class="error-item">
          <strong>❗ ${escapeHtml(m.message)}</strong><br>
          <div style="margin: 0.4rem 0; font-family: monospace; background: rgba(0,0,0,0.2); padding: 0.4rem; border-radius: 4px;">
            ${escapeHtml(before)}<strong style="color: var(--danger); font-weight: bold;">${escapeHtml(error)}</strong>${escapeHtml(after)}
          </div>
          ${repl ? `<span style="font-size: 0.85rem; color: var(--text-muted);">建议修改为: ${repl}</span>` : ''}
        </div>
      `;
    }).join('');

    essayResult.innerHTML = html;
  } catch (err) {
    essayResult.innerHTML = '<p class="placeholder-text" style="color: var(--danger);">检查出错，请稍后再试或检查网络状态。</p>';
    console.error(err);
  }
}

if (checkBtn) {
  checkBtn.addEventListener('click', checkEssay);
}

// Utility: HTML escape
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// Initial Initialization
renderVocab();
renderListening();
updateDashboard();
loadSchedule();
