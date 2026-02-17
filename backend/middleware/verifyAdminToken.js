// middleware/verifyAdminToken.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ message: "Token tidak ditemukan." });

    const parts = authHeader.split(" ");
    const token = parts.length === 2 ? parts[1] : authHeader;

    if (!token)
      return res.status(401).json({ message: "Token tidak valid." });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err)
        return res.status(403).json({ message: "Token salah atau kedaluwarsa." });

      // Must be admin
      if (!decoded || decoded.role !== "admin")
        return res.status(403).json({ message: "Akses admin ditolak." });

      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };

      next();
    });

  } catch (err) {
    console.error("verifyAdminToken error:", err);
    return res.status(500).json({ message: "Admin token verification error." });
  }
}

module.exports = verifyAdminToken;