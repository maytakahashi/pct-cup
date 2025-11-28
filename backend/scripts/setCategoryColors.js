const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();

  const colors = {
    CHAPTER:   "#DE6561",
    RUSH:      "#FAB86D",
    INTERNAL:  "#FFDE76",
    CORPORATE: "#9ECC80",
    PLEDGE:    "#7DA9B4",
    SERVICE:   "#709CF2",
    CASUAL:    "#8978C7",
  };


  for (const [key, color] of Object.entries(colors)) {
    await p.category.update({ where: { key }, data: { color } });
    console.log("updated", key, color);
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
