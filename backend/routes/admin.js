// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyAdmin = require('../middleware/verifyAdminToken');


// ======================================================
//  GET /api/admin/users
//  List semua user (admin only)
// ======================================================
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const q = await db.query(
      `SELECT 
          id, username, email, role, points, 
          tasks_completed, pomodoro_done, roadmap_done, created_at
       FROM users
       ORDER BY points DESC`
    );

    return res.json({
      status: "success",
      count: q.rows.length,
      users: q.rows
    });

  } catch (err) {
    console.error("Admin Get Users Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});


// ======================================================
//  DELETE /api/admin/users/:id
//  Menghapus user berdasarkan ID
// ======================================================
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Admin tidak boleh menghapus dirinya sendiri
    if (Number(id) === req.admin.id) {
      return res.status(400).json({
        status: "error",
        message: "Admin cannot delete their own account"
      });
    }

    const q = await db.query(
      `DELETE FROM users 
       WHERE id = $1
       RETURNING id, username`,
      [id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    return res.json({
      status: "success",
      message: `User '${q.rows[0].username}' deleted successfully`,
      deleted_user: q.rows[0]
    });

  } catch (err) {
    console.error("Admin Delete Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error deleting user"
    });
  }
});


// ======================================================
//  POST /api/admin/users/:id/reset
//  Reset statistik user
// ======================================================
router.post('/users/:id/reset', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const q = await db.query(
      `UPDATE users 
       SET points = 0,
           tasks_completed = 0,
           pomodoro_done = 0,
           roadmap_done = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username`,
      [id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    return res.json({
      status: "success",
      message: `User '${q.rows[0].username}' statistics reset successfully`,
      user: q.rows[0]
    });

  } catch (err) {
    console.error("Admin Reset Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error resetting user stats"
    });
  }
});


module.exports = router;