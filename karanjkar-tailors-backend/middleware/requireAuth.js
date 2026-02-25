const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";

module.exports = function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Invalid authorization token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
