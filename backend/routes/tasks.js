// backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// Allowed status values
const VALID_STATUS = ["pending", "in-progress", "completed"];

// Konstanta Reward
const REWARD_POINTS = 5;

// Helper: Build combined deadline
function buildDeadline(date, time) {
  if (!date) return null;
  if (!time) return new Date(`${date}T00:00:00`);

  // Format ISO aman untuk Postgres
  return new Date(`${date}T${time}:00`);
}

/* ======================================================
   1. GET TASKS
====================================================== */
router.get('/', verifyToken, async (req, res) => {
  try {
    const q = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id=$1 
       ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [req.user.id]
    );
    res.json({ tasks: q.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving tasks' });
  }
});

/* ======================================================
   2. CREATE TASK
====================================================== */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // ✅ Terima ISO timestamp langsung
    let deadline = null;
    if (due_date) {
      const parsedDate = new Date(due_date);
      if (!isNaN(parsedDate.getTime())) {
        deadline = parsedDate;
      }
    }

    const q = await db.query(
      `INSERT INTO tasks (user_id, title, due_date, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, title, deadline]
    );

    res.status(201).json({
      task: q.rows[0],
      message: 'Task created'
    });

  } catch (err) {
    console.error("CREATE TASK ERROR:", err);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

/* ======================================================
   3. UPDATE TASK + Reward / Penalti
====================================================== */
router.put('/:id', verifyToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, status } = req.body;

    // Validate status
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    // Ambil status lama
    const oldTask = await client.query(
      `SELECT status FROM tasks WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );

    if (oldTask.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    const oldStatus = oldTask.rows[0].status;

    // Build dynamic update
    let updateFields = [];
    let params = [];
    let index = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${index++}`);
      params.push(title);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${index++}`);
      params.push(status);
    }

    params.push(id);
    params.push(req.user.id);

    const q = await client.query(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id=$${index++} AND user_id=$${index++}
       RETURNING *`,
      params
    );

    const updatedTask = q.rows[0];
    const newStatus = updatedTask.status;

    /* ======================================
       REWARD / PENALTY LOGIC
    ====================================== */
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      await client.query(
        `UPDATE users SET 
          points = points + $1,
          tasks_completed = tasks_completed + 1
         WHERE id=$2`,
        [REWARD_POINTS, req.user.id]
      );
    }

    if (newStatus !== 'completed' && oldStatus === 'completed') {
      await client.query(
        `UPDATE users SET 
          points = GREATEST(points - $1, 0),
          tasks_completed = GREATEST(tasks_completed - 1, 0)
         WHERE id=$2`,
        [REWARD_POINTS, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({
      task: updatedTask,
      message: 'Task and user achievements updated'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error updating task' });
  } finally {
    client.release();
  }
});

/* ======================================================
   4. DELETE TASK (+ Auto Penalti jika completed)
====================================================== */
router.delete('/:id', verifyToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // Cek apakah task completed sebelum dihapus
    const existing = await client.query(
      `SELECT status FROM tasks WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Task not found or unauthorized" });
    }

    const wasCompleted = existing.rows[0].status === "completed";

    // Hapus
    const del = await client.query(
      `DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING id`,
      [id, req.user.id]
    );

    // Jika task completed → kurangi poin
    if (wasCompleted) {
      await client.query(
        `UPDATE users SET
           points = GREATEST(points - $1, 0),
           tasks_completed = GREATEST(tasks_completed - 1, 0)
         WHERE id=$2`,
        [REWARD_POINTS, req.user.id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Task deleted" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Server error deleting task" });
  } finally {
    client.release();
  }
});

module.exports = router;