require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
const DEFAULT_BRO_PASSWORD = process.env.DEFAULT_BRO_PASSWORD || "password";

// ---- Helpers ----
function mustReadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function seedCategories() {
  const categories = [
    { key: "CHAPTER", name: "Chapter", color: "#007AFF" },
    { key: "RUSH", name: "Rush", color: "#FF9500" },
    { key: "INTERNAL", name: "Internal", color: "#AF52DE" },
    { key: "CORPORATE", name: "Corporate", color: "#34C759" },
    { key: "PLEDGE", name: "Pledge", color: "#5856D6" },
    { key: "SERVICE", name: "Service", color: "#FF3B30" },
    { key: "CASUAL", name: "Casual", color: "#9FB0D0" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, color: c.color },
      create: c,
    });
  }
  console.log("✅ categories seeded");
}

async function seedCheckpoints() {
  // IMPORTANT: your schema requires startDate + endDate.
  // Edit these later if you want different checkpoint windows.
  const checkpoints = [
    { number: 1, label: "Checkpoint 1", startDate: "2026-01-01", endDate: "2026-01-31" },
    { number: 2, label: "Checkpoint 2", startDate: "2026-02-01", endDate: "2026-03-31" },
    { number: 3, label: "Checkpoint 3", startDate: "2026-04-01", endDate: "2026-05-31" },
    { number: 4, label: "Checkpoint 4", startDate: "2026-06-01", endDate: "2026-08-31" },
  ];

  for (const cp of checkpoints) {
    const startDate = new Date(cp.startDate + "T00:00:00.000Z");
    const endDate = new Date(cp.endDate + "T00:00:00.000Z");

    await prisma.checkpoint.upsert({
      where: { number: cp.number },
      update: { label: cp.label, startDate, endDate },
      create: { number: cp.number, label: cp.label, startDate, endDate },
    });
  }

  console.log("✅ checkpoints seeded (startDate+endDate)");
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Your schema requires classType even for admin.
  // Pick ANY valid enum value; SENIOR is common in your app.
  const adminClassType = "SENIOR";

  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
      teamId: null,
      classType: adminClassType,
    },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
      teamId: null,
      classType: adminClassType,
    },
  });

  console.log(`✅ admin seeded (username=${ADMIN_USERNAME}, password=${ADMIN_PASSWORD})`);
}

async function seedRosterFromJson() {
  // Put roster.json here: backend/scripts/roster.json
  const rosterPath = path.join(__dirname, "roster.json");
  const roster = mustReadJson(rosterPath);

  const passwordHash = await bcrypt.hash(DEFAULT_BRO_PASSWORD, 10);

  // Ensure teams exist.
  // If your roster contains teamId up to some max, create all of them.
  const maxTeamId = roster.reduce((m, u) => Math.max(m, u.teamId || 0), 0);
  for (let i = 1; i <= maxTeamId; i++) {
    await prisma.team.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Team ${i}` },
    });
  }

  // Upsert users
  for (const u of roster) {
    // Defensive: ensure required fields exist
    if (!u.username) throw new Error(`Roster row missing username: ${JSON.stringify(u)}`);
    if (!u.firstName || !u.lastName) throw new Error(`Roster row missing name for ${u.username}`);
    if (!u.role) throw new Error(`Roster row missing role for ${u.username}`);
    if (!u.classType) throw new Error(`Roster row missing classType for ${u.username}`);
    // teamId can be null for admin-ish rows, but BRO should have it
    if (u.role === "BRO" && (u.teamId == null)) {
      throw new Error(`BRO missing teamId for ${u.username}`);
    }

    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        classType: u.classType,
        teamId: u.teamId ?? null,
        // always reset bro passwords to DEFAULT_BRO_PASSWORD (easy testing)
        passwordHash: u.username === ADMIN_USERNAME ? undefined : passwordHash,
      },
      create: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        classType: u.classType,
        teamId: u.teamId ?? null,
        passwordHash: u.username === ADMIN_USERNAME ? passwordHash : passwordHash,
      },
    });
  }

  console.log(`✅ roster seeded/updated (${roster.length} users)`);
}

async function seedRequirements() {
  const cps = await prisma.checkpoint.findMany({ select: { id: true, number: true }, orderBy: { number: "asc" } });
  const cats = await prisma.category.findMany({ select: { id: true, key: true } });

  const classTypes = (
    await prisma.user.findMany({
      where: { role: "BRO" },
      distinct: ["classType"],
      select: { classType: true },
    })
  )
    .map((x) => x.classType)
    .filter(Boolean);

  if (!cps.length) throw new Error("No checkpoints.");
  if (!cats.length) throw new Error("No categories.");
  if (!classTypes.length) {
    console.log("⚠️ No BRO users found; requirements not generated.");
    return;
  }

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

  let created = 0;
  let updated = 0;

  for (const cp of cps) {
    const idx = Math.max(0, Math.min(cps.length - 1, (cp.number || 1) - 1));

    for (const ct of classTypes) {
      const mapping = ct === "NON_GRAD" ? nonGrad : ct === "SENIOR" ? senior : null;
      if (!mapping) continue;

      for (const c of cats) {
        const arr = mapping[c.key];
        const required = Array.isArray(arr) ? (arr[idx] ?? 0) : 0;

        const exists = await prisma.requirement.findFirst({
          where: { checkpointId: cp.id, classType: ct, categoryId: c.id },
          select: { id: true, required: true },
        });

        if (exists) {
          if (exists.required !== required) {
            await prisma.requirement.update({ where: { id: exists.id }, data: { required } });
            updated++;
          }
        } else {
          await prisma.requirement.create({
            data: { checkpointId: cp.id, classType: ct, categoryId: c.id, required },
          });
          created++;
        }
      }
    }
  }

  console.log(`✅ requirements seeded: created ${created}, updated ${updated}`);
}

async function printCounts() {
  const counts = {
    categories: await prisma.category.count(),
    checkpoints: await prisma.checkpoint.count(),
    requirements: await prisma.requirement.count(),
    events: await prisma.event.count(),
    teams: await prisma.team.count(),
    users: await prisma.user.count(),
    bros: await prisma.user.count({ where: { role: "BRO" } }),
    admins: await prisma.user.count({ where: { role: "ADMIN" } }),
  };
  console.log("COUNTS:", counts);
}

async function main() {
  console.log("🌱 seed_all start");
  await seedCategories();
  await seedCheckpoints();
  await seedAdmin();
  await seedRosterFromJson();
  await seedRequirements();
  await printCounts();
  console.log("🌱 seed_all done");
}

main()
  .catch((e) => {
    console.error("❌ seed_all failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
