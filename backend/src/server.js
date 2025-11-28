require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const { prisma } = require("./prisma");
const {
  COOKIE_NAME,
  sha256,
  randomToken,
  requireUser,
  requireAdmin,
} = require("./auth");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));

// ---------- AUTH ----------
app.post("/auth/login", async (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad input" });

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = randomToken();
  const tokenHash = sha256(token);

  // 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true in production (https)
    expires: expiresAt,
  });

  res.json({ ok: true });
});

app.post("/auth/logout", requireUser, async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/me", requireUser, async (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    classType: u.classType,
    teamId: u.teamId,
  });
});

// ---------- CORE COMPUTE HELPERS ----------
async function getNextCheckpoint() {
  const now = new Date();
  return prisma.checkpoint.findFirst({
    where: { endDate: { gte: now } },
    orderBy: { endDate: "asc" },
  });
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { id: "asc" } });
}

async function getCheckpoint(checkpointNumber) {
  return prisma.checkpoint.findUnique({ where: { number: checkpointNumber } });
}

async function requiredMap(checkpointId) {
  const reqs = await prisma.requirement.findMany({
    where: { checkpointId },
    include: { category: true },
  });
  // key: `${classType}:${categoryId}` -> required
  const map = new Map();
  for (const r of reqs) map.set(`${r.classType}:${r.categoryId}`, r.required);
  return map;
}

async function completedByCategoryForUser(userId, checkpointEnd) {
  // counts attended events up to checkpointEnd
  const rows = await prisma.attendance.findMany({
    where: {
      userId,
      present: true,
      event: { startsAt: { lte: checkpointEnd } },
    },
    include: { event: true },
  });

  // categoryId -> { count, serviceHoursSum }
  const map = new Map();
  for (const a of rows) {
    const cid = a.event.categoryId;
    const entry = map.get(cid) || { count: 0, service: 0 };
    entry.count += 1;
    entry.service += a.event.serviceHours || 0;
    map.set(cid, entry);
  }
  return map;
}

async function remainingOppsByCategory(checkpointEnd) {
  const now = new Date();

  // include the whole checkpoint end day (prevents “endDate at midnight” bugs)
  const end = new Date(checkpointEnd);
  end.setHours(23, 59, 59, 999);

  // if we're already past the checkpoint, there are 0 remaining opportunities
  if (now > end) return new Map();

  const future = await prisma.event.findMany({
    where: { startsAt: { gt: now, lte: end } },
    select: { categoryId: true },
  });

  const map = new Map();
  for (const e of future) map.set(e.categoryId, (map.get(e.categoryId) || 0) + 1);
  return map;
}

async function resolveCheckpointNumber(raw) {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;

  const now = new Date();

  const next = await prisma.checkpoint.findFirst({
    where: { endDate: { gte: now } },
    orderBy: { number: "asc" },
  });
  if (next) return next.number;

  const last = await prisma.checkpoint.findFirst({
    orderBy: { number: "desc" },
  });
  return last?.number ?? 1;
}

async function resolveNextCheckpoint() {
  const now = new Date();

  const next = await prisma.checkpoint.findFirst({
    where: { endDate: { gte: now } },
    orderBy: { number: "asc" },
  });
  if (next) return next;

  // fallback: last checkpoint if all are past
  const last = await prisma.checkpoint.findFirst({
    orderBy: { number: "desc" },
  });
  return last;
}

async function completedByCategoryForUser(userId, checkpointEnd) {
  const rows = await prisma.attendance.findMany({
    where: {
      userId,
      present: true,
      event: { startsAt: { lte: checkpointEnd } },
    },
    include: { event: true },
  });

  const map = new Map(); // categoryId -> { count, service }
  for (const a of rows) {
    const cid = a.event.categoryId;
    const entry = map.get(cid) || { count: 0, service: 0 };
    entry.count += 1;
    entry.service += (a.event.serviceHours || 0);
    map.set(cid, entry);
  }
  return map;
}

async function requiredMap(checkpointId) {
  const reqs = await prisma.requirement.findMany({
    where: { checkpointId },
    include: { category: true },
  });
  const map = new Map(); // `${classType}:${categoryId}` -> required
  for (const r of reqs) map.set(`${r.classType}:${r.categoryId}`, r.required);
  return map;
}

function doesUserMeetCheckpoint({ cats, reqsMap, classType, completedMap }) {
  for (const c of cats) {
    const required = reqsMap.get(`${classType}:${c.id}`) ?? 0;
    const entry = completedMap.get(c.id) || { count: 0, service: 0 };
    const completed = (c.key === "SERVICE") ? entry.service : entry.count;
    if (completed < required) return false;
  }
  return true;
}

// ---------- BULK ATTENDANCE AGGREGATION (perf: avoid N+1) ----------
/**
 * Returns a Map:
 *   userId -> Map(categoryId -> { count, service })
 */
async function completedByCategoryForUsers(userIds, checkpointEnd) {
  const rows = await prisma.attendance.findMany({
    where: {
      userId: { in: userIds },
      present: true,
      event: { startsAt: { lte: checkpointEnd } },
    },
    select: {
      userId: true,
      event: { select: { categoryId: true, serviceHours: true } },
    },
  });

  const byUser = new Map();
  for (const r of rows) {
    let byCat = byUser.get(r.userId);
    if (!byCat) {
      byCat = new Map();
      byUser.set(r.userId, byCat);
    }

    const cid = r.event.categoryId;
    const entry = byCat.get(cid) || { count: 0, service: 0 };
    entry.count += 1;
    entry.service += r.event.serviceHours || 0;
    byCat.set(cid, entry);
  }

  return byUser;
}

// ---------- DASHBOARD: ME ----------
app.get("/dashboard/me", requireUser, async (req, res) => {
  const requested = req.query.checkpoint ? Number(req.query.checkpoint) : null;

  const cp = requested
    ? await prisma.checkpoint.findUnique({ where: { number: requested } })
    : await getNextCheckpoint();

  if (!cp) return res.status(404).json({ error: "No upcoming checkpoint found" });

  const cpEnd = endOfDay(cp.endDate);

  const cats = await getCategories();
  const reqs = await requiredMap(cp.id);
  const completedMap = await completedByCategoryForUser(req.user.id, cpEnd);
  const oppsMap = await remainingOppsByCategory(cpEnd); // make sure this uses cpEnd and end-of-day

  // (same mapping as before...)
  const out = cats.map((c) => {
    const required = reqs.get(`${req.user.classType}:${c.id}`) ?? 0;
    const completedEntry = completedMap.get(c.id) || { count: 0, service: 0 };
    const completed = c.key === "SERVICE" ? completedEntry.service : completedEntry.count;

    const remainingNeeded = Math.max(required - completed, 0);
    const remainingOpportunities = oppsMap.get(c.id) || 0;

    return {
      categoryKey: c.key,
      categoryName: c.name,
      color: c.color,
      completed,
      required,
      remainingNeeded,
      remainingOpportunities,
      met: remainingNeeded === 0,
    };
  });

  res.json({
    user: { firstName: req.user.firstName, lastName: req.user.lastName, teamId: req.user.teamId },
    checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate },
    categories: out,
  });
});


// ---------- DASHBOARD: TEAM (totals + status only) ----------
app.get("/dashboard/team", requireUser, async (req, res) => {
  const checkpointNumber = await resolveCheckpointNumber(req.query.checkpoint);
  const cp = await getCheckpoint(checkpointNumber);
  if (!cp) return res.status(404).json({ error: "Checkpoint not found" });

  const now = new Date();
  const checkpointPassed = now > cp.endDate;

  const cats = await getCategories();
  const reqs = await requiredMap(cp.id);

  const teammates = await prisma.user.findMany({
    where: { teamId: req.user.teamId },
    select: { id: true, firstName: true, lastName: true, classType: true, username: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const members = [];
  for (const tm of teammates) {
    const completedMap = await completedByCategoryForUser(tm.id, cp.endDate);

    const perCategory = cats.map((c) => {
      const required = reqs.get(`${tm.classType}:${c.id}`) ?? 0;
      const completedEntry = completedMap.get(c.id) || { count: 0, service: 0 };
      const completed = (c.key === "SERVICE") ? completedEntry.service : completedEntry.count;

      const remainingNeeded = Math.max(required - completed, 0);

      const status =
        remainingNeeded === 0
          ? (checkpointPassed ? "MET" : "COMPLETE")
          : (checkpointPassed ? "OFF_TRACK" : "IN_PROGRESS");

      return { categoryKey: c.key, completed, required, status };
    });

    members.push({
      username: tm.username,
      name: `${tm.firstName} ${tm.lastName}`,
      perCategory,
    });
  }

  res.json({
    checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate, passed: checkpointPassed },
    teamId: req.user.teamId,
    members,
  });
});


// ---------- SCHEDULE ----------
app.get("/schedule", requireUser, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    include: { category: true },
    orderBy: { startsAt: "asc" },
  });

  res.json(
    events.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      categoryKey: e.category.key,
      categoryName: e.category.name,
      color: e.category.color,
      mandatory: e.mandatory,
      serviceHours: e.serviceHours,
    }))
  );
});

// ---------- ADMIN: ROSTER ----------
app.get("/admin/roster", requireUser, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "BRO" },
    select: { id: true, firstName: true, lastName: true, username: true, teamId: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      name: `${u.firstName} ${u.lastName}`,
      teamId: u.teamId,
    }))
  );
});

// ---------- ADMIN: EVENTS ----------
app.post("/admin/events", requireUser, requireAdmin, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    startsAt: z.string().min(1),
    categoryKey: z.enum([
      "CHAPTER",
      "RUSH",
      "INTERNAL",
      "CORPORATE",
      "PLEDGE",
      "SERVICE",
      "CASUAL",
    ]),
    serviceHours: z.union([z.number(), z.string()]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad input" });

  const { title, startsAt, categoryKey, serviceHours } = parsed.data;

  const category = await prisma.category.findUnique({ where: { key: categoryKey } });
  if (!category) return res.status(400).json({ error: "Invalid categoryKey" });

  const mandatory = categoryKey === "INTERNAL"; // 👈 HARDENED RULE

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return res.status(400).json({ error: "Invalid startsAt" });
  }

  const event = await prisma.event.create({
    data: {
      title,
      startsAt: startsAtDate,
      categoryId: category.id,
      mandatory,
      serviceHours:
        categoryKey === "SERVICE"
          ? Math.max(1, parseInt(String(serviceHours ?? "1"), 10))
          : null,
    },
    include: { category: true },
  });

  res.json(event);
});

app.get("/admin/events", requireUser, requireAdmin, async (req, res) => {
  const events = await prisma.event.findMany({
    include: { category: true },
    orderBy: { startsAt: "asc" },
  });
  res.json(events);
});

app.delete("/admin/events/:id", requireUser, requireAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Bad event id" });

  await prisma.attendance.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });

  res.json({ ok: true });
});


// ---------- ADMIN: ATTENDANCE (load) ----------
app.get("/admin/events/:id/attendance", requireUser, requireAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Bad event id" });

  const exists = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!exists) return res.status(404).json({ error: "Event not found" });

  const rows = await prisma.attendance.findMany({
    where: { eventId, present: true },
    select: { userId: true },
  });

  res.json({
    eventId,
    presentUserIds: rows.map((r) => r.userId),
  });
});

// ---------- ADMIN: ATTENDANCE (checkbox save) ----------
app.post("/admin/events/:id/attendance", requireUser, requireAdmin, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Bad event id" });

  const schema = z.object({
    presentUserIds: z.array(z.number().int()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad input" });

  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "Event not found" });

  // Replace attendance for event
  await prisma.attendance.deleteMany({ where: { eventId } });

  const data = parsed.data.presentUserIds.map((userId) => ({
    eventId,
    userId,
    present: true,
  }));
  if (data.length) await prisma.attendance.createMany({ data });

  res.json({ ok: true, count: data.length });
});

// ---------- ADMIN: ALERTS ----------
app.get("/admin/alerts", requireUser, requireAdmin, async (req, res) => {
  const checkpoint = Number(req.query.checkpoint || 1);
  const cp = await getCheckpoint(checkpoint);
  if (!cp) return res.status(404).json({ error: "Checkpoint not found" });

  const cats = await getCategories();
  const reqs = await requiredMap(cp.id);
  const oppsMap = await remainingOppsByCategory(cp.endDate);

  const users = await prisma.user.findMany({
    where: { role: "BRO" },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      teamId: true,
      classType: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const userIds = users.map((u) => u.id);
  const completedByUser = await completedByCategoryForUsers(userIds, cp.endDate);

  const alerts = [];
  for (const u of users) {
    const completedMap = completedByUser.get(u.id) || new Map();

    for (const c of cats) {
      const required = reqs.get(`${u.classType}:${c.id}`) ?? 0;
      const completedEntry = completedMap.get(c.id) || { count: 0, service: 0 };
      const completed = c.key === "SERVICE" ? completedEntry.service : completedEntry.count;

      const remainingNeeded = Math.max(required - completed, 0);
      if (remainingNeeded === 0) continue;

      const remainingOpportunities = oppsMap.get(c.id) || 0;
      const status = remainingNeeded <= remainingOpportunities ? "AT_RISK" : "OFF_TRACK";

      alerts.push({
        username: u.username,
        name: `${u.firstName} ${u.lastName}`,
        teamId: u.teamId,
        categoryKey: c.key,
        remainingNeeded,
        remainingOpportunities,
        status,
      });
    }
  }

  res.json({ checkpoint: { number: cp.number, label: cp.label }, alerts });
});

// ---------- LEADERBOARD ----------
app.get("/leaderboard", requireUser, async (req, res) => {
  const checkpoint = Number(req.query.checkpoint || 1);
  const cp = await getCheckpoint(checkpoint);
  if (!cp) return res.status(404).json({ error: "Checkpoint not found" });

  const cats = await getCategories();
  const reqs = await requiredMap(cp.id);

  const users = await prisma.user.findMany({
    where: { role: "BRO" },
    select: { id: true, firstName: true, lastName: true, username: true, teamId: true, classType: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const userIds = users.map(u => u.id);
  const completedByUser = await completedByCategoryForUsers(userIds, cp.endDate);

  // Score = sum over categories of min(completed/required, 1)
  const rows = users.map((u) => {
    const completedMap = completedByUser.get(u.id) || new Map();
    let score = 0;
    let onTrack = 0;

    for (const c of cats) {
      const required = reqs.get(`${u.classType}:${c.id}`) ?? 0;
      if (required <= 0) { onTrack += 1; score += 1; continue; }

      const ce = completedMap.get(c.id) || { count: 0, service: 0 };
      const completed = c.key === "SERVICE" ? ce.service : ce.count;

      const ratio = Math.min(completed / required, 1);
      score += ratio;
      if (ratio >= 1) onTrack += 1;
    }

    return {
      username: u.username,
      name: `${u.firstName} ${u.lastName}`,
      teamId: u.teamId,
      score: Number(score.toFixed(3)),
      onTrack,
    };
  });

  rows.sort((a, b) => b.score - a.score || b.onTrack - a.onTrack || a.name.localeCompare(b.name));

  res.json({
    checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate },
    leaderboard: rows.map((r, i) => ({ rank: i + 1, ...r })),
  });
});

app.get("/leaderboard/teams", requireUser, async (req, res) => {
  const cp = await resolveNextCheckpoint();
  if (!cp) return res.status(404).json({ error: "No checkpoints found" });

  const cats = await prisma.category.findMany({ orderBy: { id: "asc" } });
  const reqsMap = await requiredMap(cp.id);

  // all bros (exclude admins)
  const bros = await prisma.user.findMany({
    where: { role: "BRO" },
    select: { id: true, teamId: true, classType: true, firstName: true, lastName: true },
  });

  // group by teamId
  const byTeam = new Map();
  for (const b of bros) {
    if (!b.teamId) continue;
    if (!byTeam.has(b.teamId)) byTeam.set(b.teamId, []);
    byTeam.get(b.teamId).push(b);
  }

  const teams = [];
  for (const [teamId, members] of byTeam.entries()) {
    let metCount = 0;

    for (const m of members) {
      const completedMap = await completedByCategoryForUser(m.id, cp.endDate);
      const met = doesUserMeetCheckpoint({
        cats,
        reqsMap,
        classType: m.classType,
        completedMap,
      });
      if (met) metCount += 1;
    }

    teams.push({
      teamId,
      metCount,
      teamSize: members.length,
      pct: members.length ? metCount / members.length : 0,
    });
  }

  teams.sort((a, b) => (b.metCount - a.metCount) || (b.pct - a.pct) || (a.teamId - b.teamId));

  res.json({
    checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate },
    teams,
  });
});

// ---------- LEADERBOARD: MY TEAM DETAILS (next checkpoint) ----------
app.get("/leaderboard/my-team", requireUser, async (req, res) => {
  const cp = await resolveNextCheckpoint();
  if (!cp) return res.status(404).json({ error: "No checkpoints found" });

  if (!req.user.teamId) {
    return res.json({
      checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate },
      teamId: null,
      members: [],
    });
  }

  const cats = await prisma.category.findMany({ orderBy: { id: "asc" } });
  const reqsMap = await requiredMap(cp.id);

  const members = await prisma.user.findMany({
    where: { teamId: req.user.teamId, role: "BRO" },
    select: { id: true, firstName: true, lastName: true, classType: true, username: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const out = [];
  for (const m of members) {
    const completedMap = await completedByCategoryForUser(m.id, cp.endDate);

    const missing = [];
    for (const c of cats) {
      const required = reqsMap.get(`${m.classType}:${c.id}`) ?? 0;
      const entry = completedMap.get(c.id) || { count: 0, service: 0 };
      const completed = (c.key === "SERVICE") ? entry.service : entry.count;

      const remainingNeeded = Math.max(required - completed, 0);
      if (remainingNeeded > 0) {
        missing.push({
          categoryKey: c.key,
          categoryName: c.name,
          remainingNeeded,
          unit: c.key === "SERVICE" ? "hrs" : "events",
        });
      }
    }

    out.push({
      username: m.username,
      name: `${m.firstName} ${m.lastName}`,
      metAll: missing.length === 0,
      missing,
    });
  }

  res.json({
    checkpoint: { number: cp.number, label: cp.label, endDate: cp.endDate },
    teamId: req.user.teamId,
    members: out,
  });
});

import path from "path";
import express from "express";

const __dirname = path.resolve();
const brosDist = path.join(__dirname, "..", "frontend", "dist");

app.use(express.static(brosDist));

// SPA fallback (so refresh on /dashboard works)
app.get("*", (req, res) => {
  res.sendFile(path.join(brosDist, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
