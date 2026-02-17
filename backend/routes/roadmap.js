// routes/roadmap.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken'); 

// ⭐ KONSTANTA: Poin Hadiah
const ROADMAP_REWARD_POINTS = 50;

// GET /api/roadmap (READ: Mendapatkan semua roadmap)
router.get('/', verifyToken, async (req, res) => {
    try {
        const q = await db.query(
            `SELECT * FROM roadmap 
             WHERE user_id=$1 
             ORDER BY id ASC`, 
            [req.user.id]
        );
        res.json({ roadmaps: q.rows });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error retrieving roadmap' });
    }
});

// POST /api/roadmap (CREATE: Menambah roadmap baru)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { semester, sks, target, status } = req.body;
        
        if (!semester || !sks || !target || !status) {
            return res.status(400).json({ message: 'Lengkapi semua field roadmap' });
        }

        const q = await db.query(
            `INSERT INTO roadmap (user_id, semester, sks, target, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, 
            [req.user.id, semester, sks, target, status]
        );
        res.status(201).json({ roadmap: q.rows[0], message: 'Roadmap created' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating roadmap' });
    }
});

// PUT /api/roadmap/:id (UPDATE: Mengubah status roadmap dan sinkronisasi poin)
router.put('/:id', verifyToken, async (req, res) => {
    // Gunakan koneksi dari pool untuk menjalankan transaksi
    const client = await db.pool.connect(); 
    try {
        await client.query('BEGIN'); // MULAI TRANSAKSI
        
        const { id } = req.params;
        const { status } = req.body; 
        const userId = req.user.id;

        if (!status) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Status wajib diisi.' });
        }

        // 1. Ambil status lama untuk menentukan apakah poin perlu ditambahkan/dikurangi
        const oldRoadmapQ = await client.query(
            `SELECT status FROM roadmap WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        if (oldRoadmapQ.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Roadmap not found or unauthorized' });
        }
        const oldStatus = oldRoadmapQ.rows[0].status;

        // 2. Update status baru di tabel roadmap
        const q = await client.query(
            `UPDATE roadmap SET status = $1 
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [status, id, userId]
        );

        const updatedRoadmap = q.rows[0];
        const newStatus = updatedRoadmap.status;
        
        const oldIsCompleted = oldStatus.toLowerCase() === 'selesai';
        const newIsCompleted = newStatus.toLowerCase() === 'selesai';

        // 3. Logika Poin & Achivement
        if (newIsCompleted && !oldIsCompleted) {
            // KASUS A: Roadmap SELESAI (Reward Poin)
            await client.query(
                `UPDATE users SET 
                 points = points + $1, 
                 roadmap_done = roadmap_done + 1
                 WHERE id = $2`,
                [ROADMAP_REWARD_POINTS, userId]
            );
        } else if (!newIsCompleted && oldIsCompleted) {
            // KASUS B: Roadmap DIBATALKAN (Penalti Poin)
            await client.query(
                `UPDATE users SET 
                 points = GREATEST(0, points - $1), 
                 roadmap_done = GREATEST(0, roadmap_done - 1)
                 WHERE id = $2`,
                [ROADMAP_REWARD_POINTS, userId]
            );
        }
        
        await client.query('COMMIT'); // SIMPAN SEMUA PERUBAHAN
        res.json({ roadmap: updatedRoadmap, message: 'Roadmap updated and achievements synchronized' });
    } catch(err) {
        await client.query('ROLLBACK'); // BATALKAN JIKA ADA ERROR
        console.error(err);
        res.status(500).json({ message: 'Server error updating roadmap' });
    } finally {
        client.release(); // Lepaskan koneksi klien
    }
});


// DELETE /api/roadmap/:id (DELETE: Menghapus roadmap)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const q = await db.query(
            `DELETE FROM roadmap WHERE id = $1 AND user_id = $2 RETURNING id`, 
            [id, req.user.id]
        );

        if (q.rows.length === 0) {
            return res.status(404).json({ message: 'Roadmap not found or unauthorized' });
        }
        
        res.json({ message: 'Roadmap deleted' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting roadmap' });
    }
});

module.exports = router;