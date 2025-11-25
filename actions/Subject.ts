"use server";

import { prisma } from "@/helpers/Prisma";
import { res } from "@/helpers/Response";
import { authenticate } from "@/helpers/Authenticate";
import { normalizeTestEndDate } from "@/lib/dateUtils";

export const createSubject = async (data: {
  name: string;
  description?: string;
  code?: string;
}) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Check if code already exists (if provided)
    if (data.code) {
      const existing = await prisma.subject.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        return res(false, {
          message: `Subject with code: ${data.code} already exists`,
        });
      }
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        description: data.description || null,
        code: data.code || null,
        createdBy: user.id,
        updatedBy: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        createdAt: true,
      },
    });

    return res(true, {
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res(false, {
      message: "Internal server error, during subject creation process",
    });
  }
};

export const updateSubject = async (
  subjectId: string,
  data: {
    name?: string;
    description?: string;
    code?: string;
  }
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!existingSubject) {
      return res(false, { message: "Subject not found" });
    }

    // If code is being updated, check for duplicates
    if (data.code && data.code !== existingSubject.code) {
      const duplicate = await prisma.subject.findUnique({
        where: { code: data.code },
      });

      if (duplicate) {
        return res(false, {
          message: `Subject with code: ${data.code} already exists`,
        });
      }
    }

    const updateData: {
      updatedBy: string;
      name?: string;
      description?: string | null;
      code?: string | null;
    } = {
      updatedBy: user.id,
    };

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.code !== undefined) updateData.code = data.code || null;

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        updatedAt: true,
      },
    });

    return res(true, {
      message: "Subject updated successfully",
      subject: updatedSubject,
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    return res(false, {
      message: "Internal server error, during subject update process",
    });
  }
};

export const deleteSubject = async (subjectId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!existingSubject) {
      return res(false, { message: "Subject not found" });
    }

    await prisma.subject.delete({
      where: { id: subjectId },
    });

    return res(true, {
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return res(false, {
      message: "Internal server error, during subject deletion process",
    });
  }
};

export const getSubjectById = async (subjectId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const foundSubject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!foundSubject) {
      return res(false, { message: "Subject not found" });
    }

    return res(true, { subject: foundSubject });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return res(false, {
      message: "Internal server error, during subject fetch process",
    });
  }
};

export const getSubjects = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const subjects = await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    return res(true, { subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res(false, {
      message: "Internal server error, during fetching subjects process",
    });
  }
};

export const assignUserToSubject = async (
  userId: string,
  subjectId: string
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Check if assignment already exists
    const existing = await prisma.userSubject.findUnique({
      where: {
        userId_subjectId: {
          userId,
          subjectId,
        },
      },
    });

    if (existing) {
      return res(false, {
        message: "User is already assigned to this subject",
      });
    }

    // Check if user and subject exist
    const [targetUser, subject] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!targetUser) {
      return res(false, { message: "User not found" });
    }

    if (!subject) {
      return res(false, { message: "Subject not found" });
    }

    await prisma.userSubject.create({
      data: {
        userId,
        subjectId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return res(true, {
      message: "User assigned to subject successfully",
    });
  } catch (error) {
    console.error("Error assigning user to subject:", error);
    return res(false, {
      message: "Internal server error, during assignment process",
    });
  }
};

export const bulkAssignUsersToSubject = async (
  userIds: string[],
  subjectId: string
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    if (!userIds || userIds.length === 0) {
      return res(false, { message: "No users selected" });
    }

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return res(false, { message: "Subject not found" });
    }

    // Check existing assignments
    const existing = await prisma.userSubject.findMany({
      where: {
        subjectId,
        userId: { in: userIds },
      },
    });

    const existingUserIds = new Set(existing.map((e) => e.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return res(false, {
        message: "All selected users are already assigned to this subject",
      });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true },
    });

    if (users.length !== newUserIds.length) {
      return res(false, { message: "Some users were not found" });
    }

    // Bulk create assignments
    await prisma.userSubject.createMany({
      data: newUserIds.map((userId) => ({
        userId,
        subjectId,
        createdBy: user.id,
        updatedBy: user.id,
      })),
    });

    return res(true, {
      message: `${newUserIds.length} user(s) assigned successfully`,
      assigned: newUserIds.length,
      skipped: existingUserIds.size,
    });
  } catch (error) {
    console.error("Error bulk assigning users to subject:", error);
    return res(false, {
      message: "Internal server error, during bulk assignment process",
    });
  }
};

export const unassignUserFromSubject = async (
  userId: string,
  subjectId: string
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const existing = await prisma.userSubject.findUnique({
      where: {
        userId_subjectId: {
          userId,
          subjectId,
        },
      },
    });

    if (!existing) {
      return res(false, { message: "User is not assigned to this subject" });
    }

    await prisma.userSubject.delete({
      where: {
        userId_subjectId: {
          userId,
          subjectId,
        },
      },
    });

    return res(true, {
      message: "User unassigned from subject successfully",
    });
  } catch (error) {
    console.error("Error unassigning user from subject:", error);
    return res(false, {
      message: "Internal server error, during unassignment process",
    });
  }
};

export const getSubjectWithAssignments = async (subjectId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        enrollments: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                nim: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return res(false, { message: "Subject not found" });
    }

    // Get creator/updater names for assignments
    const assignmentUserIds = new Set<string>();
    subject.enrollments.forEach((enrollment) => {
      if (enrollment.createdBy) assignmentUserIds.add(enrollment.createdBy);
    });

    const assignmentUsersMap = new Map<string, string>();
    if (assignmentUserIds.size > 0) {
      const assignmentUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(assignmentUserIds) } },
        select: { id: true, name: true },
      });
      assignmentUsers.forEach((u) => assignmentUsersMap.set(u.id, u.name));
    }

    // Separate lecturers and students with assignment metadata
    const lecturers = subject.enrollments
      .filter((enrollment) => enrollment.User.role === "LECTURER")
      .map((enrollment) => ({
        ...enrollment.User,
        assignedAt: enrollment.createdAt,
        assignedBy: enrollment.createdBy
          ? assignmentUsersMap.get(enrollment.createdBy) || "System"
          : "System",
      }));

    const students = subject.enrollments
      .filter((enrollment) => enrollment.User.role === "STUDENT")
      .map((enrollment) => ({
        ...enrollment.User,
        assignedAt: enrollment.createdAt,
        assignedBy: enrollment.createdBy
          ? assignmentUsersMap.get(enrollment.createdBy) || "System"
          : "System",
      }));

    return res(true, {
      subject: {
        id: subject.id,
        name: subject.name,
        description: subject.description,
        code: subject.code,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
      },
      lecturers,
      students,
    });
  } catch (error) {
    console.error("Error fetching subject with assignments:", error);
    return res(false, {
      message: "Internal server error, during subject fetch process",
    });
  }
};

export const getLecturerSubjectsWithStudents = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "LECTURER") {
      return res(false, { message: "Unauthorized" });
    }

    type AttemptSummary = {
      testId: string;
      testTitle: string;
      totalQuestions: number;
      score: number | null | undefined;
      correctCount: number;
      wrongCount: number;
      submittedAt: string | null;
      durationMinutes: number | null;
    };

    const subjects = await prisma.subject.findMany({
      where: {
        enrollments: {
          some: {
            userId: user.id,
            User: {
              role: "LECTURER",
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        enrollments: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                nim: true,
                isActive: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const assignmentUserIds = new Set<string>();
    subjects.forEach((subject) => {
      subject.enrollments.forEach((enrollment) => {
        if (enrollment.createdBy) {
          assignmentUserIds.add(enrollment.createdBy);
        }
      });
    });

    const assignmentUsersMap = new Map<string, string>();
    if (assignmentUserIds.size > 0) {
      const assignmentUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(assignmentUserIds) } },
        select: { id: true, name: true },
      });
      assignmentUsers.forEach((assignmentUser) =>
        assignmentUsersMap.set(assignmentUser.id, assignmentUser.name)
      );
    }

    const formattedSubjects = [];

    for (const subject of subjects) {
      const studentEnrollments = subject.enrollments.filter(
        (enrollment) => enrollment.User.role === "STUDENT"
      );
      const studentIds = studentEnrollments.map(
        (enrollment) => enrollment.User.id
      );

      const tests = await prisma.test.findMany({
        where: {
          subjectId: subject.id,
          userId: user.id,
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          questions: {
            select: {
              id: true,
            },
          },
        },
      });
      const testIds = tests.map((test) => test.id);
      const testMeta = new Map(
        tests.map((test) => [
          test.id,
          {
            title: test.title,
            questionCount: test.questions.length,
            startDate: test.startDate,
            endDate: test.endDate,
          },
        ])
      );

      const attemptsByStudent = new Map<string, AttemptSummary[]>();
      if (testIds.length > 0 && studentIds.length > 0) {
        const attempts = await prisma.attempt.findMany({
          where: {
            testId: { in: testIds },
            userId: { in: studentIds },
          },
          include: {
            answers: true,
          },
        });

        attempts.forEach((attempt) => {
          const meta = testMeta.get(attempt.testId);
          if (!meta) {
            return;
          }
          const correctCount = attempt.answers.filter(
            (answer) => answer.isCorrect === true
          ).length;
          const wrongCount = attempt.answers.filter(
            (answer) => answer.isCorrect === false
          ).length;
          let durationMinutes: number | null = null;
          if (meta.startDate && meta.endDate) {
            const startMs = new Date(meta.startDate).getTime();
            const endMs = new Date(meta.endDate).getTime();
            if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
              durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
            }
          }

          const summary: AttemptSummary = {
            testId: attempt.testId,
            testTitle: meta.title,
            totalQuestions: meta.questionCount,
            score: attempt.score,
            correctCount,
            wrongCount,
            submittedAt: attempt.submittedAt
              ? attempt.submittedAt.toISOString()
              : null,
            durationMinutes,
          };
          const existing = attemptsByStudent.get(attempt.userId) ?? [];
          existing.push(summary);
          attemptsByStudent.set(attempt.userId, existing);
        });
      }

      formattedSubjects.push({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        code: subject.code,
        students: studentEnrollments.map((enrollment) => ({
          id: enrollment.User.id,
          name: enrollment.User.name,
          nim: enrollment.User.nim,
          isActive: enrollment.User.isActive,
          assignedAt:
            enrollment.createdAt instanceof Date
              ? enrollment.createdAt.toISOString()
              : enrollment.createdAt
              ? new Date(enrollment.createdAt).toISOString()
              : null,
          assignedBy: enrollment.createdBy
            ? assignmentUsersMap.get(enrollment.createdBy) || "System"
            : "System",
          attempts: attemptsByStudent.get(enrollment.User.id) ?? [],
        })),
      });
    }

    return res(true, {
      subjects: formattedSubjects,
    });
  } catch (error) {
    console.error("Error fetching lecturer subjects with students:", error);
    return res(false, {
      message: "Internal server error, during lecturer subject fetch process",
    });
  }
};

export const getStudentSubjectsWithTests = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    const subjects = await prisma.subject.findMany({
      where: {
        enrollments: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      tests: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            accessCode: true,
            attempts: {
              where: {
                userId: user.id,
              },
              select: {
                id: true,
                submittedAt: true,
                cheatCount: true,
              },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const subjectsForClient = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      tests: subject.tests.map((test) => {
        const normalizedEnd = normalizeTestEndDate(
          test.startDate,
          test.endDate
        );
        const attempt = test.attempts[0] || null;
        return {
          id: test.id,
          title: test.title,
          description: test.description,
          startDate: test.startDate ? test.startDate.toISOString() : null,
          endDate: normalizedEnd ? normalizedEnd.toISOString() : null,
          createdAt: test.createdAt.toISOString(),
          requiresCode: Boolean(test.accessCode),
          attemptSubmitted: attempt?.submittedAt ? true : false,
          cheatCount: attempt?.cheatCount ?? 0,
        };
      }),
    }));

    return res(true, { subjects: subjectsForClient });
  } catch (error) {
    console.error("Error fetching student subjects/tests:", error);
    return res(false, { message: "Failed to load available tests" });
  }
};
