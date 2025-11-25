"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/helpers/Prisma";
import { res } from "@/helpers/Response";
import { authenticate } from "@/helpers/Authenticate";
import { z } from "zod";
import { cookies } from "next/headers";
import { normalizeTestEndDate } from "@/lib/dateUtils";

const ACTIVE_EXAM_COOKIE = "activeExam";
const ACTIVE_COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

const createTestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  subjectId: z.string().min(1, "Subject is required"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  accessCode: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "Access code must be 6 alphanumeric characters")
    .optional()
    .nullable(),
});

const updateTestSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  subjectId: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  accessCode: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "Access code must be 6 alphanumeric characters")
    .optional()
    .nullable(),
});

const submitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.boolean(),
      })
    )
    .min(1, "Answers are required"),
});

const setActiveExamCookie = async ({
  attemptId,
  testId,
  expiresAt,
}: {
  attemptId: string;
  testId: string;
  expiresAt?: Date | null;
}) => {
  const cookieStore = await cookies();
  const cookiePayload = JSON.stringify({ attemptId, testId });
  const options: {
    path: string;
    httpOnly: boolean;
    sameSite: "lax";
    maxAge?: number;
    expires?: Date;
  } = {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  };

  if (expiresAt && expiresAt.getTime() > Date.now()) {
    options.expires = expiresAt;
  } else {
    options.maxAge = ACTIVE_COOKIE_MAX_AGE;
  }

  cookieStore.set(ACTIVE_EXAM_COOKIE, cookiePayload, options);
};

const clearActiveExamCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_EXAM_COOKIE);
};

const ensureLecturerSubjectAccess = async (
  userId: string,
  subjectId: string
) => {
  const assignment = await prisma.userSubject.findFirst({
    where: { userId, subjectId },
  });
  return Boolean(assignment);
};

const generateAccessCodeValue = () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }
  return result;
};

export const createTest = async (data: {
  title: string;
  description?: string | null;
  subjectId: string;
  startDate?: string | null;
  endDate?: string | null;
  accessCode?: string | null;
}) => {
  try {
    const user = await authenticate();
    const isAdmin = user?.role === "ADMIN";
    const isLecturer = user?.role === "LECTURER";

    if (!user || (!isAdmin && !isLecturer)) {
      return res(false, { message: "Unauthorized" });
    }

    const validated = createTestSchema.parse(data);

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: validated.subjectId },
    });

    if (!subject) {
      return res(false, { message: "Subject not found" });
    }

    if (isLecturer) {
      const hasAccess = await ensureLecturerSubjectAccess(
        user.id,
        validated.subjectId
      );
      if (!hasAccess) {
        return res(false, {
          message: "You are not assigned to this subject",
        });
      }
    }

    const startDateValue = validated.startDate
      ? new Date(validated.startDate)
      : null;
    const endDateValue = validated.endDate ? new Date(validated.endDate) : null;
    const normalizedEnd = normalizeTestEndDate(startDateValue, endDateValue);

    const testData: Record<string, unknown> = {
      title: validated.title,
      description: validated.description || null,
      subjectId: validated.subjectId,
      userId: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    };
    if (validated.accessCode) {
      testData.accessCode = validated.accessCode.toUpperCase();
    }

    if (startDateValue) {
      testData.startDate = startDateValue;
    }
    if (normalizedEnd) {
      testData.endDate = normalizedEnd;
    } else if (validated.endDate === null) {
      testData.endDate = null;
    }

    const test = await prisma.test.create({
      data: testData as Prisma.TestUncheckedCreateInput,
    });

    return res(true, { test });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res(false, {
        message: error.issues[0]?.message || "Validation error",
      });
    }
    console.error("Error creating test:", error);
    return res(false, {
      message: "Internal server error, during test creation process",
    });
  }
};

export const updateTest = async (
  testId: string,
  data: {
    title?: string;
    description?: string | null;
    subjectId?: string;
    startDate?: string | null;
    endDate?: string | null;
    accessCode?: string | null;
  }
) => {
  try {
    const user = await authenticate();
    const isAdmin = user?.role === "ADMIN";
    const isLecturer = user?.role === "LECTURER";
    if (!user || (!isAdmin && !isLecturer)) {
      return res(false, { message: "Unauthorized" });
    }

    const validated = updateTestSchema.parse(data);

    const existingTest = await prisma.test.findUnique({
      where: { id: testId },
      select: { subjectId: true, startDate: true, endDate: true },
    });

    if (!existingTest) {
      return res(false, { message: "Test not found" });
    }

    if (isLecturer) {
      const hasAccess = await ensureLecturerSubjectAccess(
        user.id,
        existingTest.subjectId
      );
      if (!hasAccess) {
        return res(false, { message: "Unauthorized" });
      }
    }

    const updateData: Record<string, unknown> = {
      updatedBy: user.id,
    };

    let startDateValue = existingTest.startDate ?? null;
    if (validated.startDate !== undefined) {
      startDateValue = validated.startDate
        ? new Date(validated.startDate)
        : null;
      updateData.startDate = startDateValue;
    }

    let endDateValue = existingTest.endDate ?? null;
    if (validated.endDate !== undefined) {
      endDateValue = validated.endDate ? new Date(validated.endDate) : null;
    }

    if (validated.endDate !== undefined || validated.startDate !== undefined) {
      const normalizedEnd = normalizeTestEndDate(startDateValue, endDateValue);
      if (validated.endDate !== undefined) {
        updateData.endDate = normalizedEnd;
      }
    }

    if (validated.title !== undefined) {
      updateData.title = validated.title;
    }

    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }

    if (validated.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: validated.subjectId },
      });

      if (!subject) {
        return res(false, { message: "Subject not found" });
      }

      if (isLecturer) {
        const hasAccess = await ensureLecturerSubjectAccess(
          user.id,
          validated.subjectId
        );
        if (!hasAccess) {
          return res(false, {
            message: "You are not assigned to this subject",
          });
        }
      }

      updateData.subjectId = validated.subjectId;
    }

    if (validated.accessCode !== undefined) {
      updateData.accessCode = validated.accessCode
        ? validated.accessCode.toUpperCase()
        : null;
    }

    if (validated.startDate !== undefined) {
      updateData.startDate = validated.startDate
        ? new Date(validated.startDate)
        : null;
    }

    if (validated.endDate !== undefined) {
      updateData.endDate = validated.endDate
        ? new Date(validated.endDate)
        : null;
    }

    const updatedTest = await prisma.test.update({
      where: { id: testId },
      data: updateData as Prisma.TestUncheckedUpdateInput,
      include: {
        Subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res(true, { test: updatedTest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res(false, {
        message: error.issues[0]?.message || "Validation error",
      });
    }
    console.error("Error updating test:", error);
    return res(false, {
      message: "Internal server error, during test update process",
    });
  }
};

export const getTestById = async (testId: string) => {
  try {
    const user = await authenticate();
    const isAdmin = user?.role === "ADMIN";
    const isLecturer = user?.role === "LECTURER";
    if (!user || (!isAdmin && !isLecturer)) {
      return res(false, { message: "Unauthorized" });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        Subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!test) {
      return res(false, { message: "Test not found" });
    }

    if (isLecturer) {
      const hasAccess = await ensureLecturerSubjectAccess(
        user.id,
        test.subjectId
      );
      if (!hasAccess) {
        return res(false, { message: "Unauthorized" });
      }
    }

    return res(true, { test });
  } catch (error) {
    console.error("Error fetching test:", error);
    return res(false, {
      message: "Internal server error, during test fetch process",
    });
  }
};

export const regenerateTestAccessCode = async (testId: string) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { subjectId: true },
    });

    if (!test) {
      return res(false, { message: "Test not found" });
    }

    if (user.role === "LECTURER") {
      const hasAccess = await ensureLecturerSubjectAccess(
        user.id,
        test.subjectId
      );
      if (!hasAccess) {
        return res(false, { message: "Unauthorized" });
      }
    }

    const newCode = generateAccessCodeValue();
    await prisma.test.update({
      where: { id: testId },
      data: {
        accessCode: newCode,
        updatedBy: user.id,
      },
    });

    return res(true, { accessCode: newCode });
  } catch (error) {
    console.error("Error regenerating access code:", error);
    return res(false, { message: "Failed to regenerate access code" });
  }
};

export const getStudentTestsWithAccess = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    const tests = await prisma.test.findMany({
      where: {
        accessCode: { not: null },
        Subject: {
          enrollments: {
            some: {
              userId: user.id,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        Subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const formatted = tests.map((test) => ({
      testId: test.id,
      title: test.title,
      subjectName: test.Subject.name,
      subjectCode: test.Subject.code,
    }));

    return res(true, { tests: formatted });
  } catch (error) {
    console.error("Error fetching student access tests:", error);
    return res(false, { message: "Failed to load tests" });
  }
};

export const validateTestAccessCode = async (testId: string, code: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      return res(false, { message: "Code must be 6 characters" });
    }

    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        accessCode: normalized,
        Subject: {
          enrollments: {
            some: {
              userId: user.id,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!test) {
      return res(false, { message: "Invalid access code" });
    }

    return res(true, { message: "Access granted" });
  } catch (error) {
    console.error("Error validating access code:", error);
    return res(false, { message: "Failed to validate code" });
  }
};

type HydratedAttempt = Prisma.AttemptGetPayload<{
  include: { answers: true };
}> & { cheatCount?: number | null };

export const getStudentTestAttempt = async (
  testId: string,
  accessCode?: string
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        subjectId: true,
        accessCode: true,
        startDate: true,
        endDate: true,
        Subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!test) {
      return res(false, { message: "Test not found" });
    }

    const resolvedEndDate = normalizeTestEndDate(test.startDate, test.endDate);

    if (test.startDate && test.startDate.getTime() > Date.now()) {
      return res(false, { message: "Test has not started yet" });
    }

    if (resolvedEndDate && resolvedEndDate.getTime() < Date.now()) {
      await clearActiveExamCookie();
      return res(false, { message: "Test window has ended" });
    }

    const enrolled = await prisma.userSubject.findFirst({
      where: { userId: user.id, subjectId: test.subjectId },
    });

    if (!enrolled) {
      return res(false, { message: "Unauthorized" });
    }

    if (test.accessCode) {
      if (!accessCode || test.accessCode !== accessCode.trim().toUpperCase()) {
        return res(false, { message: "Invalid access code" });
      }
    }

    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: [{ order: "asc" }],
      select: {
        id: true,
        question: true,
        order: true,
        isCorrect: true,
      },
    });

    let attemptRecord = (await prisma.attempt.findFirst({
      where: { userId: user.id, testId },
      include: {
        answers: true,
      },
    })) as HydratedAttempt | null;

    if (!attemptRecord) {
      attemptRecord = (await prisma.attempt.create({
        data: {
          userId: user.id,
          testId,
          answerId: crypto.randomUUID(),
          startedAt: new Date(),
        },
        include: {
          answers: true,
        },
      })) as HydratedAttempt;
    }

    if (attemptRecord.submittedAt) {
      await clearActiveExamCookie();
      return res(false, { message: "You already did this test" });
    }

    const cheatCountValue = attemptRecord.cheatCount ?? 0;
    // Only block if cheating limit (2) is reached, not just any cheating detection
    if (cheatCountValue >= 2) {
      await clearActiveExamCookie();
      return res(false, {
        message: "You already did the test indicate cheating",
      });
    }

    const hydratedAttempt = attemptRecord;

    await setActiveExamCookie({
      attemptId: hydratedAttempt.id,
      testId: test.id,
      expiresAt: resolvedEndDate ?? null,
    });

    const answersMap = new Map(
      hydratedAttempt.answers.map((answer) => [
        answer.questionId,
        answer.boolAnswer,
      ])
    );

    const questionPayload = questions.map((question) => ({
      id: question.id,
      question: question.question,
      order: question.order ?? 0,
      isCorrect: question.isCorrect,
      answer: answersMap.get(question.id) ?? null,
    }));

    return res(true, {
      attempt: {
        attemptId: hydratedAttempt.id,
        testId: test.id,
        testTitle: test.title,
        subjectName: test.Subject.name,
        subjectCode: test.Subject.code,
        startDate: test.startDate ? test.startDate.toISOString() : null,
        endDate: resolvedEndDate ? resolvedEndDate.toISOString() : null,
        cheatCount: hydratedAttempt.cheatCount ?? 0,
        questions: questionPayload,
      },
    });
  } catch (error) {
    console.error("Error loading student attempt:", error);
    return res(false, { message: "Failed to load test" });
  }
};

export const recordAttemptCheat = async (attemptId: string) => {
  try {
    const user = await authenticate();
    if (!user) {
      return res(false, { message: "Unauthorized" });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res(false, { message: "Attempt not found" });
    }

    if (user.role === "STUDENT" && attempt.userId !== user.id) {
      return res(false, { message: "Unauthorized" });
    }

    const currentCheat =
      ((attempt as unknown as { cheatCount?: number | null }).cheatCount ??
        0) ||
      0;
    const newCount = currentCheat + 1;
    const blocked = newCount >= 2;

    const newSubmittedAt =
      blocked && !attempt.submittedAt ? new Date() : attempt.submittedAt;

    await prisma.$executeRaw`
      UPDATE "Attempt"
      SET "cheatCount" = ${newCount}, "submittedAt" = ${newSubmittedAt}
      WHERE "id" = ${attemptId}
    `;

    if (blocked) {
      await clearActiveExamCookie();
    }

    return res(true, { cheatCount: newCount, blocked });
  } catch (error) {
    console.error("Error recording cheat event:", error);
    return res(false, { message: "Failed to record cheat event" });
  }
};

export const submitStudentAttempt = async (data: {
  attemptId: string;
  answers: { questionId: string; answer: boolean }[];
}) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "STUDENT") {
      return res(false, { message: "Unauthorized" });
    }

    const parsed = submitAttemptSchema.safeParse(data);
    if (!parsed.success) {
      return res(false, {
        message: parsed.error.issues[0]?.message || "Invalid answers",
      });
    }

    const { attemptId, answers } = parsed.data;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        Test: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!attempt || attempt.userId !== user.id) {
      return res(false, { message: "Attempt not found" });
    }

    if (attempt.submittedAt) {
      await clearActiveExamCookie();
      return res(false, { message: "Attempt already submitted" });
    }

    const normalizedEndDate = normalizeTestEndDate(
      attempt.Test.startDate,
      attempt.Test.endDate
    );

    if (normalizedEndDate && normalizedEndDate.getTime() < Date.now()) {
      await clearActiveExamCookie();
      return res(false, { message: "Test window has ended" });
    }

    const questions = await prisma.question.findMany({
      where: { testId: attempt.testId },
      select: { id: true, isCorrect: true },
    });

    const questionMap = new Map<string, boolean | null | undefined>();
    questions.forEach((question) => {
      questionMap.set(question.id, question.isCorrect);
    });

    let correctCount = 0;
    const answerRecords = answers
      .filter((entry) => questionMap.has(entry.questionId))
      .map((entry) => {
        const correctValue = questionMap.get(entry.questionId);
        const isCorrect =
          typeof correctValue === "boolean"
            ? correctValue === entry.answer
            : null;
        if (isCorrect) {
          correctCount += 1;
        }
        return {
          attemptId: attempt.id,
          questionId: entry.questionId,
          boolAnswer: entry.answer,
          isCorrect,
        };
      });

    const totalQuestions = questions.length;
    const score =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : null;

    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({
        where: { attemptId: attempt.id },
      });
      if (answerRecords.length > 0) {
        await tx.answer.createMany({
          data: answerRecords,
        });
      }
      await tx.attempt.update({
        where: { id: attempt.id },
        data: {
          score,
          submittedAt: new Date(),
          endAt: new Date(),
          startedAt: attempt.startedAt ?? new Date(),
        },
      });
    });

    await clearActiveExamCookie();

    return res(true, { message: "Test submitted" });
  } catch (error) {
    console.error("Error submitting attempt:", error);
    return res(false, { message: "Failed to submit attempt" });
  }
};

export const clearStudentCheating = async (attemptId: string) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        Test: {
          select: {
            id: true,
            subjectId: true,
          },
        },
      },
    });

    if (!attempt) {
      return res(false, { message: "Attempt not found" });
    }

    if (user.role === "LECTURER") {
      const hasAccess = await ensureLecturerSubjectAccess(
        user.id,
        attempt.Test.subjectId
      );
      if (!hasAccess) {
        return res(false, { message: "Unauthorized" });
      }
    }

    // Reset cheat count, clear submission, and delete answers to allow fresh retake
    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({
        where: { attemptId },
      });
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          cheatCount: 0,
          submittedAt: null,
          score: null,
          endAt: null,
        },
      });
    });

    await clearActiveExamCookie();

    return res(true, {
      message: "Cheating cleared. Student can retake the test.",
    });
  } catch (error) {
    console.error("Error clearing cheating:", error);
    return res(false, { message: "Failed to clear cheating" });
  }
};
