require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
const DEFAULT_BRO_PASSWORD = process.env.DEFAULT_BRO_PASSWORD || "password";

async function seedCategories() {
  const categories = [
    { key: "CHAPTER", name: "Chapter", color: "#007AFF" },
    { key: "RUSH", name: "Rush", color: "#FF9500" },
    { key: "INTERNAL", name: "Internal", color: "#AF52DE" },
    { key: "CORPORATE", name: "Corporate", color: "#34C759" },
    { key: "PLEDGE", name: "Pledge", color: "#5856D6" },
    { key: "SERVICE", name: "Service", color: "#FF3B30" },
    { key: "CASUAL", name: "Casual", color: "#9FB0D0" }
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, color: c.color },
      create: c
    });
  }
  console.log("✅ categories seeded");
}

async function seedCheckpoints() {
  // You can change dates later; needs to be 2026.
  const checkpoints = [
    { number: 1, label: "Checkpoint 1", endDate: "2026-01-31" },
    { number: 2, label: "Checkpoint 2", endDate: "2026-03-31" },
    { number: 3, label: "Checkpoint 3", endDate: "2026-05-31" },
    { number: 4, label: "Checkpoint 4", endDate: "2026-08-31" }
  ];

  for (const cp of checkpoints) {
    await prisma.checkpoint.upsert({
      where: { number: cp.number },
      update: { label: cp.label, endDate: new Date(cp.endDate + "T00:00:00.000Z") },
      create: { number: cp.number, label: cp.label, endDate: new Date(cp.endDate + "T00:00:00.000Z") }
    });
  }
  console.log("✅ checkpoints seeded");
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
      teamId: null
    },
    create: {
      username: ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
      teamId: null
    }
  });

  console.log(`✅ admin seeded (username=${ADMIN_USERNAME})`);
}

async function seedRosterFromJsonIfExists() {
  const rosterPath = path.join(__dirname, "roster.json");
  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf-8"));

  const pw = process.env.DEFAULT_BRO_PASSWORD || "password";
  const passwordHash = await bcrypt.hash(pw, 10);

  // Ensure teams exist (1..8)
  for (let i = 1; i <= 8; i++) {
    await prisma.team.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Team ${i}` },
    });
  }

  // Upsert bros from roster
  for (const u of roster) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        classType: u.classType,
        teamId: u.teamId,
        passwordHash,
      },
      create: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        classType: u.classType,
        teamId: u.teamId,
        passwordHash,
      },
    });
  }

  console.log(`Seeded/updated ${roster.length} bros`);
}

async function seedRequirements() {
  const cps = await prisma.checkpoint.findMany({ select: { id: true } });
  const cats = await prisma.category.findMany({ select: { id: true, key: true } });

  const classTypes = (await prisma.user.findMany({
    where: { role: "BRO" },
    distinct: ["classType"],
    select: { classType: true }
  })).map(x => x.classType);

  if (!cps.length) throw new Error("No checkpoints.");
  if (!cats.length) throw new Error("No categories.");
  if (!classTypes.length) {
    console.log("⚠️ No BRO users found; requirements not generated.");
    return;
  }

  let created = 0;

  for (const cp of cps) {
    for (const ct of classTypes) {
      for (const c of cats) {
        const required =
          c.key === "CASUAL" ? 0 :
          c.key === "SERVICE" ? 1 :
          1;

        const exists = await prisma.requirement.findFirst({
          where: { checkpointId: cp.id, classType: ct, categoryId: c.id },
          select: { id: true }
        });

        if (!exists) {
          await prisma.requirement.create({
            data: { checkpointId: cp.id, classType: ct, categoryId: c.id, required }
          });
          created++;
        }
      }
    }
  }

  console.log("✅ requirements seeded:", created);
}

async function main() {
  console.log("🌱 seeding start");
  await seedCategories();
  await seedCheckpoints();
  await seedAdmin();

  // IMPORTANT: your real bros/teams come from your roster seed script.
  await seedRosterFromJsonIfExists();

  // Requirements depend on BRO users existing.
  await seedRequirements();

  console.log("🌱 seeding done");
}

main()
  .catch((e) => {
    console.error("❌ seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
