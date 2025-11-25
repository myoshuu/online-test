import bcrypt from "bcryptjs";
import { prisma } from "../helpers/Prisma";

const main = async () => {
  console.log("🌱 Starting seed...");

  // Clear existing data (optional - uncomment if you want to reset)
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.userSubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const adminPassword = await bcrypt.hash("aprovoid@team2025", 12);
  const lecturerPassword = await bcrypt.hash("edyp@4444", 12);
  const studentPassword = await bcrypt.hash("672023303", 12);

  // Create Users
  console.log("👤 Creating users...");
  await prisma.user.create({
    data: {
      name: "Aprovoid",
      nim: "admin",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Edy Pangangkat, M.Th",
      nim: "lect001",
      password: lecturerPassword,
      role: "LECTURER",
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Joevano Alfeus Pangangkat",
      nim: "672023303",
      password: studentPassword,
      role: "STUDENT",
      isActive: true,
    },
  });

  console.log("✅ Seed completed successfully!");
};

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
