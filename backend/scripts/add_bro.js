require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.DEFAULT_BRO_PASSWORD || "password";

async function addBro() {
  // Edit these values for the new bro
  const newBro = {
    username: "vedansh.chauhan",           // Change this to unique username
    firstName: "Vedansh",             // Change this
    lastName: "Chauhan",              // Change this
    teamId: 4,                    // Change to appropriate team (1-based)
    classType: "SENIOR",        // Options: "NON_GRAD" or "SENIOR"
  };

  // Validate team exists
  const team = await prisma.team.findUnique({ where: { id: newBro.teamId } });
  if (!team) {
    throw new Error(`Team ${newBro.teamId} does not exist. Create it first or use a different teamId.`);
  }

  // Check if username already exists
  const existing = await prisma.user.findUnique({ where: { username: newBro.username } });
  if (existing) {
    throw new Error(`Username "${newBro.username}" already exists.`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Create the bro
  const user = await prisma.user.create({
    data: {
      username: newBro.username,
      passwordHash,
      firstName: newBro.firstName,
      lastName: newBro.lastName,
      role: "BRO",
      classType: newBro.classType,
      teamId: newBro.teamId,
    },
  });

  console.log(`✅ Bro added successfully!`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Password: ${DEFAULT_PASSWORD}`);
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Team: ${newBro.teamId}`);
  console.log(`   Class: ${user.classType}`);
}

addBro()
  .catch((e) => {
    console.error("❌ Failed to add bro:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
