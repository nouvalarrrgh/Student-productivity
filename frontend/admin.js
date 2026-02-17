// admin.js - KODE FINAL DAN KOREKSI PORT
// ⭐ KOREKSI: Gunakan Port 4001
const API_BASE = 'http://localhost:4001/api'; 
const TOKEN_KEY = 'sp_token';
const USER_KEY = 'sp_user';

// Ambil token saat inisialisasi
const token = localStorage.getItem(TOKEN_KEY);

// ---------- UTILITIES ----------

// Fungsi terpusat untuk Logout/Clear Token
function handleLogout(){
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Opsional: Clear state local storage
  localStorage.removeItem('stuProd_v1'); 
  location.href = '/login.html';
}

// Fungsi terpusat untuk fetch dengan token
async function apiFetch(endpoint, options = {}){
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  // Tambahkan token JWT ke header Authorization
  headers['Authorization'] = 'Bearer ' + token;

  try {
    const res = await fetch(API_BASE + endpoint, { ...options, headers });

    // Handle 401 Unauthorized / 403 Forbidden (Otorisasi Gagal)
    if(!res.ok && (res.status === 401 || res.status === 403)){
      alert('Akses admin ditolak atau sesi berakhir.');
      handleLogout();
      return { ok: false };
    }
    
    // Handle error koneksi lainnya
    if(!res.ok) {
        // Ambil pesan error spesifik jika tersedia
        const errorData = await res.json().catch(() => ({ message: 'Server error' }));
        console.error("API Error:", errorData);
        alert(`Gagal memuat data: ${errorData.message}`);
    }

    return res;

  } catch (err) {
    console.error('Network/Connection Error:', err);
    alert('Error koneksi ke API (Port 4001).');
    return { ok: false };
  }
}

// ---------- PROTEKSI HALAMAN (DIJALANKAN DI AWAL) ----------
if(!token){
  alert('Silakan login sebagai admin.');
  location.href = '/login.html';
}


// ---------- FETCH DAN RENDER USER ----------
async function fetchUsers(){
    const box = document.getElementById('admin-users');
    box.innerHTML = '<p class="text-indigo-600 p-4">Memuat data pengguna...</p>';
    
    const res = await apiFetch('/admin/users');
    
    if(!res.ok){
        box.innerHTML = '<p class="text-red-600 p-4">Gagal memuat data pengguna. (Cek log server)</p>';
        return;
    }
    
    const data = await res.json();
    renderUsers(data.users || []);
}

function renderUsers(users){
    const box = document.getElementById('admin-users');
    box.innerHTML = '';

    if (users.length === 0) {
        box.innerHTML = `<p class="text-gray-500 p-4">Belum ada pengguna terdaftar (kecuali Admin ini).</p>`;
        return;
    }
    
    users.forEach(u=>{
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-xl shadow flex justify-between items-center mb-2';
        div.innerHTML = `
            <div>
                <div class="font-semibold">${u.username} <span class="text-xs text-gray-500">(${u.role})</span></div>
                <div class="text-sm text-gray-600">Email: ${u.email || 'N/A'}</div>
                <div class="text-sm text-gray-600">
                    Poin: ${u.points} — Tugas: ${u.tasks_completed} — Pomodoro: ${u.pomodoro_done} — Roadmap: ${u.roadmap_done || 0} 
                </div>
            </div>
            <div class="flex gap-2">
                <button class="reset-btn px-3 py-1 bg-yellow-400 rounded mr-2" data-id="${u.id}">Reset</button>
                <button class="del-btn px-3 py-1 bg-red-500 text-white rounded" data-id="${u.id}">Hapus</button>
            </div>
        `;
        box.appendChild(div);
    });

    // Attach Reset Listener
    document.querySelectorAll('.reset-btn').forEach(b=>{
        b.addEventListener('click', async ()=>{
            const id = b.dataset.id;
            if(!confirm('Reset data user ini?')) return;
            await apiFetch(`/admin/users/${id}/reset`, { method:'POST' });
            fetchUsers(); // Refresh
        });
    });

    // Attach Delete Listener
    document.querySelectorAll('.del-btn').forEach(b=>{
        b.addEventListener('click', async ()=>{
            const id = b.dataset.id;
            if(!confirm('Hapus user ini permanen?')) return;
            await apiFetch(`/admin/users/${id}`, { method:'DELETE' });
            fetchUsers(); // Refresh
        });
    });
}

// ---------- FETCH DAN RENDER LEADERBOARD ----------
async function renderLeaderboard(){
    const res = await apiFetch('/leaderboard?limit=50');
    
    if(!res.ok) {
        document.getElementById('leaderboard').innerHTML = '<p class="text-red-600 p-4">Gagal memuat Leaderboard.</p>';
        return;
    }
    
    const data = await res.json();
    const box = document.getElementById('leaderboard');
    box.innerHTML = '';
    
    (data.rows || []).forEach((r, i)=>{
        const div = document.createElement('div');
        div.className = 'p-3 bg-white rounded shadow mb-2';
        // ⭐ MODIFIKASI: Menambahkan Roadmap ke tampilan Leaderboard
        div.innerHTML = `<div class="font-semibold">#${i+1} ${r.username}</div>
            <div class="text-sm">Points: ${r.points} — Tasks: ${r.tasks_completed} — Pomodoro: ${r.pomodoro_done} — Roadmap: ${r.roadmap_done || 0}</div>`;
        box.appendChild(div);
    });
}

// ---------- INITIAL LOAD AND LOGOUT ----------

document.getElementById('btn-logout').addEventListener('click', handleLogout);

(async ()=>{
    // Panggil kedua fungsi secara paralel
    await Promise.all([
        fetchUsers(),
        renderLeaderboard()
    ]);
})();