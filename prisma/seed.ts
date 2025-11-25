import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

  const studentData = [
    {
      name: "ABEL RAYJHON TASMAN SARAGIH",
      nim: "2401001",
      password: bcrypt.hashSync("2401001", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "CINTYA JUNIARTI",
      nim: "2401002",
      password: bcrypt.hashSync("2401002", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "ERI PERMATA SARI",
      nim: "2401003",
      password: bcrypt.hashSync("2401003", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "MANDA",
      nim: "2401004",
      password: bcrypt.hashSync("2401004", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "LATRI FUJA MARISA",
      nim: "2401005",
      password: bcrypt.hashSync("2401005", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "VERDIAN IMANUEL",
      nim: "2401008",
      password: bcrypt.hashSync("2401008", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "WINDA",
      nim: "2401009",
      password: bcrypt.hashSync("2401009", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "YEREMIAS BAGAS",
      nim: "2401010",
      password: bcrypt.hashSync("2401010", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "DANIEL REYNALDI ANDRIAS",
      nim: "2501003",
      password: bcrypt.hashSync("2501003", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
    {
      name: "HAFAAHAKHODODO GULO",
      nim: "2501018",
      password: bcrypt.hashSync("2501018", 12),
      role: "STUDENT" as const,
      isActive: true,
    },
  ];

  await prisma.user.createMany({
    data: studentData,
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
