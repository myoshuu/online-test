"use server";

import { authenticate } from "@/helpers/Authenticate";
import { prisma } from "@/helpers/Prisma";
import { res } from "@/helpers/Response";

export const getDashboardStats = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Get total counts
    const [totalUsers, totalStudents, totalLecturers, totalSubjects, totalTests] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.user.count({ where: { role: "LECTURER" } }),
        prisma.subject.count().catch(() => 0),
        prisma.test.count().catch(() => 0),
      ]);

    // Get recent users (last 5)
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true,
      },
    });

    // Get recent subjects (last 5)
    let recentSubjects: any[] = [];
    try {
      recentSubjects = await prisma.subject.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          code: true,
          createdAt: true,
        },
      });
    } catch {
      recentSubjects = [];
    }

    return res(true, {
      totalUsers,
      totalStudents,
      totalLecturers,
      totalSubjects,
      totalTests,
      recentUsers,
      recentSubjects,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res(false, {
      message: "Internal server error, during fetching dashboard stats",
    });
  }
};

export const getLecturerStats = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "LECTURER") {
      return res(false, { message: "Unauthorized" });
    }

    // Get tests created by this lecturer
    const myTests = await prisma.test.count({
      where: { userId: user.id },
    });

    // Get total attempts on tests created by this lecturer
    const totalAttempts = await prisma.attempt.count({
      where: {
        Test: {
          userId: user.id,
        },
      },
    });

    // Get unique subjects that this lecturer has tests for
    const subjects = await prisma.test.findMany({
      where: { userId: user.id },
      select: { subjectId: true },
      distinct: ["subjectId"],
    });

    return res(true, {
      myTests,
      totalAttempts,
      subjects: subjects.length,
    });
  } catch (error) {
    console.error("Error fetching lecturer stats:", error);
    return res(false, {
      message: "Internal server error, during fetching lecturer stats",
    });
  }
};

export const getStudentStats = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    // Get subjects the student is enrolled in
    const enrolledSubjects = await prisma.userSubject.findMany({
      where: { userId: user.id },
      select: { subjectId: true },
    });

    const subjectIds = enrolledSubjects.map((es) => es.subjectId);

    // Get available tests (tests for subjects the student is enrolled in)
    const availableTests = await prisma.test.count({
      where: {
        subjectId: { in: subjectIds },
      },
    });

    // Get completed tests (attempts that have been submitted)
    const completedTests = await prisma.attempt.count({
      where: {
        userId: user.id,
        submittedAt: { not: null },
      },
    });

    // Get enrolled subjects count
    const mySubjects = enrolledSubjects.length;

    return res(true, {
      availableTests,
      completedTests,
      mySubjects,
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    return res(false, {
      message: "Internal server error, during fetching student stats",
    });
  }
};

