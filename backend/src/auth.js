
const crypto = require("crypto");
const { prisma } = require("./prisma");

const COOKIE_NAME = process.env.COOKIE_NAME || "pctcup_session";

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function requireUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not logged in" });

  const tokenHash = sha256(token);
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session) return res.status(401).json({ error: "Invalid session" });

  if (new Date(session.expiresAt) < new Date()) {
    await prisma.session.delete({ where: { tokenHash } });
    return res.status(401).json({ error: "Session expired" });
  }

  req.user = session.user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
  next();
}

module.exports = { COOKIE_NAME, sha256, randomToken, requireUser, requireAdmin };
