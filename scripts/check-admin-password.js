const { PrismaClient } = require("@prisma/client");
const { compare } = require("bcryptjs");

(async () => {
  const prisma = new PrismaClient();
  try {
    const email = process.env.ADMIN_EMAIL || "dan@danjacobs.com";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("ADMIN_PASSWORD not set");
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      console.log("No admin user found with email", email);
      process.exit(2);
    }
    const ok = await compare(password, user.password);
    console.log(JSON.stringify({ email, ok }));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();


