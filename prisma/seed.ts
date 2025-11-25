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
  const adminPassword = await bcrypt.hash("admin123", 12);
  const lecturerPassword = await bcrypt.hash("lect123", 12);
  const studentPassword = await bcrypt.hash("stu123", 12);

  // Create Users
  console.log("👤 Creating users...");
  await prisma.user.create({
    data: {
      name: "Admin User",
      nim: "ADMIN001",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  const lecturer1 = await prisma.user.create({
    data: {
      name: "Dr. John Smith",
      nim: "LECT001",
      password: lecturerPassword,
      role: "LECTURER",
      isActive: true,
    },
  });

  const lecturer2 = await prisma.user.create({
    data: {
      name: "Prof. Jane Doe",
      nim: "LECT002",
      password: lecturerPassword,
      role: "LECTURER",
      isActive: true,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      nim: "STU001",
      password: studentPassword,
      role: "STUDENT",
      isActive: true,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: "Bob Williams",
      nim: "STU002",
      password: studentPassword,
      role: "STUDENT",
      isActive: true,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      name: "Charlie Brown",
      nim: "STU003",
      password: studentPassword,
      role: "STUDENT",
      isActive: true,
    },
  });

  // Create Subjects
  console.log("📚 Creating subjects...");
  const mathSubject = await prisma.subject.create({
    data: {
      name: "Mathematics",
      description: "Introduction to Mathematics",
      code: "MATH101",
    },
  });

  const physicsSubject = await prisma.subject.create({
    data: {
      name: "Physics",
      description: "Fundamentals of Physics",
      code: "PHYS101",
    },
  });

  const chemistrySubject = await prisma.subject.create({
    data: {
      name: "Chemistry",
      description: "Basic Chemistry Principles",
      code: "CHEM101",
    },
  });

  // Create UserSubject enrollments
  console.log("📝 Creating enrollments...");
  await prisma.userSubject.create({
    data: {
      userId: student1.id,
      subjectId: mathSubject.id,
    },
  });

  await prisma.userSubject.create({
    data: {
      userId: student1.id,
      subjectId: physicsSubject.id,
    },
  });

  await prisma.userSubject.create({
    data: {
      userId: student2.id,
      subjectId: mathSubject.id,
    },
  });

  await prisma.userSubject.create({
    data: {
      userId: student2.id,
      subjectId: chemistrySubject.id,
    },
  });

  await prisma.userSubject.create({
    data: {
      userId: student3.id,
      subjectId: physicsSubject.id,
    },
  });

  await prisma.userSubject.create({
    data: {
      userId: student3.id,
      subjectId: chemistrySubject.id,
    },
  });

  // Create Tests
  console.log("📋 Creating tests...");
  const mathTest1 = await prisma.test.create({
    data: {
      title: "Math Quiz 1: Algebra Basics",
      description: "Basic algebra questions covering linear equations",
      userId: lecturer1.id,
      subjectId: mathSubject.id,
    },
  });

  const mathTest2 = await prisma.test.create({
    data: {
      title: "Math Quiz 2: Calculus Introduction",
      description: "Introduction to differential calculus",
      userId: lecturer1.id,
      subjectId: mathSubject.id,
    },
  });

  const physicsTest1 = await prisma.test.create({
    data: {
      title: "Physics Test: Mechanics",
      description: "Test on Newton's laws and motion",
      userId: lecturer2.id,
      subjectId: physicsSubject.id,
    },
  });

  // Create Questions (True/False format)
  console.log("❓ Creating questions...");
  const mathQ1 = await prisma.question.create({
    data: {
      question: "2 + 2 equals 4.",
      isCorrect: true, // Correct answer is True
      order: 1,
      testId: mathTest1.id,
    },
  });

  const mathQ2 = await prisma.question.create({
    data: {
      question: "The solution to 2x + 5 = 15 is x = 5.",
      isCorrect: true, // Correct answer is True
      order: 2,
      testId: mathTest1.id,
    },
  });

  await prisma.question.create({
    data: {
      question: "The derivative of x² is 2x.",
      isCorrect: true, // Correct answer is True
      order: 1,
      testId: mathTest2.id,
    },
  });

  await prisma.question.create({
    data: {
      question: "The square root of 16 is 3.",
      isCorrect: false, // Correct answer is False
      order: 2,
      testId: mathTest2.id,
    },
  });

  const physicsQ1 = await prisma.question.create({
    data: {
      question:
        "Newton's First Law states that an object at rest stays at rest unless acted upon by a force.",
      isCorrect: true, // Correct answer is True
      order: 1,
      testId: physicsTest1.id,
    },
  });

  const physicsQ2 = await prisma.question.create({
    data: {
      question: "The formula for force is F = ma.",
      isCorrect: true, // Correct answer is True
      order: 2,
      testId: physicsTest1.id,
    },
  });

  const physicsQ3 = await prisma.question.create({
    data: {
      question: "Gravity only works on Earth.",
      isCorrect: false, // Correct answer is False
      order: 3,
      testId: physicsTest1.id,
    },
  });

  // Create Attempts
  console.log("✍️ Creating attempts...");
  const attempt1 = await prisma.attempt.create({
    data: {
      userId: student1.id,
      testId: mathTest1.id,
      answerId: "", // This field exists in schema but no relation defined
      startedAt: new Date(),
      score: 85.5,
    },
  });

  const attempt2 = await prisma.attempt.create({
    data: {
      userId: student2.id,
      testId: mathTest1.id,
      answerId: "",
      startedAt: new Date(),
      submittedAt: new Date(),
      score: 92.0,
    },
  });

  const attempt3 = await prisma.attempt.create({
    data: {
      userId: student1.id,
      testId: physicsTest1.id,
      answerId: "",
      startedAt: new Date(),
      score: 78.0,
    },
  });

  // Create Answers (True/False answers)
  console.log("💬 Creating answers...");
  // Student1's answers for mathTest1
  await prisma.answer.create({
    data: {
      boolAnswer: true, // Student answered True
      isCorrect: true, // Matches question's correct answer (True)
      attemptId: attempt1.id,
      questionId: mathQ1.id,
    },
  });

  await prisma.answer.create({
    data: {
      boolAnswer: true, // Student answered True
      isCorrect: true, // Matches question's correct answer (True)
      attemptId: attempt1.id,
      questionId: mathQ2.id,
    },
  });

  // Student2's answers for mathTest1
  await prisma.answer.create({
    data: {
      boolAnswer: true, // Student answered True
      isCorrect: true, // Matches question's correct answer (True)
      attemptId: attempt2.id,
      questionId: mathQ1.id,
    },
  });

  await prisma.answer.create({
    data: {
      boolAnswer: false, // Student answered False (incorrect)
      isCorrect: false, // Doesn't match question's correct answer (True)
      attemptId: attempt2.id,
      questionId: mathQ2.id,
    },
  });

  // Student1's answers for physicsTest1
  await prisma.answer.create({
    data: {
      boolAnswer: true, // Student answered True
      isCorrect: true, // Matches question's correct answer (True)
      attemptId: attempt3.id,
      questionId: physicsQ1.id,
    },
  });

  await prisma.answer.create({
    data: {
      boolAnswer: true, // Student answered True
      isCorrect: true, // Matches question's correct answer (True)
      attemptId: attempt3.id,
      questionId: physicsQ2.id,
    },
  });

  await prisma.answer.create({
    data: {
      boolAnswer: false, // Student answered False
      isCorrect: true, // Matches question's correct answer (False)
      attemptId: attempt3.id,
      questionId: physicsQ3.id,
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
