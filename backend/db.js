// db.js
require("dotenv").config();
const { Pool } = require("pg");

const isProd = process.env.NODE_ENV === "production";

let pool;

// 🔒 Cegah multiple-pool pada serverless (Vercel / Railway)
if (!global.__pgPool) {
  global.__pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProd
      ? { rejectUnauthorized: false } // Vercel / Neon / Render
      : false
  });
}

pool = global.__pgPool;

// 🛑 Listener error Pool
pool.on("error", (err) => {
  console.error("🔥 PostgreSQL idle client error:", err.message);
});

// 🧪 Test koneksi awal (lebih cepat dari pool.connect())
(async () => {
  try {
    await pool.query("SELECT 1");
    if (!isProd) console.log("✅ PostgreSQL connected (dev)");
    else console.log("🚀 PostgreSQL connected (production)");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed!");
    console.error("Detail:", err.message);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};