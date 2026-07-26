// script.js - core interactivity for English Learning Hub
// Uses localStorage for persistence, Chart.js for dashboard, fetch for schedule & essay checking

// ---------- Utility ----------
const storage = {
  get(key, fallback) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

// ---------- Vocabulary Card ----------
const vocabKey = 'vocabCards';
let vocabCards = storage.get(vocabKey, []);
const cardContainer = document.getElementById('card-container');
const addCardBtn = document.getElementById('add-card-btn');

function renderVocab() {
  cardContainer.innerHTML = '';
  vocabCards.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.dataset.idx = idx;
    const front = document.createElement('div');
    front.className = 'front';
    front.textContent = c.word;
    const back = document.createElement('div');
    back.className = 'back';
    back.textContent = c.meaning;
    card.appendChild(front);
    card.appendChild(back);
    card.addEventListener('click', () => {
      card.classList.toggle('show');
    });
    cardContainer.appendChild(card);
  });
}

addCardBtn.addEventListener('click', () => {
  const word = prompt('输入单词 (Word)');
  if (!word) return;
  const meaning = prompt('输入中文释义或英文解释');
  if (!meaning) return;
  vocabCards.push({ word, meaning, learned: false });
  storage.set(vocabKey, vocabCards);
  renderVocab();
});

// ---------- Listening Log ----------
const listeningKey = 'listeningLogs';
let listeningLogs = storage.get(listeningKey, []);
const listeningList = document.getElementById('listening-list');
const addListeningBtn = document.getElementById('add-listening-btn');

function renderListening() {
  listeningList.innerHTML = '';
  listeningLogs.forEach((log, idx) => {
    const li = document.createElement('li');
    li.textContent = `${log.title} – ${log.minutes} min`;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.style.background = 'transparent';
    del.style.border = 'none';
    del.style.color = 'var(--accent)';
    del.style.cursor = 'pointer';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      listeningLogs.splice(idx, 1);
      storage.set(listeningKey, listeningLogs);
      renderListening();
      updateDashboard();
    });
    li.appendChild(del);
    listeningList.appendChild(li);
  });
}

addListeningBtn.addEventListener('click', () => {
  const title = prompt('本次听力材料标题或链接');
  if (!title) return;
  const minutesStr = prompt('时长（分钟）');
  const minutes = parseInt(minutesStr, 10) || 0;
  listeningLogs.push({ title, minutes, date: new Date().toISOString() });
  storage.set(listeningKey, listeningLogs);
  renderListening();
  updateDashboard();
});

// ---------- Dashboard ----------
let chart = null;
function updateDashboard() {
  const ctx = document.getElementById('progress-chart').getContext('2d');
  const totalWords = vocabCards.length;
  const totalListening = listeningLogs.reduce((sum, l) => sum + l.minutes, 0);
  const data = {
    labels: ['词汇总数', '累计听力(分钟)'],
    datasets: [{
      label: '学习进度',
      data: [totalWords, totalListening],
      backgroundColor: ['hsl(200, 70%, 50%)', 'hsl(120, 70%, 50%)']
    }]
  };
  if (chart) {
    chart.data = data;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          y: { beginAtZero: true }
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
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = schedule.find(item => item.date === todayStr);
    if (!today) {
      scheduleContainer.innerHTML = '<p>今天暂无安排。</p>';
      return;
    }
    const html = `
      <p><strong>词汇：</strong>新增 ${today.vocab} 条单词</p>
      <p><strong>听力：</strong><a href="${today.listening.url}" target="_blank">${today.listening.title}</a> (${today.listening.minutes} min)</p>
      <p><strong>口语：</strong>对话主题 – ${today.speakingPrompt}</p>
      <p><strong>语法/阅读：</strong> ${today.grammar || '—'}</p>
    `;
    scheduleContainer.innerHTML = html;
  } catch (e) {
    scheduleContainer.innerHTML = '<p>加载日程失败。</p>';
    console.error(e);
  }
}

// ---------- Essay Checker ----------
const essayInput = document.getElementById('essay-input');
const checkBtn = document.getElementById('check-essay-btn');
const essayResult = document.getElementById('essay-result');

async function checkEssay() {
  const text = essayInput.value.trim();
  if (!text) return;
  essayResult.textContent = '检测中...';
  try {
    const resp = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'en-US' })
    });
    const data = await resp.json();
    if (data.matches.length === 0) {
      essayResult.textContent = '未发现错误 🎉';
      return;
    }
    const html = data.matches.map(m => {
      const context = m.context.text;
      const offset = m.context.offset;
      const length = m.context.length;
      const before = context.slice(0, offset);
      const error = context.slice(offset, offset + length);
      const after = context.slice(offset + length);
      return `<p>❗ ${m.message}<br><code>${before}<strong style="color:red;">${error}</strong>${after}</code></p>`;
    }).join('');
    essayResult.innerHTML = html;
  } catch (err) {
    essayResult.textContent = '检查出错，请稍后再试。';
    console.error(err);
  }
}

checkBtn.addEventListener('click', checkEssay);

// Initial render
renderVocab();
renderListening();
updateDashboard();
loadSchedule();

// Expose for debugging (optional)
window.learningHub = { storage, vocabCards, listeningLogs };
