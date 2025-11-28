require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
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

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
