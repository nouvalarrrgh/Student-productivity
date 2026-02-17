// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");

// Supabase membutuhkan SSL jika diakses dari luar (production)
const isProd = process.env.NODE_ENV === "production";

let pool;

if (!global.__pgPool) {
  global.__pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Tambahkan baris SSL ini untuk koneksi ke Supabase
    ssl: {
      rejectUnauthorized: false
    }
  });
}

pool = global.__pgPool;

pool.on("error", (err) => {
  console.error("🔥 PostgreSQL idle client error:", err.message);
});

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("🚀 Connected to Supabase Successfully!");
  } catch (err) {
    console.error("❌ Supabase connection failed!");
    console.error("Detail:", err.message);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
