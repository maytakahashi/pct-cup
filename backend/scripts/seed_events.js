/* scripts/seed_schedule_2026.js */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helpers
const pad2 = (n) => String(n).padStart(2, "0");
function atLocalTime(dateStrYYYYMMDD, hh = 20, mm = 0) {
  // Interpreted in local time (no "Z")
  return new Date(`${dateStrYYYYMMDD}T${pad2(hh)}:${pad2(mm)}:00`);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function dateOnly(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function rangeDates(startYYYYMMDD, endYYYYMMDD) {
  const start = new Date(`${startYYYYMMDD}T00:00:00`);
  const end = new Date(`${endYYYYMMDD}T00:00:00`);
  const out = [];
  for (let cur = new Date(start); cur <= end; cur = addDays(cur, 1)) {
    out.push(dateOnly(cur));
  }
  return out;
}

async function ensureCategories() {
  const defaults = [
    { key: "CHAPTER", name: "Chapter", color: "#709CF2" },
    { key: "RUSH", name: "Rush", color: "#DE6561" },
    { key: "INTERNAL", name: "Internal", color: "#FAB86D" },
    { key: "CORPORATE", name: "Corporate", color: "#7DA9B4" },
    { key: "PLEDGE", name: "Pledge", color: "#8978C7" },
    { key: "SERVICE", name: "Service", color: "#9ECC80" },
    { key: "CASUAL", name: "Casual", color: "#FFDE76" },
  ];

  for (const c of defaults) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: { name: c.name, color: c.color },
      create: c,
    });
  }
}

async function wipe2026Plus() {
  await prisma.attendance.deleteMany({
    where: { event: { startsAt: { gte: new Date("2026-01-01T00:00:00") } } },
  });
  await prisma.event.deleteMany({
    where: { startsAt: { gte: new Date("2026-01-01T00:00:00") } },
  });
}

function buildScheduleEvents() {
  const E = [];

  // ---- JANUARY (from Board Master Doc) ----
  E.push({ date: "2026-01-18", title: "CPR", categoryKey: "INTERNAL" });
  E.push({ date: "2026-01-21", title: "Chapter: Reminder about PCT Cup", categoryKey: "CHAPTER" });

  // 1/22 or 1/23 Welcome Back Party -> SOCIAL -> SKIP

  // Rush Week 1 (4 nights) 1/26-1/29
  for (const d of rangeDates("2026-01-26", "2026-01-29")) {
    E.push({ date: d, title: "Rush Night (Week 1)", categoryKey: "RUSH" });
  }

  // "- Service Night" (listed under rush week) -> treat as SERVICE (1 hr placeholder)
  // If you want this to count as RUSH instead, change categoryKey to "RUSH" and remove serviceHours.
  E.push({ date: "2026-01-28", title: "Rush Service Night", categoryKey: "SERVICE", serviceHours: 1 });

  E.push({ date: "2026-01-31", title: "Open Delib", categoryKey: "INTERNAL" });

  // ---- FEBRUARY ----
  // Rush Week 2 (3 nights) 2/2-2/4
  for (const d of rangeDates("2026-02-02", "2026-02-04")) {
    E.push({ date: d, title: "Rush Night (Week 2)", categoryKey: "RUSH" });
  }

  E.push({ date: "2026-02-05", title: "Closed Delib", categoryKey: "INTERNAL" });

  // 2/6 Bid Dinner (keep) + Bid Dinner Party (SOCIAL -> skip)
  E.push({ date: "2026-02-06", title: "Bid Dinner", categoryKey: "INTERNAL" });

  E.push({ date: "2026-02-11", title: "Chapter: PCT Cup Checkpoint 1", categoryKey: "CHAPTER" });
  E.push({ date: "2026-02-18", title: "Chapter", categoryKey: "CHAPTER" });

  // Dodgeball Tournament (not a social event in your request) -> CASUAL
  E.push({ date: "2026-02-20", title: "Dodgeball Tournament (or 2/21)", categoryKey: "CASUAL" });

  // Dog Drive Week 1 / Week 2 -> SERVICE (1 hr placeholder each)
  E.push({ date: "2026-02-20", title: "Dog Drive (Week 1)", categoryKey: "SERVICE", serviceHours: 1 });
  E.push({ date: "2026-02-27", title: "Dog Drive (Week 2)", categoryKey: "SERVICE", serviceHours: 1 });

  E.push({ date: "2026-02-25", title: "Chapter", categoryKey: "CHAPTER" });

  // Retreat 2/28-2/29 -> CASUAL (two events)
  for (const d of rangeDates("2026-02-28", "2026-02-29")) {
    E.push({ date: d, title: "Retreat", categoryKey: "CASUAL" });
  }

  // ---- MARCH ----
  E.push({ date: "2026-03-04", title: "Chapter: PCT Cup Checkpoint 2", categoryKey: "CHAPTER" });
  E.push({ date: "2026-03-07", title: "Founder’s Day", categoryKey: "CASUAL" });
  E.push({ date: "2026-03-11", title: "Chapter", categoryKey: "CHAPTER" });

  // 3/13 or 3/14 Cuff and Chug -> SOCIAL -> SKIP
  E.push({ date: "2026-03-25", title: "Chapter", categoryKey: "CHAPTER" });

  // 3/27 or 3/28 Mixer -> SOCIAL -> SKIP

  // ---- APRIL ----
  E.push({ date: "2026-04-01", title: "Chapter: PCT Cup Checkpoint 3", categoryKey: "CHAPTER" });

  // 4/4 CS Event + Field Day -> treat as SERVICE 2 hours (matches “(2H)” note in PCT CUP doc)
  E.push({ date: "2026-04-04", title: "Community Service: Field Day", categoryKey: "SERVICE", serviceHours: 2 });

  E.push({ date: "2026-04-08", title: "Chapter", categoryKey: "CHAPTER" });
  E.push({ date: "2026-04-11", title: "Borglympics", categoryKey: "CASUAL" });

  // Initiation unknown -> skip

  E.push({ date: "2026-04-15", title: "Chapter", categoryKey: "CHAPTER" });
  E.push({ date: "2026-04-22", title: "Chapter", categoryKey: "CHAPTER" });

  // 4/23 Date Night -> SOCIAL -> SKIP

  E.push({ date: "2026-04-27", title: "Last Chapter: PCT Cup Concluded", categoryKey: "CHAPTER" });
  E.push({ date: "2026-04-29", title: "End of Semester Rush", categoryKey: "RUSH" });

  return E;
}

async function seedEvents() {
  const events = buildScheduleEvents();

  const categories = await prisma.category.findMany();
  const catIdByKey = new Map(categories.map((c) => [c.key, c.id]));

  const creates = [];
  for (const e of events) {
    const categoryId = catIdByKey.get(e.categoryKey);
    if (!categoryId) throw new Error(`Missing category: ${e.categoryKey}`);

    const mandatory = e.categoryKey === "INTERNAL"; // your hardened rule
    const startsAt = atLocalTime(e.date, 20, 0);

    creates.push(
      prisma.event.create({
        data: {
          title: e.title,
          startsAt,
          categoryId,
          mandatory,
          serviceHours: e.categoryKey === "SERVICE" ? Number(e.serviceHours || 1) : null,
        },
      })
    );
  }

  // Run sequentially to keep it simple / readable
  for (const c of creates) await c;

  return events.length;
}

(async () => {
  console.log("Seeding schedule (Jan 2026+)...");
  await ensureCategories();
  await wipe2026Plus();
  const count = await seedEvents();
  console.log(`✅ Seeded ${count} events (Jan 2026+)`);
})()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
