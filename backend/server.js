// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const db = require('./db'); // Auto-connect database

// Route Imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const tasksRoutes = require('./routes/tasks');
const userRoutes = require('./routes/user');
const forgotRoutes = require('./routes/forgot');
const financeRoutes = require('./routes/finance');
const roadmapRoutes = require('./routes/roadmap');
const habitRoutes = require('./routes/habit');
const ipRoutes = require('./routes/ip');

const app = express();

// Required for hosting platforms (Railway, Render, Vercel Functions)
app.set("trust proxy", 1);

// Middleware
app.use(cors({
  origin: '*', // ubah ke domain frontend kamu jika ingin aman
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" })); // Anti payload besar

// Helmet security
app.use(helmet());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: "deny" }));
app.use(helmet.hsts({ maxAge: 31536000 })); // 1 tahun

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." }
});
app.use("/api/", apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/user', userRoutes);
app.use('/api/forgot', forgotRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/ip', ipRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// JSON error handler (misal JSON rusak)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error"
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔻 Shutting down server...");
  try {
    await db.pool.end();
    console.log("Database pool closed.");
  } catch (e) {
    console.error("Error closing DB pool:", e);
  }
  process.exit(0);
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});