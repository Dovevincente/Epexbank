import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./src/utils/password.js";

const prisma = new PrismaClient();
const rl = createInterface({ input: stdin, output: stdout });

try {
  const email = "admin@epexbank.com";
  const password = await rl.question("Enter a NEW password (12+ characters): ");
  const confirm = await rl.question("Confirm password: ");

  if (password.length < 12) throw new Error("Use at least 12 characters.");
  if (password !== confirm) throw new Error("Passwords do not match.");

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const approval = await rl.question(
      "Account exists. Type YES to promote it and reset its password: "
    );
    if (approval !== "YES") {
      console.log("Cancelled. No changes made.");
      process.exitCode = 1;
    } else {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          emailVerified: true
        }
      });
      console.log("Existing account promoted successfully.");
    }
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true
      }
    });
    console.log("SUPER_ADMIN account created successfully.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, status: true }
  });

  if (user) console.log("Account:", user);
} catch (error) {
  console.error("Setup failed:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
