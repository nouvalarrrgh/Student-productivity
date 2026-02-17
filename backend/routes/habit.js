const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// =====================================================================
// GET /api/habits → Ambil semua habit user
// =====================================================================
router.get('/', verifyToken, async (req, res) => {
  try {
    // ⭐ MENGAMBIL SEMUA KOLOM TERMASUK YANG BARU
    const habits = await db.query(
      `SELECT * FROM habits WHERE user_id=$1 ORDER BY created_at`,
      [req.user.id]
    );

    // Ambil logs minggu ini (Untuk menentukan status selesai)
    const logs = await db.query(
      `SELECT habit_id, log_date, completed FROM habit_logs 
       WHERE habit_id IN (
         SELECT id FROM habits WHERE user_id=$1
       )
       AND log_date >= CURRENT_DATE - INTERVAL '6 days'`,
      [req.user.id]
    );

    res.json({ habits: habits.rows, logs: logs.rows });
  } catch (err) {
    console.error('HABIT GET ERROR (Server 500):', err);
    res.status(500).json({ message: 'Habit fetch failed. Check your server terminal for details.' });
  }
});

// =====================================================================
// POST /api/habits → Tambah habit baru (Mendukung field detail baru)
// =====================================================================
router.post('/', verifyToken, async (req, res) => {
  const { title, icon, time_of_day, goal_unit, goal_frequency, area } = req.body;
  
  if (!title) return res.status(400).json({ message: 'Title required' });

  const validTimes = ['morning', 'afternoon', 'evening'];
  const finalTime = validTimes.includes(time_of_day) ? time_of_day : 'morning';

  try {
    // ⭐ QUERY INSERT FINAL
    const q = await db.query(
      `INSERT INTO habits (user_id, title, icon, time_of_day, goal_unit, goal_frequency, area)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, title, icon, time_of_day, goal_unit, goal_frequency, area, created_at`,
      [
        req.user.id, 
        title, 
        icon || '📌', 
        finalTime, 
        Number(goal_unit) || 1, 
        goal_frequency || 'day', 
        area || 'general'
      ]
    );
    res.status(201).json({ habit: q.rows[0] });
  } catch(err) {
      console.error("HABIT CREATE ERROR (Server 500):", err);
      res.status(500).json({ 
          message: 'Gagal membuat habit. Pastikan semua kolom baru ada di tabel "habits".' 
      });
  }
});

// =====================================================================
// POST /api/habits/:id/toggle → Toggle status selesai
// =====================================================================
router.post('/:id/toggle', verifyToken, async (req, res) => {
  const { id } = req.params;
  const logDate = new Date().toISOString().split('T')[0];
  const userId = req.user.id;

  try {
    const logQ = await db.query(
      `SELECT id, completed FROM habit_logs WHERE habit_id = $1 AND log_date = $2`,
      [id, logDate]
    );

    let newStatus;
    if (logQ.rows.length > 0) {
      // Jika sudah ada, hapus log (toggle off)
      await db.query(`DELETE FROM habit_logs WHERE id = $1`, [logQ.rows[0].id]);
      newStatus = false;
    } else {
      // Jika belum ada, buat log baru (toggle on)
      await db.query(
        `INSERT INTO habit_logs (habit_id, log_date, completed) VALUES ($1, $2, TRUE)`,
        [id, logDate]
      );
      newStatus = true;
    }

    res.json({ 
      success: true, 
      habitId: id, 
      completed: newStatus,
      message: `Habit ${newStatus ? 'ditandai selesai' : 'dibuka kembali'}.`
    });

  } catch (err) {
    console.error('HABIT TOGGLE ERROR (Server 500):', err);
    res.status(500).json({ message: 'Server error toggling habit status' });
  }
});

// =====================================================================
// DELETE /api/habits/:id → Hapus Habit
// =====================================================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const q = await db.query(
      `DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id, title`,
      [id, req.user.id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: 'Habit tidak ditemukan atau tidak berhak.' });
    }

    res.json({ message: `Habit '${q.rows[0].title}' berhasil dihapus.` });

  } catch (err) {
    console.error('DELETE HABIT ERROR (Server 500):', err);
    res.status(500).json({ message: 'Server error saat menghapus habit.' });
  }
});

module.exports = router;