// routes/finance.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// =====================================================================
// GET /api/finance → Ambil transaksi user (optional filter & pagination)
// =====================================================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, limit = 200, page = 1 } = req.query;

    const allowedTypes = ['income', 'expense'];
    const filterType = allowedTypes.includes(type) ? type : null;

    const limitVal = Math.max(1, Math.min(Number(limit) || 200, 500));
    const pageVal = Math.max(Number(page) || 1, 1);
    const offset = (pageVal - 1) * limitVal;

    let query = `
      SELECT id, type, amount, note, created_at
      FROM finance_transactions
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (filterType) {
      params.push(filterType);
      query += ` AND type = $${params.length}`;
    }

    params.push(limitVal, offset);
    query += `
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const q = await db.query(query, params);

    res.json({
      success: true,
      transactions: q.rows
    });

  } catch (err) {
    console.error('GET FINANCE ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving transactions'
    });
  }
});

// =====================================================================
// POST /api/finance → Tambah transaksi (FIX TOTAL)
// =====================================================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, amount, note } = req.body;

    // ✅ Validasi type
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe transaksi tidak valid'
      });
    }

    // ✅ Parse amount (TERIMA STRING / NUMBER)
    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          type === 'income'
            ? 'Masukkan pemasukan valid'
            : 'Masukkan pengeluaran valid'
      });
    }

    const q = await db.query(
      `INSERT INTO finance_transactions (user_id, type, amount, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, amount, note, created_at`,
      [
        req.user.id,
        type,
        parsedAmount,
        note?.trim() || null // ✅ note boleh kosong
      ]
    );

    res.status(201).json({
      success: true,
      transaction: q.rows[0],
      message: 'Transaksi berhasil ditambahkan'
    });

  } catch (err) {
    console.error('CREATE FINANCE ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Server error creating transaction'
    });
  }
});

// =====================================================================
// DELETE /api/finance/:id → Hapus transaksi
// =====================================================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const q = await db.query(
      `DELETE FROM finance_transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted'
    });

  } catch (err) {
    console.error('DELETE FINANCE ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Server error deleting transaction'
    });
  }
});

module.exports = router;