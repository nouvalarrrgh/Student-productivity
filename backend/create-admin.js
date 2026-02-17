// create-admin.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./db");

(async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const username = process.env.ADMIN_USERNAME || "admin";

    if (!email || !password) {
      console.error("❌ ADMIN_EMAIL dan ADMIN_PASSWORD wajib di-set di .env");
      process.exit(1);
    }

    // Cek sudah ada admin atau belum
    const exists = await db.query(
      `SELECT id FROM users WHERE email=$1 OR username=$2`,
      [email, username]
    );

    if (exists.rows.length > 0) {
      console.log("⚠️ Admin sudah ada. Tidak dibuat ulang.");
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 12);

    await db.query(
      `INSERT INTO users (username, email, password, role, points)
       VALUES ($1,$2,$3,'admin',0)`,
      [username, email, hashed]
    );

    console.log(`✅ Admin berhasil dibuat: ${username} (${email})`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Error create-admin:", err);
    process.exit(1);
  }
})();