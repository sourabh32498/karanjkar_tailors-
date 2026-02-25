const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

let initPromise = null;

async function ensureAdminAuthSetup() {
  if (!initPromise) {
    initPromise = (async () => {
      await db.promise().query(`
        CREATE TABLE IF NOT EXISTS admin (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NULL,
          password VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [hashCols] = await db.promise().query("SHOW COLUMNS FROM admin LIKE 'password_hash'");
      if (!hashCols.length) {
        await db.promise().query("ALTER TABLE admin ADD COLUMN password_hash VARCHAR(255) NULL AFTER username");
      }

      const [pwdCols] = await db.promise().query("SHOW COLUMNS FROM admin LIKE 'password'");
      if (!pwdCols.length) {
        await db.promise().query("ALTER TABLE admin ADD COLUMN password VARCHAR(255) NULL AFTER password_hash");
      }

      const [rows] = await db.promise().query(
        "SELECT id FROM admin WHERE username = ? LIMIT 1",
        [DEFAULT_ADMIN_USERNAME]
      );
      if (!rows.length) {
        const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
        await db.promise().query(
          "INSERT INTO admin (username, password_hash, password) VALUES (?, ?, NULL)",
          [DEFAULT_ADMIN_USERNAME, passwordHash]
        );
        console.log(`Seeded default admin user: ${DEFAULT_ADMIN_USERNAME}`);
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}

router.get("/ready", async (_req, res) => {
  try {
    await ensureAdminAuthSetup();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Auth setup failed", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  try {
    await ensureAdminAuthSetup();

    const [rows] = await db.promise().query(
      "SELECT id, username, password_hash, password FROM admin WHERE username = ? LIMIT 1",
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const admin = rows[0];
    let valid = false;

    if (admin.password_hash) {
      valid = await bcrypt.compare(password, admin.password_hash);
    } else if (admin.password) {
      valid = admin.password === password;
      if (valid) {
        const upgradedHash = await bcrypt.hash(password, 10);
        await db.promise().query(
          "UPDATE admin SET password_hash = ?, password = NULL WHERE id = ?",
          [upgradedHash, admin.id]
        );
      }
    }

    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { sub: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error", error: err.message });
  }
});

module.exports = router;
