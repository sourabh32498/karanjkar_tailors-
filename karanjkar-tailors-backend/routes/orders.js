const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const { customer_id } = req.query;
  let sql = `
    SELECT
      o.*,
      c.name AS customer_name,
      c.phone AS customer_phone,
      GREATEST(IFNULL(o.price, 0) - IFNULL(o.paid_amount, 0), 0) AS due_amount
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
  `;
  const params = [];

  if (customer_id) {
    sql += " WHERE o.customer_id = ?";
    params.push(customer_id);
  }

  sql += " ORDER BY o.id DESC";

  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { customer_id, dress_type, price, trial_date, delivery_date, status, paid_amount, payment_mode, payment_date } = req.body || {};
  const cleanDressType = String(dress_type || "").trim();
  const cleanTrialDate = String(trial_date || "").trim() || null;
  const cleanDate = String(delivery_date || "").trim();
  const cleanStatus = String(status || "").trim() || "Pending";
  const cleanPaymentMode = String(payment_mode || "").trim() || null;
  const cleanPaymentDate = String(payment_date || "").trim() || null;
  const parsedCustomerId = Number(customer_id);
  const parsedPrice = Number(price);
  const parsedPaidAmount = paid_amount === undefined || paid_amount === null || paid_amount === ""
    ? 0
    : Number(paid_amount);

  if (!parsedCustomerId || !cleanDressType || Number.isNaN(parsedPrice) || !cleanDate || Number.isNaN(parsedPaidAmount)) {
    return res.status(400).json({ message: "customer_id, dress_type, price and delivery_date are required" });
  }
  if (parsedPaidAmount < 0) {
    return res.status(400).json({ message: "paid_amount cannot be negative" });
  }
  if (parsedPaidAmount > parsedPrice) {
    return res.status(400).json({ message: "paid_amount cannot be greater than price" });
  }

  try {
    const [customerRows] = await db
      .promise()
      .query("SELECT id FROM customers WHERE id = ?", [parsedCustomerId]);
    if (!customerRows.length) {
      return res.status(400).json({ message: "Invalid customer_id. Add customer first." });
    }

    const [result] = await db.promise().query(
      "INSERT INTO orders (customer_id, dress_type, price, paid_amount, trial_date, delivery_date, status, payment_mode, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        parsedCustomerId,
        cleanDressType,
        parsedPrice,
        parsedPaidAmount,
        cleanTrialDate,
        cleanDate,
        cleanStatus,
        cleanPaymentMode,
        cleanPaymentDate
      ]
    );

    res.status(201).json({ message: "Order Added", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_TRUNCATED_WRONG_VALUE" || err.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
      return res.status(400).json({ message: "Invalid date or numeric value", error: err.message });
    }
    res.status(500).json({ message: "Failed to add order", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  const { customer_id, dress_type, price, trial_date, delivery_date, status, paid_amount, payment_mode, payment_date } = req.body || {};
  const cleanDressType = String(dress_type || "").trim();
  const cleanTrialDate = String(trial_date || "").trim() || null;
  const cleanDate = String(delivery_date || "").trim();
  const cleanStatus = String(status || "").trim() || "Pending";
  const cleanPaymentMode = String(payment_mode || "").trim() || null;
  const cleanPaymentDate = String(payment_date || "").trim() || null;
  const parsedCustomerId = Number(customer_id);
  const parsedPrice = Number(price);
  const parsedPaidAmount = paid_amount === undefined || paid_amount === null || paid_amount === ""
    ? 0
    : Number(paid_amount);

  if (!orderId || !parsedCustomerId || !cleanDressType || Number.isNaN(parsedPrice) || !cleanDate || Number.isNaN(parsedPaidAmount)) {
    return res.status(400).json({ message: "id, customer_id, dress_type, price and delivery_date are required" });
  }
  if (parsedPaidAmount < 0) {
    return res.status(400).json({ message: "paid_amount cannot be negative" });
  }
  if (parsedPaidAmount > parsedPrice) {
    return res.status(400).json({ message: "paid_amount cannot be greater than price" });
  }

  try {
    const [customerRows] = await db
      .promise()
      .query("SELECT id FROM customers WHERE id = ?", [parsedCustomerId]);
    if (!customerRows.length) {
      return res.status(400).json({ message: "Invalid customer_id. Add customer first." });
    }

    const [result] = await db.promise().query(
      "UPDATE orders SET customer_id = ?, dress_type = ?, price = ?, paid_amount = ?, trial_date = ?, delivery_date = ?, status = ?, payment_mode = ?, payment_date = ? WHERE id = ?",
      [
        parsedCustomerId,
        cleanDressType,
        parsedPrice,
        parsedPaidAmount,
        cleanTrialDate,
        cleanDate,
        cleanStatus,
        cleanPaymentMode,
        cleanPaymentDate,
        orderId
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order Updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const orderId = Number(req.params.id);
  if (!orderId) {
    return res.status(400).json({ message: "Valid id is required" });
  }

  try {
    const [result] = await db.promise().query("DELETE FROM orders WHERE id = ?", [orderId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete order", error: err.message });
  }
});

module.exports = router;
