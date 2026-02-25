const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");
const requireAuth = require("./middleware/requireAuth");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...FRONTEND_ORIGINS
];

const app = express();
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl/postman) and same-origin server calls.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "karanjkar-tailors-backend" });
});

app.get("/health", async (_req, res) => {
  try {
    await db.promise().query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/auth", require("./routes/auth"));
app.use("/customers", requireAuth, require("./routes/customers"));
app.use("/measurements", requireAuth, require("./routes/measurements"));
app.use("/orders", requireAuth, require("./routes/orders"));

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON payload", error: err.message });
  }
  if (err) {
    return res.status(err.status || 500).json({ message: "Server error", error: err.message });
  }
  next();
});

async function ensureOrdersPaymentColumns() {
  const checks = [
    {
      name: "paid_amount",
      ddl: "ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price"
    },
    {
      name: "payment_mode",
      ddl: "ALTER TABLE orders ADD COLUMN payment_mode VARCHAR(30) NULL AFTER status"
    },
    {
      name: "payment_date",
      ddl: "ALTER TABLE orders ADD COLUMN payment_date DATE NULL AFTER payment_mode"
    },
    {
      name: "trial_date",
      ddl: "ALTER TABLE orders ADD COLUMN trial_date DATE NULL AFTER paid_amount"
    }
  ];

  for (const check of checks) {
    const [rows] = await db.promise().query("SHOW COLUMNS FROM orders LIKE ?", [check.name]);
    if (!rows.length) {
      await db.promise().query(check.ddl);
      console.log(`Added missing column: orders.${check.name}`);
    }
  }
}

async function start() {
  try {
    await db.promise().query("SELECT 1");
    await ensureOrdersPaymentColumns();
    console.log("MySQL Connected");
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    process.exit(1);
  }
}

start();
