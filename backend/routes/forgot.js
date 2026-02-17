// routes/forgot.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db'); 

// ⭐ BARU: Route untuk mencari email yang dimasukkan user
// Endpoint: POST /api/forgot/check-email
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email wajib diisi.' });
        }
        
        // 1. Mencari user berdasarkan email
        const q = await db.query(
            `SELECT id, email FROM users WHERE email = $1`,
            [email]
        );
        
        if (q.rows.length === 0) {
            // Pesan error yang Anda terima: "Email tidak ditemukan dalam sistem."
            return res.status(404).json({ message: 'Email tidak ditemukan dalam sistem.' });
        }

        // 2. Jika email ditemukan, kembalikan ID user (untuk simulasi tahap reset berikutnya)
        // Di aplikasi nyata, di sini akan dibuat token reset & dikirim via email.
        res.json({ message: 'Email ditemukan.', userId: q.rows[0].id });
        
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error saat mencari email.' });
    }
});


// Route asli Anda untuk melakukan update password (tidak diubah)
// Endpoint: POST /api/forgot/submit
router.post('/submit', async (req, res) => {
    try {
        const { userId, new_password } = req.body; 

        if (!userId || !new_password) {
            return res.status(400).json({ message: 'User ID dan Password baru wajib diisi.' });
        }
        
        const hashed = await bcrypt.hash(new_password, 10);

        const q = await db.query(
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashed, userId]
        );

        if (q.rowCount === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        res.json({ message: 'Password berhasil direset! Silakan login.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;