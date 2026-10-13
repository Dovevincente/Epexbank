import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email: "admin@epexbank.com" },
    data: {
      role: "ADMIN",
      status: "ACTIVE"
    },
    select: {
      email: true,
      role: true,
      status: true
    }
  });

  console.log("Updated account:", user);
} catch (error) {
  console.error("Update failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
