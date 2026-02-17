// middleware/verifyToken.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Tidak ada header Authorization
    if (!authHeader)
      return res.status(401).json({ message: "Token tidak ditemukan." });

    // Format harus "Bearer <token>"
    const parts = authHeader.split(" ");
    const token = parts.length === 2 ? parts[1] : authHeader;

    if (!token)
      return res.status(401).json({ message: "Token tidak valid." });

    // Verify JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err)
        return res.status(403).json({ message: "Token salah atau kedaluwarsa." });

      // Tempel data user ke req
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };

      next();
    });

  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ message: "Token verification error." });
  }
}

module.exports = verifyToken;