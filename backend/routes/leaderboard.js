// backend/routes/leaderboard.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// public endpoint: top N leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const q = await db.query(
      `SELECT id, username, points, tasks_completed, pomodoro_done, roadmap_done
       FROM users
       ORDER BY points DESC, tasks_completed DESC
       LIMIT $1`, [limit]
    );
    res.json({ rows: q.rows });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;