const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

(async () => {
  const prisma = new PrismaClient();
  try {
    const username = "dan@danjacobs.com";
    const email = "dan@danjacobs.com";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("ADMIN_PASSWORD not set");

    const hash = await bcrypt.hash(password, 10);
    const rightsArr = [
      "UserManagement",
      "EventManagement",
      "EventCategories",
      "EventSeatMaps",
      "Orders",
      "OrderMarkAsPayed",
      "Options",
      "Translation",
    ];
    const rights = JSON.stringify(rightsArr);

    const user = await prisma.adminUser.upsert({
      where: { email },
      update: {
        userName: username,
        password: hash,
        readRights: rights,
        writeRights: rights,
      },
      create: {
        userName: username,
        email,
        password: hash,
        readRights: rights,
        writeRights: rights,
      },
    });
    console.log("created/updated", user.id);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();


