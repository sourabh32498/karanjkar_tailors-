const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM customers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customers", error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name, phone, address } = req.body;
  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").trim();
  const cleanAddress = String(address || "").trim();

  if (!cleanName || !cleanPhone || !cleanAddress) {
    return res.status(400).json({ message: "name, phone and address are required" });
  }

  try {
    const [result] = await db
      .promise()
      .query("INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)", [
        cleanName,
        cleanPhone,
        cleanAddress
      ]);

    res.status(201).json({ message: "Customer Added", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Failed to add customer", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const customerId = Number(req.params.id);
  const { name, phone, address } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").trim();
  const cleanAddress = String(address || "").trim();

  if (!customerId || !cleanName || !cleanPhone || !cleanAddress) {
    return res.status(400).json({ message: "id, name, phone and address are required" });
  }

  try {
    const [result] = await db
      .promise()
      .query("UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?", [
        cleanName,
        cleanPhone,
        cleanAddress,
        customerId
      ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer Updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update customer", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const customerId = Number(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: "Valid id is required" });
  }

  try {
    const [result] = await db.promise().query("DELETE FROM customers WHERE id = ?", [customerId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json({ message: "Customer Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete customer", error: err.message });
  }
});

module.exports = router;
