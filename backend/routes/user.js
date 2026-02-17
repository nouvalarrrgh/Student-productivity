// backend/routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// Konstanta global
const POINTS_PER_POMODORO = 10;

// ======================================================
//  GET /api/user/stats
//  Mendapatkan statistik user yang sedang login
// ======================================================
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const q = await db.query(
      `SELECT 
          id,
          username,
          points,
          tasks_completed,
          pomodoro_done,
          roadmap_done,
          email,
          role,
          created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    return res.json({
      status: "success",
      user: q.rows[0]
    });

  } catch (err) {
    console.error("Error getting stats:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});


// ======================================================
//   POST /api/user/sync-stats
//   Sinkronisasi roadmap_done (ONLY roadmap)
// ======================================================
router.post('/sync-stats', verifyToken, async (req, res) => {
  try {
    const { roadmap_done } = req.body;
    const userId = req.user.id;

    if (roadmap_done === undefined || roadmap_done === null) {
      return res.status(400).json({
        status: "error",
        message: "Field 'roadmap_done' is required"
      });
    }

    if (typeof roadmap_done !== "number" || roadmap_done < 0) {
      return res.status(400).json({
        status: "error",
        message: "roadmap_done must be a valid non-negative number"
      });
    }

    const q = await db.query(
      `UPDATE users 
       SET roadmap_done = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, roadmap_done`,
      [roadmap_done, userId]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    return res.json({
      status: "success",
      message: "Roadmap progress synchronized",
      user_stats: q.rows[0]
    });

  } catch (err) {
    console.error("Error syncing stats:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});


// ======================================================
//  PUT /api/user/complete-pomodoro
//  Menambah poin + 1 pomodoro_done (Atomic)
// ======================================================
router.put('/complete-pomodoro', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const q = await db.query(
      `UPDATE users
       SET pomodoro_done = pomodoro_done + 1,
           points = points + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, points, pomodoro_done`,
      [POINTS_PER_POMODORO, userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    return res.json({
      status: "success",
      message: `Pomodoro complete! +${POINTS_PER_POMODORO} points`,
      user: q.rows[0]
    });

  } catch (err) {
    console.error("Error completing pomodoro:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error completing pomodoro"
    });
  }
});


module.exports = router;