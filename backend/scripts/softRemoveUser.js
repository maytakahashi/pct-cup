// scripts/softRemoveUser.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const userId = Number(process.argv[2]);
  if (!Number.isFinite(userId)) {
    throw new Error("Usage: node scripts/softRemoveUser.js <userId>");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      teamId: null,
      deletedAt: new Date(),
    },
    select: { id: true, username: true, teamId: true, deletedAt: true },
  });

  await prisma.session.deleteMany({ where: { userId } });

  console.log("Soft-removed:", updated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
