require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // find all BRO ids
    const bros = await tx.user.findMany({
      where: { role: "BRO" },
      select: { id: true },
    });
    const broIds = bros.map((b) => b.id);

    // delete dependent rows first
    if (broIds.length) {
      await tx.session.deleteMany({ where: { userId: { in: broIds } } });
      await tx.attendance.deleteMany({ where: { userId: { in: broIds } } });
    }

    // delete bros
    const del = await tx.user.deleteMany({ where: { role: "BRO" } });
    console.log(`Deleted BRO users: ${del.count}`);
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
