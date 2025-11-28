// backend/prisma/seed.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function d(iso) {
  return new Date(iso);
}

// Adjust YEAR here if needed
const YEAR = 2026;

async function main() {
  // ---- Teams (1..8)
  for (let i = 1; i <= 8; i++) {
    await prisma.team.upsert({
      where: { name: `Team ${i}` },
      update: {},
      create: { name: `Team ${i}` },
    });
  }

  // ---- Categories (7)
  // NOTE: keys must match your CategoryKey enum values in schema.prisma
  const categories = [
    { key: "CHAPTER",    name: "Chapter Meetings",           color: "#EF4444" }, // red
    { key: "RUSH",       name: "Rush Events",                color: "#F97316" }, // orange
    { key: "INTERNAL",   name: "Mandatory Internal Events",  color: "#EAB308" }, // yellow
    { key: "CORPORATE",  name: "Corporate Events",           color: "#22C55E" }, // green
    { key: "PLEDGE",     name: "Pledge Meetings",            color: "#3B82F6" }, // blue
    { key: "SERVICE",    name: "Community Service Hours",    color: "#8B5CF6" }, // purple
    { key: "CASUAL",     name: "Casual Events",              color: "#EC4899" }, // pink
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, color: c.color },
      create: { key: c.key, name: c.name, color: c.color },
    });
  }

  // ---- Checkpoints (using your dated schedule)
  // If your Checkpoint model fields are named differently, adjust here.
  const checkpoints = [
    {
      number: 1,
      label: "Checkpoint 1",
      startDate: d(`${YEAR}-01-18T00:00:00.000Z`),
      endDate:   d(`${YEAR}-02-11T23:59:59.000Z`),
    },
    {
      number: 2,
      label: "Checkpoint 2",
      startDate: d(`${YEAR}-02-12T00:00:00.000Z`),
      endDate:   d(`${YEAR}-03-04T23:59:59.000Z`),
    },
    {
      number: 3,
      label: "Checkpoint 3",
      startDate: d(`${YEAR}-03-05T00:00:00.000Z`),
      endDate:   d(`${YEAR}-04-01T23:59:59.000Z`),
    },
    {
      number: 4,
      label: "Final",
      startDate: d(`${YEAR}-04-02T00:00:00.000Z`),
      endDate:   d(`${YEAR}-04-27T23:59:59.000Z`),
    },
  ];

  for (const cp of checkpoints) {
    await prisma.checkpoint.upsert({
      where: { number: cp.number },
      update: { label: cp.label, startDate: cp.startDate, endDate: cp.endDate },
      create: cp,
    });
  }

  // ---- Requirements (from your PCT CUP PDF tables)
  // Non-grad: Chapter 1/4/6/10, Rush 6/6/6/6, Internal 3/3/4/5, Corporate 0/1/2/2,
  // Pledge 0/2/4/5, Service 1/2/3/3, Casual 1/3/4/5 :contentReference[oaicite:2]{index=2}
  // Senior: Chapter 1/3/6/8, Rush 4/4/4/4, Internal 3/3/4/5, Corporate 0/1/1/1,
  // Pledge 0/1/2/3, Service 1/2/2/2, Casual 1/2/3/3 :contentReference[oaicite:3]{index=3}
  const nonGrad = {
    CHAPTER:   [1, 4, 6, 10],
    RUSH:      [6, 6, 6, 6],
    INTERNAL:  [3, 3, 4, 5],
    CORPORATE: [0, 1, 2, 2],
    PLEDGE:    [0, 2, 4, 5],
    SERVICE:   [1, 2, 3, 3],
    CASUAL:    [1, 3, 4, 5],
  };

  const senior = {
    CHAPTER:   [1, 3, 6, 8],
    RUSH:      [4, 4, 4, 4],
    INTERNAL:  [3, 3, 4, 5],
    CORPORATE: [0, 1, 1, 1],
    PLEDGE:    [0, 1, 2, 3],
    SERVICE:   [1, 2, 2, 2],
    CASUAL:    [1, 2, 3, 3],
  };

  const cps = await prisma.checkpoint.findMany({ orderBy: { number: "asc" } });
  const catRows = await prisma.category.findMany();
  const catIdByKey = Object.fromEntries(catRows.map(c => [c.key, c.id]));

  async function upsertReq(checkpointNumber, categoryKey, classType, required) {
    const cp = cps.find(x => x.number === checkpointNumber);
    const categoryId = catIdByKey[categoryKey];
    if (!cp || !categoryId) throw new Error(`Missing cp/category: cp=${checkpointNumber} cat=${categoryKey}`);

    // Assumes Requirement has @@unique([checkpointId, categoryId, classType])
    await prisma.requirement.upsert({
      where: {
        checkpointId_categoryId_classType: {
          checkpointId: cp.id,
          categoryId,
          classType,
        },
      },
      update: { required },
      create: { checkpointId: cp.id, categoryId, classType, required },
    });
  }

  for (const [key, arr] of Object.entries(nonGrad)) {
    for (let i = 0; i < 4; i++) await upsertReq(i + 1, key, "NON_GRAD", arr[i]);
  }
  for (const [key, arr] of Object.entries(senior)) {
    for (let i = 0; i < 4; i++) await upsertReq(i + 1, key, "SENIOR", arr[i]);
  }

  // ---- Admin user: username "admin"
  const adminPassword = process.env.ADMIN_PASSWORD || "password";
  const hash = await bcrypt.hash(adminPassword, 10);

  const team1 = await prisma.team.findUnique({ where: { name: "Team 1" } });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "ADMIN", passwordHash: hash, teamId: team1.id, classType: "NON_GRAD", firstName: "Admin", lastName: "User" },
    create: {
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      classType: "NON_GRAD",
      teamId: team1.id,
      passwordHash: hash,
    },
  });

  console.log("✅ Seed complete: teams, categories, checkpoints, requirements, admin user");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
