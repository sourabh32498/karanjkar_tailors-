const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const { customer_id } = req.query;
  let sql = "SELECT * FROM measurements";
  const params = [];

  if (customer_id) {
    sql += " WHERE customer_id = ?";
    params.push(customer_id);
  }

  sql += " ORDER BY id DESC";

  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch measurements", error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { customer_id, chest, waist, shoulder, length } = req.body || {};
  const parsedCustomerId = Number(customer_id);
  const parsedChest = Number(chest);
  const parsedWaist = Number(waist);
  const parsedShoulder = Number(shoulder);
  const parsedLength = Number(length);

  if (
    !parsedCustomerId ||
    Number.isNaN(parsedChest) ||
    Number.isNaN(parsedWaist) ||
    Number.isNaN(parsedShoulder) ||
    Number.isNaN(parsedLength)
  ) {
    return res.status(400).json({ message: "customer_id, chest, waist, shoulder and length are required" });
  }

  try {
    const [customerRows] = await db
      .promise()
      .query("SELECT id FROM customers WHERE id = ?", [parsedCustomerId]);
    if (!customerRows.length) {
      return res.status(400).json({ message: "Invalid customer_id. Add customer first." });
    }

    const [result] = await db.promise().query(
      "INSERT INTO measurements (customer_id, chest, waist, shoulder, length) VALUES (?, ?, ?, ?, ?)",
      [parsedCustomerId, parsedChest, parsedWaist, parsedShoulder, parsedLength]
    );
    res.status(201).json({ message: "Measurement Added", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Failed to add measurement", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const measurementId = Number(req.params.id);
  const { customer_id, chest, waist, shoulder, length } = req.body || {};
  const parsedCustomerId = Number(customer_id);
  const parsedChest = Number(chest);
  const parsedWaist = Number(waist);
  const parsedShoulder = Number(shoulder);
  const parsedLength = Number(length);

  if (
    !measurementId ||
    !parsedCustomerId ||
    Number.isNaN(parsedChest) ||
    Number.isNaN(parsedWaist) ||
    Number.isNaN(parsedShoulder) ||
    Number.isNaN(parsedLength)
  ) {
    return res.status(400).json({ message: "id, customer_id, chest, waist, shoulder and length are required" });
  }

  try {
    const [customerRows] = await db
      .promise()
      .query("SELECT id FROM customers WHERE id = ?", [parsedCustomerId]);
    if (!customerRows.length) {
      return res.status(400).json({ message: "Invalid customer_id. Add customer first." });
    }

    const [result] = await db.promise().query(
      "UPDATE measurements SET customer_id = ?, chest = ?, waist = ?, shoulder = ?, length = ? WHERE id = ?",
      [parsedCustomerId, parsedChest, parsedWaist, parsedShoulder, parsedLength, measurementId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Measurement not found" });
    }

    res.json({ message: "Measurement Updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update measurement", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const measurementId = Number(req.params.id);
  if (!measurementId) {
    return res.status(400).json({ message: "Valid id is required" });
  }

  try {
    const [result] = await db.promise().query("DELETE FROM measurements WHERE id = ?", [measurementId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Measurement not found" });
    }
    res.json({ message: "Measurement Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete measurement", error: err.message });
  }
});

module.exports = router;
