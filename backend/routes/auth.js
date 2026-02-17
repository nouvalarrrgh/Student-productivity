const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
require('dotenv').config();

const SALT_ROUNDS = 10;

/* =======================
   UTILITIES
======================= */
function isEmail(str) {
  return /\S+@\S+\.\S+/.test(str);
}

function isStrongPassword(str) {
  return typeof str === "string" && str.length >= 6;
}

function isValidUsername(str) {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing");
  }

  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ======================================================
   REGISTER
====================================================== */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username & password wajib diisi' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        message: 'Username hanya boleh huruf, angka, dan underscore'
      });
    }

    if (email && !isEmail(email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, points`,
      [username, email || null, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return res.status(201).json({ token, user });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({
        message: "Username atau email sudah digunakan"
      });
    }

    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   LOGIN (USERNAME / EMAIL / INPUT)
====================================================== */
router.post('/login', async (req, res) => {
  try {
    const { input, email, username, password } = req.body;

    const loginValue = input || email || username;

    if (!loginValue || !password) {
      return res.status(400).json({ message: 'Login & password wajib diisi' });
    }

    let userQuery;

    if (isEmail(loginValue)) {
      userQuery = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [loginValue]
      );
    } else {
      userQuery = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [loginValue]
      );
    }

    const user = userQuery.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Username/email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Username/email atau password salah' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   GET CURRENT USER
====================================================== */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, email, role, points,
              tasks_completed, pomodoro_done, roadmap_done
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    return res.json({ user });

  } catch (err) {
    console.error("ME ERROR:", err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   RESET PASSWORD (PROTECTED)
====================================================== */
router.post('/reset-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        message: 'Password baru minimal 6 karakter'
      });
    }

    const q = await db.query(
      "SELECT password FROM users WHERE id = $1",
      [req.user.id]
    );

    const user = q.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password lama salah' });
    }

    const hashed = await bcrypt.hash(new_password, SALT_ROUNDS);

    await db.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashed, req.user.id]
    );

    return res.json({ message: "Password berhasil direset" });

  } catch (err) {
    console.error("RESET ERROR:", err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;