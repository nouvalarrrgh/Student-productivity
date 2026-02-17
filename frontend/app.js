// =================================================================================
// app.js - KODE FINAL DENGAN REVISI IP CALC (FINAL SCORE, GRADE, IP, IPS, IPK)
// =================================================================================

// ---------- STORAGE HELPERS & CONSTANTS ----------
const STORAGE_KEY = 'stuProd_v1';
const TOKEN_KEY = 'sp_token';
const USER_KEY = 'sp_user';
const API_BASE = 'http://localhost:4001/api'; 


function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ⭐ HABIT PACKAGES (FINAL dengan 4 Paket)
const HABIT_PACKAGES = [
    {
        name: "Produktivitas Penuh",
        icon: "🚀",
        description: "Rentetan Habit Produktivitas Seharian Penuh.",
        area: "general",
        habits: [
            { title: "Hidrasi Pagi", icon: "💧", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Mindset Reset & Meditasi", icon: "🧘", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Olahraga Ringan & Sarapan", icon: "🏋️", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Siapkan Arena & Tinjau MITs", icon: "📝", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Deep Work (MIT #1)", icon: "🐸", time_of_day: 'morning', goal_unit: 3, goal_frequency: 'day' }, 
            { title: "Lanjutkan Deep Work (MIT #2)", icon: "📚", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Makan Siang & Istirahat Penuh", icon: "🍽️", time_of_day: 'afternoon', goal_unit: 1, goal_frequency: 'day' },
            { title: "Shallow Work & Rapat", icon: "💬", time_of_day: 'afternoon', goal_unit: 1, goal_frequency: 'day' },
            { title: "Perencanaan Malam Hari & Tinjauan", icon: "🗓️", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'day' },
            { title: "Digital Sunset (Matikan Gadget)", icon: "📵", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'day' },
            { title: "Ritual Menenangkan (Baca Buku)", icon: "🛀", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'day' },
            { title: "Konsisten Waktu Tidur", icon: "🛌", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'day' },
        ]
    },
    {
        name: "Fokus Mendalam (Deep Work)",
        icon: "🎯",
        description: "Paket anti-distraksi untuk konsentrasi tinggi pada tugas kompleks.",
        area: "study",
        habits: [
            { title: "Single-Tasking", icon: "⚙️", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'time' },
            { title: "Jadwalkan Cek Kotak Masuk", icon: "📧", time_of_day: 'morning', goal_unit: 3, goal_frequency: 'day' },
            { title: "Gunakan Noise-Cancelling", icon: "🎧", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'time' },
            { title: "Zona Bebas Ponsel (Saat Deep Work)", icon: "🚫", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'time' },
        ]
    },
    {
        name: "Kesejahteraan Emosional",
        icon: "💖",
        description: "Mengelola stres dan menjaga perspektif positif setiap hari.",
        area: "health",
        habits: [
            { title: "Tulis Jurnal Syukur", icon: "🙏", time_of_day: 'morning', goal_unit: 3, goal_frequency: 'day' },
            { title: "Batasi Konsumsi Berita (15 Min)", icon: "📰", time_of_day: 'afternoon', goal_unit: 1, goal_frequency: 'day' },
            { title: "Batas Sehat (Katakan 'Tidak')", icon: "🛑", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'day' },
            { title: "Waktu Luang yang Disengaja (Me Time)", icon: "☕", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'day' },
        ]
    },
    {
        name: "Pertumbuhan Pribadi & Finansial",
        icon: "💰",
        description: "Membangun stabilitas jangka panjang dan memastikan Anda terus berkembang.",
        area: "finance",
        habits: [
            { title: "Literasi Finansial", icon: "📖", time_of_day: 'afternoon', goal_unit: 3, goal_frequency: 'week' }, 
            { title: "Menabung Otomatis", icon: "💳", time_of_day: 'morning', goal_unit: 1, goal_frequency: 'week' }, 
            { title: "Tinjauan & Perencanaan Mingguan", icon: "📅", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'week' },
            { title: "Time-Out Sosial (Refleksi)", icon: "🧘", time_of_day: 'evening', goal_unit: 1, goal_frequency: 'week' },
        ]
    }
];

let currentHabitFilter = 'all'; // State untuk filter waktu
let currentAreaFilter = 'all';  // State untuk filter area


// ---------- INITIAL STATE ----------
const initial = {
  page: 'dashboard',
  tasks: [],                
  finance: [],              
  roadmap: [],
  habits: [],               
  timer: 25*60,
  running: false,
  notif: [],                
  achievements: {           
    coins: 0,
    tasksCompletedRecorded: 0,
    roadmapCompletedRecorded: 0,
    pomodoroCompletedRecorded: 0
  },
  pomodoroSessions: 0
};

let state = loadState() || initial;

// ---------- DOM helpers ----------
const $ = s => document.querySelector(s);
const $all = s => Array.from(document.querySelectorAll(s));

// ---------- API Utilities & Authentication (TAMBAHAN SINKRONISASI POIN) ----------

async function apiFetch(endpoint, options = {}){
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if(token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(API_BASE + endpoint, { ...options, headers });

        if(response.status === 401 || response.status === 403){
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY); 
            if(window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html'){
                alert('Sesi berakhir. Silakan login kembali.');
                location.href = '/login.html';
            }
            return { ok: false, json: async () => ({ message: 'Unauthorized' }) };
        }
        
        return response;
    } catch (error) {
        console.error('Network Error:', error);
        alert('Error connecting to API. Pastikan server backend berjalan di Port 4001.');
        return { ok: false, json: async () => ({ message: 'Network error or server offline' }) };
    }
}

async function fetchProfileAndSync() {
    const res = await apiFetch('/auth/me'); 
    if (res.ok) {
        const data = await res.json();
        
        localStorage.setItem(USER_KEY, JSON.stringify(data.user)); 
        
        state.achievements.coins = data.user.points || 0;
        state.achievements.tasksCompletedRecorded = data.user.tasks_completed || 0;
        state.achievements.pomodoroCompletedRecorded = data.user.pomodoro_done || 0;
        state.achievements.roadmapCompletedRecorded = data.user.roadmap_done || 0;

        saveState(); 
        renderAchievements(); 
    }
}

async function syncStatsToBackend() {
    const payload = {
        roadmap_done: state.achievements.roadmapCompletedRecorded,
        pomodoro_done: state.achievements.pomodoroCompletedRecorded
    };

    const res = await apiFetch('/user/sync-stats', { 
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error("Gagal sinkronisasi statistik tambahan ke backend.");
    }
}


// ---------- PAGE TRANSITION ----------
function setPage(p){
  state.page = p;
  $all('.page').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('show-page');
  });
  const el = document.getElementById('page-' + p);
  if(el){
    el.classList.remove('hidden');
    setTimeout(()=>el.classList.add('show-page'), 10);
  }
  // highlight tab
  $all('#sidebar button').forEach(t => t.classList.remove('active')); 
  const tab = document.querySelector(`#sidebar button[data-page="${p}"]`); 
  if(tab) tab.classList.add('active');

  if (p === 'leaderboard') {
        renderLeaderboard(); 
  }
  if (p === 'habit') {
        updateHabitFilter(currentHabitFilter, false); 
        updateAreaFilter(currentAreaFilter, false);
        renderHabitRecommendations();
  }
  // ⭐ PANGGIL INIT UNTUK IP CALC
  if (p === 'ipcalc') {
        initIPCalcPage();
  }
  saveState();
}

// attach nav tab listeners
$all('.tab').forEach(btn => btn.addEventListener('click', ()=> setPage(btn.dataset.page)));
$all('#sidebar button').forEach(btn => btn.addEventListener('click', ()=> setPage(btn.dataset.page)));
$all('.card').forEach(c => {
  c.addEventListener('click', ()=>{
    const link = c.dataset.link;
    if(link) setPage(link);
  });
});

// ---------- NOTIFICATIONS (read/unread) ----------
function renderNotificationsBadge(){
  const unread = state.notif.filter(n => !n.read).length;
  const badge = $('#notif-count');
  if(!badge) return;
  if(unread > 0){
    badge.textContent = unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function notify(title, body){
  const n = { id: Date.now() + Math.floor(Math.random()*1000), title, body, read:false };
  state.notif.unshift(n);
  saveState();
  renderNotificationsBadge();
  if(!$('#notif-panel').classList.contains('hidden')) renderNotifPanel();
  try{
    if("Notification" in window && Notification.permission === 'granted'){
      new Notification(title, { body });
    }
  }catch(e){}
}

// toggle panel
$('#btn-notif').addEventListener('click', (e)=>{
  e.stopPropagation(); 
  $('#notif-panel').classList.toggle('hidden');
  renderNotifPanel();
  renderNotificationsBadge();
});

// render panel (list)
function renderNotifPanel(){
  const box = $('#notif-items');
  if(!box) return;
  box.innerHTML = '';
  if(state.notif.length === 0){
    box.innerHTML = "<div class='text-gray-400 p-3 text-center'>Tidak ada notifikasi</div>";
    return;
  }

  state.notif.forEach(n => {
    const div = document.createElement('div');
    div.className = 'p-3 border-b rounded-lg mb-2 flex justify-between items-start ' + (n.read ? 'bg-gray-50' : 'bg-indigo-50 border-l-4 border-indigo-500');
    div.innerHTML = `
      <div class="flex-1 pr-2">
        <div class="font-semibold">${escapeHtml(n.title)}</div>
        <div class="text-sm text-gray-600 mt-1">${escapeHtml(n.body)}</div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <button class="notif-read-btn text-xs px-2 py-1 rounded bg-white border">Tandai dibaca</button>
        <button class="notif-ignore-btn text-xs px-2 py-1 rounded bg-red-100 text-red-600">Abaikan</button>
      </div>
    `;

    div.querySelector('.notif-read-btn').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      n.read = true;
      saveState();
      renderNotificationsBadge();
      renderNotifPanel();
    });

    div.querySelector('.notif-ignore-btn').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      state.notif = state.notif.filter(x => x.id !== n.id);
      saveState();
      renderNotificationsBadge();
      renderNotifPanel();
    });

    div.addEventListener('click', ()=>{
      if(!n.read){
        n.read = true;
        saveState();
        renderNotificationsBadge();
        renderNotifPanel();
      }
    });

    box.appendChild(div);
  });
}

// hide panel when click outside
document.addEventListener('click', (e)=>{
  const panel = $('#notif-panel');
  const btn = $('#btn-notif');
  if(!panel || !btn) return;
  if(!panel.contains(e.target) && !btn.contains(e.target)){
    panel.classList.add('hidden');
  }
});

if("Notification" in window && Notification.permission !== 'granted'){
  Notification.requestPermission().catch(()=>{});
}

// ---------- ACHIEVEMENTS ----------
function checkAchievements(){
  const tasksDone = state.tasks.filter(t => t.status === 'completed').length; 
  const roadmapDone = state.roadmap.filter(r => r.status && r.status.toLowerCase() === 'selesai').length;
  const pomodoroDone = state.pomodoroSessions || 0;

  if(tasksDone > state.achievements.tasksCompletedRecorded){
    const diff = tasksDone - state.achievements.tasksCompletedRecorded;
    state.achievements.tasksCompletedRecorded = tasksDone; 
    notify('Achievement', `Selamat! Kamu menyelesaikan ${diff} tugas.`);
  }

  if(roadmapDone > state.achievements.roadmapCompletedRecorded){
    const diff = roadmapDone - state.achievements.roadmapCompletedRecorded;
    state.achievements.roadmapCompletedRecorded = roadmapDone;
    notify('Achievement', `Roadmap selesai bertambah (${diff}).`);
  }

  if(pomodoroDone > state.achievements.pomodoroCompletedRecorded){
    const diff = pomodoroDone - state.achievements.pomodoroCompletedRecorded;
    state.achievements.pomodoroCompletedRecorded = pomodoroDone;
    notify('Achievement', `Sesi Pomodoro selesai ${diff} kali.`);
  }

  saveState();
  renderAchievements();
  renderNotificationsBadge();
}

// Renders achievements panel
function renderAchievements(){
  const rp = $('#reward-points');
  const list = $('#achievement-list');
  if(rp) rp.textContent = state.achievements.coins;
  if(!list) return;

  list.innerHTML = `
    <div class="p-4 bg-white shadow rounded-xl border">
      <div class="text-xl font-bold text-indigo-700">🏆 Achievement</div>
      <div class="mt-3 text-sm">Koin: <b>${state.achievements.coins}</b></div>
      <div class="text-sm">Tugas selesai: <b>${state.achievements.tasksCompletedRecorded}</b></div>
      <div class="text-sm">Roadmap selesai: <b>${state.achievements.roadmapCompletedRecorded}</b></div>
      <div class="text-sm">Pomodoro selesai: <b>${state.achievements.pomodoroCompletedRecorded}</b></div>
    </div>
  `;
}

function renderProfile() {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (!user) return; 

    const achievements = state.achievements;

    $('#profile-username').textContent = user.username || 'Admin';
    $('#profile-email').textContent = user.email || 'N/A';
    $('#stat-points').textContent = achievements.coins || 0;
    $('#stat-tasks').textContent = achievements.tasksCompletedRecorded || 0;
    $('#stat-pomodoro').textContent = achievements.pomodoroCompletedRecorded || 0;
    $('#stat-roadmap').textContent = achievements.roadmapCompletedRecorded || 0;
}

$('#btn-show-profile').addEventListener('click', () => {
    renderProfile(); 
    $('#modal-profile').classList.remove('hidden');
});

$('#btn-close-profile').addEventListener('click', () => {
    $('#modal-profile').classList.add('hidden');
});

$('#btn-profile-logout').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STORAGE_KEY); 
    location.href = '/login.html';
});

// ---------- LEADERBOARD (BARU) ----------
async function renderLeaderboard(){
    const list = $('#leaderboard-list');
    if(!list) return;

    list.innerHTML = `<p class="text-gray-500 p-4">Memuat data Leaderboard...</p>`;

    const res = await apiFetch('/leaderboard?limit=10'); 
    
    if(!res.ok){
        list.innerHTML = `<p class="text-red-500 p-4">❌ Gagal memuat Leaderboard.</p>`;
        return;
    }
    
    const data = await res.json();
    list.innerHTML = '';
    
    if(data.rows && data.rows.length === 0){
        list.innerHTML = `<p class="text-gray-500 p-4 text-center">Belum ada pengguna yang memiliki poin.</p>`;
        return;
    }

    (data.rows || []).forEach((r, i)=>{
        const rank = i + 1;
        const div = document.createElement('div');
        const rankColor = rank === 1 ? 'bg-yellow-400' : (rank === 2 ? 'bg-gray-400' : (rank === 3 ? 'bg-amber-600' : 'bg-indigo-50'));
        const textColor = rank <= 3 ? 'text-white font-bold' : 'text-indigo-900';

        div.className = `p-3 rounded-xl shadow flex justify-between items-center ${rankColor} ${textColor}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl font-extrabold w-8 text-center">${rank}</span>
                <span class="font-semibold">${r.username}</span>
            </div>
            <div class="text-right">
                <div class="font-bold">${r.points || 0} Poin</div>
                <div class="text-xs">Tugas: ${r.tasks_completed || 0} | Pomodoro: ${r.pomodoro_done || 0}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

// ---------- TASKS ----------

function formatDate(d){
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function renderTasks(){ 
  const list = $('#tasks-list');
  if(!list) return;
  list.innerHTML = `<div class="p-4 text-gray-500">Memuat tugas dari server...</div>`;
  
  const res = await apiFetch('/tasks'); 
  
  if(!res.ok){ 
      list.innerHTML = `<div class="p-4 text-red-500">❌ Gagal memuat tugas. Cek server 4001.</div>`;
      return; 
  }
  const data = await res.json();
  
  state.tasks = data.tasks || []; 
  saveState(); 

  list.innerHTML = ''; 
  $('#no-tasks').style.display = state.tasks.length === 0 ? 'block' : 'none';

  state.tasks.forEach(t => {
    const isCompleted = t.status === 'completed'; 
    const div = document.createElement('div');
    div.className = 'flex items-center p-3 rounded-xl border mb-2 bg-gray-50 hover:bg-gray-100 justify-between';

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = isCompleted;
    
    chk.addEventListener('change', async ()=>{
        const newStatus = chk.checked ? 'completed' : 'pending';
        const taskTitle = t.title; 
        
        const resUpdate = await apiFetch(`/tasks/${t.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        if(resUpdate.ok){
    await renderTasks(); 
    checkAchievements(); 

    const taskTitle = t.title;
    if (newStatus === 'completed') {
        notify('Tugas Selesai!', `Kamu telah menyelesaikan tugas: ${taskTitle}`);
    } else {
        notify('Tugas Dibuka Kembali', `${taskTitle} ditandai sebagai Pending.`);
    }
    
    await fetchProfileAndSync(); 

} else {
    alert('Gagal update status tugas.');
    chk.checked = !chk.checked;
}
});

    const span = document.createElement('span');
    if(isCompleted) span.className = 'line-through text-gray-500';

    const formattedDeadline = t.due_date ? formatDate(t.due_date) : "";
    span.textContent = t.title + (formattedDeadline ? ` (Deadline: ${formattedDeadline})` : '');

    left.appendChild(chk);
    left.appendChild(span);

    const del = document.createElement('button');
    del.className = 'text-red-500';
    del.textContent = 'Hapus';
    
    del.addEventListener('click', async ()=>{
        if(!confirm(`Yakin ingin menghapus tugas "${t.title}"?`)) return;
        
        const resDelete = await apiFetch(`/tasks/${t.id}`, {
            method: 'DELETE'
        });

        if(resDelete.ok){
            await renderTasks();
            checkAchievements();
        } else {
            alert('Gagal menghapus tugas.');
        }
    });

    div.appendChild(left);
    div.appendChild(del);
    list.appendChild(div);
  });
}

// Add-task modal buttons
$('#btn-show-add-task').addEventListener('click', ()=> $('#modal-add-task').classList.remove('hidden'));
$('#btn-cancel-task').addEventListener('click', ()=> $('#modal-add-task').classList.add('hidden'));

$('#btn-save-task').addEventListener('click', async ()=>{ 
    const title = $('#task-title').value.trim();
    const date = $('#task-date').value;   
    const time = $('#task-time').value;   

    if (!title) { 
        alert('Judul tugas kosong'); 
        return; 
    }

    if (!date || !time) {
        alert("Harap isi tanggal dan waktu deadline.");
        return;
    }

    const combined = new Date(`${date}T${time}:00`);
    const due_date = combined.toISOString();  

    const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ 
            title, 
            due_date   
        })
    });

    if(res.ok){
        $('#task-title').value = ''; 
        $('#task-date').value = ''; 
        $('#task-time').value = '';
        $('#modal-add-task').classList.add('hidden');
        
        await renderTasks(); 
        checkAchievements();
    } else {
        const data = await res.json();
        alert('Gagal menambah tugas di server: ' + (data.message || 'Unknown error'));
    }
});


// ---------- FINANCE ----------
async function renderFinance(filterType = 'all'){
  const list = $('#finance-list');
  if(!list) return;
  list.innerHTML = `<div class="p-4 text-gray-500 text-center">Memuat transaksi...</div>`;

  const endpoint = filterType === 'all' ? '/finance' : `/finance?type=${filterType}`;
  
  const res = await apiFetch(endpoint); 
  if(!res.ok) {
    list.innerHTML = `<div class="p-4 text-red-500 text-center">❌ Gagal memuat transaksi.</div>`;
    return;
  }
  
  const data = await res.json();
  const transactions = data.transactions || [];
  
  state.finance = transactions.map(t => ({
      id: t.id, 
      income: t.type === 'income' ? t.amount : 0, 
      expense: t.type === 'expense' ? t.amount : 0, 
      note: t.note,
      created_at: t.created_at
  })); 
  saveState();

  list.innerHTML = '';
  let totalIncome = 0, totalExpense = 0;
  
  transactions.forEach(f => {
    const isIncome = f.type === 'income';
    
    const el = document.createElement('div'); 
    el.className = 'p-2 flex justify-between items-center border-b bg-white';
    
    el.innerHTML = `
        <div class="flex-1">
            <div class="text-sm font-semibold">${escapeHtml(f.note || (isIncome ? 'Pemasukan' : 'Pengeluaran'))}</div>
            <div class="text-xs text-gray-400">${new Date(f.created_at).toLocaleDateString()}</div>
        </div>
        <div class="flex items-center">
            <div class="${isIncome ? 'text-green-600' : 'text-red-600'} font-bold w-24 text-right">
                ${isIncome ? '+ Rp ' + f.amount.toLocaleString('id-ID') : '- Rp ' + f.amount.toLocaleString('id-ID')}
            </div>
            <div>
                <button data-id="${f.id}" class="btn-delete-finance text-red-400 hover:text-red-600 ml-3">x</button>
            </div>
        </div>
    `;
    
    list.appendChild(el);
    
    totalIncome += isIncome ? f.amount : 0;
    totalExpense += isIncome ? 0 : f.amount;
  });

  $('#total-income').textContent = totalIncome.toLocaleString('id-ID');
  $('#total-expense').textContent = totalExpense.toLocaleString('id-ID');
  $('#balance').textContent = (totalIncome - totalExpense).toLocaleString('id-ID');

  if(transactions.length === 0){
    list.innerHTML = "<div class='text-gray-400 text-center p-4'>Belum ada transaksi</div>";
  }
  
  $all('.btn-delete-finance').forEach(btn => btn.addEventListener('click', deleteFinanceTransaction));
}

$('#btn-add-income').addEventListener('click', async ()=>{
  const val = Number($('#input-income').value);
  if(!val || val <= 0){ alert('Masukkan pemasukan valid'); return; }
  
  const res = await apiFetch('/finance', {
      method: 'POST',
      body: JSON.stringify({ type: 'income', amount: val, note: 'Pemasukan' })
  });

  if(res.ok){
      $('#input-income').value = '';
      renderFinance(); 
  } else {
      alert('Gagal menambah pemasukan.');
  }
});

$('#btn-add-expense').addEventListener('click', async ()=>{
  const val = Number($('#input-expense').value);
  const note = $('#input-expense-note').value.trim() || 'Pengeluaran';
  
  if(!val || val <= 0){ alert('Masukkan pengeluaran valid'); return; }
  
  const res = await apiFetch('/finance', {
      method: 'POST',
      body: JSON.stringify({ type: 'expense', amount: val, note: note })
  });

  if(res.ok){
      $('#input-expense').value = ''; 
      $('#input-expense-note').value = '';
      renderFinance(); 
  } else {
      alert('Gagal menambah pengeluaran.');
  }
});

async function deleteFinanceTransaction(e) {
    const id = e.target.dataset.id;
    if(!confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    const res = await apiFetch(`/finance/${id}`, {
        method: 'DELETE'
    });
    
    if(res.ok) {
        renderFinance(); 
    } else {
        alert('Gagal menghapus transaksi.');
    }
}

// ---------- ROADMAP ----------
async function renderRoadmap(){
  const list = $('#roadmap-list');
  if(!list) return;
  list.innerHTML = `<div class="p-4 text-gray-500 text-center">Memuat Roadmap...</div>`;
  
  const res = await apiFetch('/roadmap'); 
  if(!res.ok) {
    list.innerHTML = `<div class="p-4 text-red-500 text-center">❌ Gagal memuat Roadmap.</div>`;
    return;
  }
  
  const data = await res.json();
  const roadmaps = data.roadmaps || [];
  
  state.roadmap = roadmaps;
  saveState(); 

  list.innerHTML = '';

  roadmaps.forEach((r, idx) => {
    const isCompleted = r.status.toLowerCase() === 'selesai';
    const el = document.createElement('div');
    el.className = 'relative bg-white p-4 rounded-2xl shadow border';
    el.innerHTML = `
      <h3 class='font-bold text-lg'>Semester ${escapeHtml(String(r.semester))}</h3>
      <p class='text-sm text-gray-600'>SKS: ${escapeHtml(String(r.sks))}</p>
      <p class='text-sm text-gray-600'>Target: ${escapeHtml(r.target)}</p>
      <p id="status-${r.id}" class='text-sm mt-2 px-2 py-1 rounded w-fit text-white ${getStatusColor(r.status)}'>${escapeHtml(r.status)}</p>
    `;
    
    const btnDone = document.createElement('button');
    btnDone.className = "mt-3 px-3 py-1 rounded bg-green-500 text-white text-sm";
    btnDone.textContent = "Tandai Selesai";
    
    if (isCompleted) {
        btnDone.disabled = true;
        btnDone.classList.add('opacity-50', 'cursor-not-allowed');
        btnDone.textContent = "Selesai";
    }
    
    // ⭐ MODIFIKASI: Event listener untuk Tandai Selesai (UPDATE ke API)
    btnDone.addEventListener("click", async () => {
        if(!confirm(`Yakin ingin menandai Roadmap Semester ${r.semester} selesai?`)) return;
        
        const resUpdate = await apiFetch(`/roadmap/${r.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'selesai' })
        });
        
        if (resUpdate.ok) {
          await renderRoadmap(); 
          checkAchievements(); 
          const semester = r.semester;
          notify('Roadmap Selesai!', `Semester ${semester} berhasil ditandai selesai. Cek Achievement untuk poin.`);
          await fetchProfileAndSync(); 
        } else {
          alert('Gagal update status Roadmap.');
        }
      });
      
      el.appendChild(btnDone);
      const btnDel = document.createElement('button');
      btnDel.className = 'absolute top-2 right-2 text-red-500';
      btnDel.textContent = 'Hapus';

      btnDel.addEventListener('click', async ()=>{
        if(!confirm(`Yakin ingin menghapus Roadmap Semester ${r.semester}?`)) return;
        
        const resDelete = await apiFetch(`/roadmap/${r.id}`, {
            method: 'DELETE'
        });

        if(resDelete.ok){
            await renderRoadmap(); 
            checkAchievements();
            await fetchProfileAndSync(); 
        } else {
            alert('Gagal menghapus Roadmap.');
        }
    });
    el.appendChild(btnDel);
    list.appendChild(el);
  });
}
    
// ⭐ MODIFIKASI: Event Listener Tambah Roadmap (CREATE ke API)
$('#btn-add-roadmap').addEventListener('click', async ()=>{
  const sem = $('#form-semester').value.trim();
  const sks = $('#form-sks').value.trim();
  const target = $('#form-target').value.trim();
  const status = $('#form-status').value.trim();
  
  if(!sem || !sks || !target || !status){ alert('Lengkapi form roadmap'); return; }
  
  const res = await apiFetch('/roadmap', {
      method: 'POST',
      body: JSON.stringify({ semester: sem, sks: sks, target, status })
  });

  if(res.ok){
      $('#form-semester').value=''; $('#form-sks').value=''; $('#form-target').value=''; $('#form-status').value='';
      await renderRoadmap(); 
      checkAchievements();
  } else {
      alert('Gagal menambah Roadmap.');
  }
});

function getStatusColor(status){
  if(!status) return 'bg-gray-500';
  const s = status.toLowerCase();
  if(s==='selesai') return 'bg-green-600';
  if(s==='berjalan') return 'bg-blue-600';
  if(s==='rencana') return 'bg-yellow-500';
  return 'bg-gray-500';
}

// ================= HABIT TRACKER =================

// ⭐ FUNGSI: Merender kartu PAKET rekomendasi
function renderHabitRecommendations() {
    const box = $('#habit-recommendations'); 
    if (!box) return;

    box.innerHTML = ''; 
    const areaMap = { 'study': '📚 Belajar', 'health': '🏋️ Kesehatan', 'finance': '💳 Keuangan', 'general': '⭐ Umum' };

    HABIT_PACKAGES.forEach((p, index) => { 
        const card = document.createElement('div');
        card.className = 'card p-4 rounded-xl cursor-pointer hover:shadow-lg transition transform hover:scale-105 border border-indigo-200';
        card.dataset.packageIndex = index; 

        const habitListHtml = p.habits.map(h => `<li class="text-xs text-gray-600">${h.icon} ${h.title}</li>`).join('');

        card.innerHTML = `
            <div class="text-3xl mb-1">${p.icon}</div>
            <div class="font-bold text-lg text-indigo-800">${p.name}</div>
            <div class="text-xs text-gray-500">${p.description}</div>
            <div class="text-xs font-semibold mt-2">${areaMap[p.area] || 'General'} (Waktu Utama: ${p.habits[0].time_of_day})</div>
            <ul class="list-disc list-inside mt-2 space-y-1 pl-1 max-h-24 overflow-y-auto">
                ${habitListHtml}
            </ul>
            <button data-package-index="${index}"
                class="btn-add-package mt-3 w-full text-xs bg-indigo-600 text-white px-3 py-2 rounded-xl">
                Tambahkan (${p.habits.length} Habit)
            </button>
        `;
        box.appendChild(card);
    });

    // Attach listener
    document.querySelectorAll('.btn-add-package').forEach(btn => {
        btn.addEventListener('click', handleAddHabitPackage); 
    });
}

// ⭐ FUNGSI: Menangani penambahan SELURUH PAKET habit
async function handleAddHabitPackage(e) {
    const index = parseInt(e.target.dataset.packageIndex);
    const packageData = HABIT_PACKAGES[index];
    
    if (!packageData) return;

    if (!confirm(`Yakin ingin menambahkan paket habit "${packageData.name}" (${packageData.habits.length} habit)?`)) return;

    const btn = e.target;
    btn.disabled = true;
    btn.textContent = 'Menambahkan...';
    
    let successCount = 0;
    
    for (const habit of packageData.habits) {
        const payload = {
            title: habit.title,
            icon: habit.icon,
            time_of_day: habit.time_of_day || 'morning', 
            area: packageData.area || 'general', 
            goal_unit: habit.goal_unit || 1,
            goal_frequency: habit.goal_frequency || 'day',
        };
        
        const res = await apiFetch('/habits', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            successCount++;
        } else {
            console.error(`Gagal menambahkan ${habit.title}:`, await res.json());
        }
    }
    
    btn.disabled = false;
    btn.textContent = `Tambahkan (${packageData.habits.length} Habit)`;

    if (successCount > 0) {
        notify('Paket Ditambahkan', `${packageData.name}: ${successCount} habit berhasil ditambahkan.`);
        await renderHabits(); 
    } else {
        alert('Gagal menambahkan habit. Coba cek console untuk detail.');
    }
}

// ⭐ FUNGSI: Mengupdate filter waktu
function updateHabitFilter(newFilter, shouldRender = true) {
    currentHabitFilter = newFilter;
    
    $all('.habit-filter-time').forEach(btn => {
        btn.classList.remove('active-filter', 'bg-indigo-600', 'text-white', 'font-semibold');
        if (btn.dataset.time === newFilter) {
            btn.classList.add('active-filter', 'bg-indigo-600', 'text-white', 'font-semibold');
        } else {
            btn.classList.add('hover:bg-gray-100');
        }
    });

    if(shouldRender) updateAreaFilter(currentAreaFilter, true); 
}

// ⭐ FUNGSI: Mengupdate filter area
function updateAreaFilter(newFilter, shouldRender = true) {
    currentAreaFilter = newFilter;
    
    $all('.habit-filter-area').forEach(btn => {
        btn.classList.remove('active-filter', 'bg-indigo-600', 'text-white', 'font-semibold');
        if (btn.dataset.area === newFilter) {
            btn.classList.add('active-filter', 'bg-indigo-600', 'text-white', 'font-semibold');
        } else {
            btn.classList.add('hover:bg-gray-100');
        }
    });
    
    const timeMap = { 'all': 'Semua Waktu', 'morning': 'Pagi', 'afternoon': 'Siang', 'evening': 'Malam' };
    const areaMap = { 'all': 'Semua Area', 'study': 'Belajar', 'health': 'Kesehatan', 'finance': 'Keuangan', 'general': 'Umum' };
    
    let timeTitle = timeMap[currentHabitFilter];
    let areaTitle = currentAreaFilter !== 'all' ? ` | ${areaMap[currentAreaFilter]}` : '';
                        
    $('#habit-title-display').textContent = `Habit ${timeTitle}${areaTitle} Hari Ini`;

    if(shouldRender) renderHabits(); 
}

// ⭐ FUNGSI: Render Habits
async function renderHabits() {
  const list = document.getElementById('habit-list'); 
  const noHabitsEl = document.getElementById('no-habits');
  
  if (!list) return;

  list.innerHTML = `<div class="text-gray-500 p-4 text-center">Memuat habit...</div>`;
  if (noHabitsEl) noHabitsEl.classList.add('hidden'); 

  const res = await apiFetch('/habits');
  if (!res.ok) {
    list.innerHTML = `<div class="text-red-500 p-4 text-center">Gagal memuat habit</div>`;
    return;
  }

  const data = await res.json();
  const habits = data.habits || [];
  const logs = data.logs || [];
  const today = todayISO();

  const filteredHabits = habits.filter(h => {
      const timeMatch = currentHabitFilter === 'all' || h.time_of_day === currentHabitFilter;
      const areaMatch = currentAreaFilter === 'all' || h.area === currentAreaFilter;
      return timeMatch && areaMatch;
  });

  list.innerHTML = ''; 

  if (filteredHabits.length === 0) {
    if (habits.length > 0) {
        list.innerHTML = `<p class="text-gray-500 p-4 text-center">Tidak ada habit yang cocok dengan filter saat ini.</p>`;
    } else if (noHabitsEl) {
        noHabitsEl.classList.remove('hidden'); 
    }
    return;
  }

  if (noHabitsEl) noHabitsEl.classList.add('hidden'); 


  filteredHabits.forEach(h => {
    const log = logs.find(
      l => l.habit_id === h.id && l.log_date === today
    );
    const done = log ? log.completed : false;

    const row = document.createElement('div');
    row.className = `
      flex items-center justify-between p-3 rounded-xl border
      ${done ? 'bg-green-100 border-green-300' : 'bg-gray-50'}
    `;

    const timeText = h.time_of_day === 'morning' ? '🌞 Pagi' : (h.time_of_day === 'afternoon' ? '☀️ Siang' : '🌙 Malam');
    const goalText = `${h.goal_unit || 1}x per ${h.goal_frequency || 'day'}`;
    
    row.innerHTML = `
      <div class="flex-1 pr-2">
        <span class="font-medium text-lg">${h.icon || '📌'} ${escapeHtml(h.title)}</span>
        <div class="text-xs text-gray-500 mt-1">Goal: ${goalText} | Waktu Utama: ${timeText}</div> 
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-toggle-habit 
          px-4 py-1 rounded-xl text-sm font-semibold
          ${done ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}"
          data-id="${h.id}" data-done="${done}">
          ${done ? 'Selesai' : 'Tandai'}
        </button>
        <button class="btn-delete-habit text-red-500 hover:text-red-700 text-sm p-1" data-id="${h.id}">
            🗑️
        </button>
      </div>
    `;

    row.querySelector('.btn-toggle-habit').addEventListener('click', async (e) => {
      const habitId = e.target.dataset.id;
      await apiFetch(`/habits/${habitId}/toggle`, { method: 'POST' });
      renderHabits();
    });
    
    row.querySelector('.btn-delete-habit').addEventListener('click', async (e) => {
        const habitId = e.target.dataset.id;
        if (!confirm('Yakin ingin menghapus Habit ini? Log terkait juga akan terhapus.')) return;
        
        const res = await apiFetch(`/habits/${habitId}`, { method: 'DELETE' });
        
        if (res.ok) {
            notify('Habit Dihapus', `${h.title} berhasil dihapus.`);
            renderHabits();
        } else {
            alert('Gagal menghapus habit.');
        }
    });

    list.appendChild(row);
  });
}


// Modifikasi Listener Modal Add Habit
document.getElementById('btn-show-add-habit')?.addEventListener('click', () => {
  document.getElementById('modal-add-habit').classList.remove('hidden');
});
document.getElementById('btn-cancel-habit')?.addEventListener('click', () => {
  document.getElementById('modal-add-habit').classList.add('hidden');
});

// Listener Save Habit (FORM DETAIL)
document.getElementById('btn-save-habit')?.addEventListener('click', async () => {
  const title = document.getElementById('habit-title').value.trim();
  const icon = document.getElementById('habit-icon').value.trim();
  
  const goal_unit = Number(document.getElementById('habit-goal-unit').value);
  const goal_frequency = document.getElementById('habit-goal-frequency').value;
  
  const area = document.getElementById('habit-area').value; 
  
  const selectedTimes = $all('input[name="habit_time"]:checked').map(el => el.value);
  const timeErrorEl = document.getElementById('time-error');
  
  if (!title) { alert('Nama habit wajib diisi'); return; }
  
  if (selectedTimes.length === 0) {
      if(timeErrorEl) timeErrorEl.hidden = false;
      return;
  }
  if(timeErrorEl) timeErrorEl.hidden = true; 

  const time_of_day = selectedTimes[0]; 

  const res = await apiFetch('/habits', {
    method: 'POST',
    body: JSON.stringify({ 
        title, 
        icon, 
        time_of_day,       
        goal_unit, 
        goal_frequency, 
        area 
    })
  });

  if (res.ok) {
    // Reset form dan tutup modal
    document.getElementById('habit-title').value = '';
    document.getElementById('habit-icon').value = '';
    document.getElementById('habit-goal-unit').value = '1';
    document.getElementById('habit-goal-frequency').value = 'day';
    document.getElementById('habit-area').value = 'general';
    $all('input[name="habit_time"]').forEach((el, i) => el.checked = (i === 0)); // Cek morning saja
    
    document.getElementById('modal-add-habit').classList.add('hidden');
    
    renderHabits();
  } else {
    const data = await res.json().catch(() => ({ message: 'Unknown error' }));
    alert('Gagal menambahkan habit: ' + (data.message || 'Unknown error'));
  }
});

// ================= IP CALCULATOR =================
// ⭐ STATE LOKAL IP CALC
let assessments = [
    { name: 'Aspek 1', score: 0, weight: 0, id: 1 } // Baris pertama sebagai template
];
let nextAssessmentId = 2; 

// ⭐ FUNGSI: Merender form aspek penilaian dinamis
function renderAssessmentForm() {
    const container = $('#assessment-form-container');
    if (!container) return;
    
    // ⭐ PENTING: Tambahkan input Semester di sini, karena form ini dipanggil saat init page
    const semesterInput = document.getElementById('course-semester');
    if(semesterInput && !semesterInput.value) {
        semesterInput.value = 1; // Default ke Semester 1 jika kosong
    }


    let html = '';
    const totalWeight = assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

    // Header Kolom
    html += `
        <div class="flex gap-2 mb-2 p-1 text-xs font-semibold text-gray-700 border-b">
            <span class="flex-1">Nama Aspek</span>
            <span class="w-16 text-center">Nilai (0-100)</span>
            <span class="w-20 text-center">Bobot (%)</span>
            <span class="w-5"></span>
        </div>
    `;

    assessments.forEach(a => {
        html += `
            <div class="flex gap-2 mb-2 p-2 border rounded items-center bg-white shadow-sm" data-id="${a.id}">
                <input type="text" value="${escapeHtml(a.name)}" placeholder="Nama Aspek"
                    class="input-name flex-1 p-2 border rounded text-sm" data-id="${a.id}" />
                <input type="number" value="${a.score}" min="0" max="100" placeholder="Nilai"
                    class="input-score w-16 p-2 border rounded text-sm text-center" data-id="${a.id}" />
                <input type="number" value="${a.weight}" min="0" max="100" placeholder="Bobot (%)"
                    class="input-weight w-20 p-2 border rounded text-sm text-center" data-id="${a.id}" />
                <button type="button" class="btn-remove-assessment text-red-500 text-lg w-5" data-id="${a.id}" ${assessments.length === 1 ? 'disabled' : ''}>
                    &times;
                </button>
            </div>
        `;
    });
    
    // Total Bobot Display (Kontrol Kritis)
    const weightColor = Math.abs(totalWeight - 100) > 0.01 ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

    html += `
        <div class="mt-4 flex justify-between items-center text-sm p-2 bg-gray-100 rounded">
            <span class="font-semibold text-indigo-700">Validasi Bobot:</span>
            <span class="${weightColor}">${totalWeight.toFixed(2)}% dari 100%</span>
        </div>
    `;

    container.innerHTML = html;

    // Attach Listeners
    $all('.input-name').forEach(input => input.onchange = updateAssessmentData);
    $all('.input-score').forEach(input => input.onchange = updateAssessmentData);
    $all('.input-weight').forEach(input => input.onchange = updateAssessmentData);
    $all('.btn-remove-assessment').forEach(btn => btn.onclick = removeAssessment);
}

// ⭐ FUNGSI: Mengupdate state assessments
function updateAssessmentData(e) {
    const id = parseInt(e.target.dataset.id);
    const classes = e.target.className.split(' ');
    const keyClass = classes.find(c => c.startsWith('input-')).split('-')[1]; // name, score, or weight
    let value = e.target.value;

    const assessmentIndex = assessments.findIndex(a => a.id === id);

    if (assessmentIndex > -1) {
        if (keyClass === 'score' || keyClass === 'weight') {
            value = Number(value) || 0;
            value = Math.max(0, Math.min(100, value)); 
            
            if (e.target.type === 'number') e.target.value = value; 
            
            assessments[assessmentIndex][keyClass] = value;
        } else {
            assessments[assessmentIndex][keyClass] = value;
        }
    }
    renderAssessmentForm();
}

// ⭐ FUNGSI: Menambah aspek baru
function addAssessment() {
    assessments.push({
        name: `Aspek ${nextAssessmentId}`,
        score: 0,
        weight: 0,
        id: nextAssessmentId++
    });
    renderAssessmentForm();
}

// ⭐ FUNGSI: Menghapus aspek
function removeAssessment(e) {
    const id = parseInt(e.target.dataset.id);
    if (assessments.length > 1) {
        assessments = assessments.filter(a => a.id !== id);
        renderAssessmentForm();
    }
}

// ⭐ FUNGSI BARU: Render Riwayat IP (Termasuk IPS dan IPK)
async function renderIPHistory() {
    const list = $('#ip-history-list');
    const summaryBox = $('#ip-summary-box'); // Container IPS/IPK baru
    
    if (!list || !summaryBox) return;

    list.innerHTML = `<p class="text-gray-500 p-2 text-center">Memuat riwayat...</p>`;
    summaryBox.innerHTML = ''; // Clear summary box

    const res = await apiFetch('/ip/history');

    if (!res.ok) {
        list.innerHTML = `<p class="text-red-500 p-2 text-center">❌ Gagal memuat riwayat IP.</p>`;
        return;
    }

    const data = await res.json();
    const history = data.history || [];
    const summary = data.summary || { final_ipk: 'N/A', final_predicate: 'N/A', semester_history: [] };

    list.innerHTML = '';

    if (history.length === 0) {
        list.innerHTML = `<p class="text-gray-500 p-2 text-center">Belum ada mata kuliah yang dihitung.</p>`;
        return;
    }
    
    // --- 1. RENDER RIWAYAT MATA KULIAH (Per Semester) ---
    const coursesBySemester = history.reduce((acc, h) => {
        acc[h.semester_number] = acc[h.semester_number] || [];
        acc[h.semester_number].push(h);
        return acc;
    }, {});

    const sortedSemesterNumbers = Object.keys(coursesBySemester).sort((a, b) => parseInt(a) - parseInt(b));

    sortedSemesterNumbers.forEach(semNum => {
        const semesterCourses = coursesBySemester[semNum];
        const semesterData = summary.semester_history.find(s => String(s.semester_number) === semNum);

        let semHtml = `<h4 class="font-bold text-lg mt-4 mb-2 text-indigo-700">Semester ${semNum} (IPS: ${semesterData ? semesterData.ips : '--'})</h4>`;
        
        semesterCourses.forEach((h, index) => {
            const assessmentListHtml = h.assessments.map(a => 
                `<li class="text-xs text-gray-600">${escapeHtml(a.name)}: ${a.score}% (${a.weight}%)</li>`
            ).join('');
            
            semHtml += `
                <div class="p-3 rounded-xl bg-white shadow-sm border mb-2">
                    <div class="flex justify-between items-start mb-2">
                        <h5 class="font-bold text-md text-indigo-800">${escapeHtml(h.course_name)} (${h.sks} SKS)</h5>
                        <span class="text-sm font-bold text-indigo-600">IP: ${h.ip}</span>
                    </div>
                    
                    <div class="grid grid-cols-4 text-sm border-t pt-2">
                        <p class="font-semibold">NA: <span class="text-green-600">${h.final_score}%</span></p>
                        <p class="font-semibold">Huruf: <span class="text-green-600">${h.grade}</span></p>
                        <p class="font-semibold">Predikat: <span class="text-green-600">${h.predicate}</span></p>
                    </div>

                    <details class="text-sm mt-2 cursor-pointer">
                        <summary class="text-gray-600 hover:text-indigo-600 font-semibold">Lihat Detail Penilaian</summary>
                        <ul class="list-disc list-inside mt-2 ml-4">
                            ${assessmentListHtml}
                        </ul>
                    </details>
                </div>
            `;
        });
        list.insertAdjacentHTML('beforeend', semHtml);
    });

    // --- 2. RENDER SUMMARY IPS / IPK ---
    const finalIpk = summary.final_ipk;
    const finalPredicate = summary.final_predicate;
    
    // Tampilkan IPK Final
    let summaryHtml = `
        <div class="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <h3 class="font-bold text-xl text-indigo-700 mb-2">🎓 Ringkasan Prestasi Akademik</h3>
            <div class="grid grid-cols-2 gap-4">
                <div class="p-2 bg-white rounded-lg">
                    <p class="text-xs text-gray-600">IP Kumulatif (IPK) Final:</p>
                    <p class="text-3xl font-bold ${finalIpk >= 3.0 ? 'text-green-600' : 'text-red-600'}">${finalIpk}</p>
                </div>
                <div class="p-2 bg-white rounded-lg">
                    <p class="text-xs text-gray-600">Predikat Yudisium:</p>
                    <p class="text-lg font-bold text-indigo-700 mt-1">${finalPredicate}</p>
                </div>
            </div>
            
            <details class="text-sm mt-3 cursor-pointer">
                <summary class="font-semibold text-gray-700">Riwayat IPS per Semester</summary>
                <ul class="list-disc list-inside mt-2 ml-4 space-y-1">
                    ${summary.semester_history.map(s => 
                        `<li class="text-sm">Semester ${s.semester_number}: <span class="font-bold text-indigo-600">${s.ips}</span> (IPK Kumulatif: ${s.ipk})</li>`
                    ).join('')}
                </ul>
            </details>
        </div>
    `;

    summaryBox.innerHTML = summaryHtml;
}


// ⭐ MODIFIKASI: Event Listener Hitung IP
const btnCalcIP = document.getElementById('btn-calc-ip');
const btnAddAssessment = document.getElementById('btn-add-assessment');
const courseSemesterInput = document.getElementById('course-semester'); // Tambahkan variabel untuk input semester

// ⭐ Panggil fungsi saat tombol 'Tambah Aspek' diklik
if (btnAddAssessment) {
    btnAddAssessment.addEventListener('click', addAssessment);
}

// ⭐ Event Listener untuk Submit Perhitungan
if (btnCalcIP) {
    btnCalcIP.addEventListener('click', async () => {
        const courseName = document.getElementById('course-name').value.trim();
        const sks = Number(document.getElementById('course-sks').value) || 0;
        const semesterNumber = Number(document.getElementById('course-semester').value) || 0; // ⭐ Ambil nilai semester
        
        // Final check bobot 100%
        const totalWeight = assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
        
        if (!courseName || sks <= 0 || semesterNumber <= 0) {
            alert('Nama Mata Kuliah, SKS, dan Nomor Semester wajib diisi.');
            return;
        }
        if (Math.abs(totalWeight - 100) > 0.01) {
            alert(`Gagal: Total bobot penilaian harus 100%. Saat ini: ${totalWeight.toFixed(2)}%`);
            return;
        }
        if (assessments.length === 0) {
            alert('Tambahkan minimal satu aspek penilaian.');
            return;
        }
        
        // Construct payload
        const payload = {
            course_name: courseName,
            sks: sks,
            semester_number: semesterNumber, // ⭐ Tambahkan ke payload
            assessments: assessments.map(a => ({
                name: a.name,
                score: Number(a.score),
                weight: Number(a.weight)
            }))
        };

        btnCalcIP.textContent = 'Menghitung...';
        btnCalcIP.disabled = true;

        // Kirim data ke API (POST /api/ip/calculate)
        const res = await apiFetch('/ip/calculate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        btnCalcIP.textContent = 'Hitung Nilai Akhir & IP';
        btnCalcIP.disabled = false;

        if (res.ok) {
            // Update hasil tampilan
            document.getElementById('ip-result-score').innerText = data.final_score + '%'; // Nilai Akhir
            document.getElementById('ip-result-grade').innerText = data.grade; // Nilai Huruf
            document.getElementById('ip-result').innerText = data.ip; // IP Mata Kuliah
            document.getElementById('ip-category').innerText = data.predicate; // Predikat Mata Kuliah
            
            // Muat ulang riwayat dan reset form
            await renderIPHistory();
            
            // Reset form input Mata Kuliah dan Aspek
            document.getElementById('course-name').value = '';
            document.getElementById('course-sks').value = '3'; 
            // document.getElementById('course-semester').value = semesterNumber; // Biarkan semester yang sama default
            assessments = [{ name: 'Aspek 1', score: 0, weight: 0, id: nextAssessmentId++ }]; // Kembalikan ke state awal 1 baris
            renderAssessmentForm();
            
        } else {
            alert(data.message || 'Gagal menghitung IP. Cek bobot total dan koneksi server.');
        }
    });
}


// ⭐ FUNGSI: Inisialisasi Halaman IP Calc
function initIPCalcPage() {
    renderAssessmentForm();
    renderIPHistory();
}

// ---------- POMODORO ----------
let timerInterval = null;
function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

$('#timer-display').textContent = formatTime(state.timer || 25*60);

async function handlePomodoroCompletion() {
    const res = await apiFetch('/user/complete-pomodoro', { 
        method: 'PUT' 
    });

    if (res.ok) {
        await fetchProfileAndSync(); 
        
        state.pomodoroSessions = (state.pomodoroSessions || 0) + 1;
        saveState();

        const data = await res.json();
        notify('Reward Poin!', data.message);
        
    } else {
        state.pomodoroSessions = (state.pomodoroSessions || 0) + 1;
        saveState();
        notify('Peringatan!', 'Sesi selesai, namun Gagal mendapatkan poin dari server.');
    }
    
    checkAchievements();
}

function startTimer(){
  if(state.running) return;
  state.running = true;
  $('#btn-start').textContent = 'Pause';
  timerInterval = setInterval(async ()=>{ 
    if(state.timer > 0){
      state.timer--;
      $('#timer-display').textContent = formatTime(state.timer);
    } else {
      clearInterval(timerInterval);
      state.running = false;
      await handlePomodoroCompletion();
      notify('Pomodoro selesai', 'Sesi pomodoro selesai!'); 

      $('#btn-start').textContent = 'Pause (Done)';
      
      state.timer = 25*60;
      
      setTimeout(() => {
          $('#timer-display').textContent = formatTime(state.timer);
          $('#btn-start').textContent = 'Start';
      }, 500);
    }
  }, 1000);
}

function pauseTimer(){
  if(timerInterval) clearInterval(timerInterval);
  state.running = false;
  $('#btn-start').textContent = 'Start';
  saveState();
}

$('#btn-start').addEventListener('click', ()=>{
  if(state.running) pauseTimer(); else startTimer();
});

$('#btn-reset').addEventListener('click', ()=>{
  if(timerInterval) clearInterval(timerInterval);
  state.running = false;
  state.timer = 25*60;
  $('#timer-display').textContent = formatTime(state.timer);
  $('#btn-start').textContent = 'Start';
  saveState();
});



// ---------- AUTO CHECK ----------
setInterval(()=>{
  const now = new Date();
  const dayMs = 24*60*60*1000;
  
  state.tasks.forEach(t=>{
    if(t.status === 'completed' || !t.due_date) return; 
    const taskTime = new Date(t.due_date);
    if (isNaN(taskTime.getTime())) return;
    const diff = taskTime - now;
    if(diff > 0 && diff <= dayMs){
      state._remindedDeadlines = state._remindedDeadlines || {};
      if(!state._remindedDeadlines[t.id]){
        notify('Pengingat Tugas', `${t.title} akan jatuh tempo dalam ${Math.ceil(diff/60000)} menit`);
        state._remindedDeadlines[t.id] = true;
        saveState();
      }
    }
  });

  const bal = state.finance.reduce((s,f)=>s + (f.income||0) - (f.expense||0), 0);
  if(bal <= 20000){
    state._lowBalanceWarned = state._lowBalanceWarned || false;
    if(!state._lowBalanceWarned){
      notify('Perhatian Saldo', `Saldo tersisa Rp ${bal}`);
      state._lowBalanceWarned = true;
      saveState();
    }
  } else {
    state._lowBalanceWarned = false;
  }

}, 30000);

// ---------- UTILITIES ----------
function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#039;');
}
function todayISO(){
    return new Date().toISOString().split('T')[0];
}

// ---------- INITIAL RENDER ----------
function init(){
  if(!localStorage.getItem(TOKEN_KEY)){
    if(window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html'){
         window.location.href = '/login.html';
         return; 
    }
  }
  
  state.tasks = state.tasks || [];
  state.finance = state.finance || [];
  state.roadmap = state.roadmap || [];
  state.habits = state.habits || [];
  state.timer = typeof state.timer === 'number' ? state.timer : 25*60;
  state.notif = state.notif || [];
  state.achievements = state.achievements || { coins:0, tasksCompletedRecorded:0, roadmapCompletedRecorded:0, pomodoroCompletedRecorded:0 };
  state.pomodoroSessions = state.pomodoroSessions || 0;

  $all('.habit-filter-time').forEach(btn => {
      btn.addEventListener('click', () => updateHabitFilter(btn.dataset.time));
  });
  $all('.habit-filter-area').forEach(btn => {
      btn.addEventListener('click', () => updateAreaFilter(btn.dataset.area));
  });
  
  updateHabitFilter('all', false);
  updateAreaFilter('all', false);

  renderHabitRecommendations(); 
  
  if (localStorage.getItem(TOKEN_KEY)) {
      fetchProfileAndSync();
  }

  renderTasks();
  renderFinance();
  renderRoadmap();
  renderHabits();
  renderAchievements();
  renderLeaderboard(); 
  renderNotificationsBadge();

  $('#timer-display').textContent = formatTime(state.timer || 25*60);

  setPage(state.page || 'dashboard');

  if("Notification" in window && Notification.permission !== 'granted'){
    Notification.requestPermission().catch(()=>{});
  }
}

const financeFilter = $('#finance-filter');
if (financeFilter) {
    financeFilter.addEventListener('change', () => {
        renderFinance(financeFilter.value); 
    });
}

init();