"use server";

import { prisma } from "@/helpers/Prisma";
import { res } from "@/helpers/Response";
import { authenticate } from "@/helpers/Authenticate";
import { z } from "zod";
import { normalizeTestEndDate } from "@/lib/dateUtils";

export const getTestsBySubject = async (subjectId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const tests = await prisma.test.findMany({
      where: { subjectId },
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
        Subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res(true, { tests });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return res(false, {
      message: "Internal server error, during fetching tests process",
    });
  }
};

export const getTestDetails = async (testId: string) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    // Get test with all questions and attempts
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
          include: {
            answers: {
              include: {
                Attempt: {
                  include: {
                    User: {
                      select: {
                        id: true,
                        name: true,
                        nim: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        attempts: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                nim: true,
              },
            },
            answers: {
              include: {
                Question: {
                  select: {
                    id: true,
                    question: true,
                    isCorrect: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!test) {
      return res(false, { message: "Test not found" });
    }

    if (user.role === "LECTURER") {
      const assignment = await prisma.userSubject.findFirst({
        where: {
          userId: user.id,
          subjectId: test.subjectId,
        },
      });

      if (!assignment) {
        return res(false, { message: "Unauthorized" });
      }
    }

    const totalQuestions = test.questions.length;

    // Process each attempt to calculate overall score
    const respondents = test.attempts.map((attempt) => {
      // Group answers by question
      const answersByQuestion = new Map<string, (typeof attempt.answers)[0]>();
      attempt.answers.forEach((answer) => {
        if (!answersByQuestion.has(answer.questionId)) {
          answersByQuestion.set(answer.questionId, answer);
        }
      });

      // Calculate score: count correct answers
      let correctCount = 0;
      const questionAnswers = test.questions.map((question) => {
        const answer = answersByQuestion.get(question.id);
        const isCorrect = answer?.isCorrect === true;
        if (isCorrect) correctCount++;

        return {
          questionId: question.id,
          question: question.question,
          correctAnswer: question.isCorrect,
          studentAnswer: answer?.boolAnswer ?? null,
          isCorrect,
          order: question.order,
        };
      });

      const overallScore =
        totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      const cheatCountValue =
        (attempt as unknown as { cheatCount?: number | null }).cheatCount ?? 0;

      return {
        attemptId: attempt.id,
        userId: attempt.User.id,
        userName: attempt.User.name,
        userNim: attempt.User.nim,
        overallScore,
        correctCount,
        totalQuestions,
        submittedAt: attempt.submittedAt,
        startedAt: attempt.startedAt,
        endAt: attempt.endAt,
        cheatCount: cheatCountValue,
        questionAnswers,
      };
    });

    // Sort respondents by score (highest first)
    respondents.sort((a, b) => b.overallScore - a.overallScore);

    const testWithDates = test as typeof test & {
      startDate?: Date | null;
      endDate?: Date | null;
    };
    const normalizedEnd = normalizeTestEndDate(
      testWithDates.startDate || null,
      testWithDates.endDate || null
    );

    return res(true, {
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        startDate: testWithDates.startDate || null,
        endDate: normalizedEnd || null,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
        subject: test.Subject,
        accessCode: test.accessCode || null,
      },
      questions: test.questions.map((q) => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.isCorrect,
        order: q.order,
      })),
      respondents,
      totalQuestions,
      totalRespondents: respondents.length,
    });
  } catch (error) {
    console.error("Error fetching test details:", error);
    return res(false, {
      message: "Internal server error, during fetching test details process",
    });
  }
};

export const getSubjectsWithTestCounts = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: { tests: true },
        },
        tests: {
          include: {
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
          },
        },
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    const subjectsWithCounts = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      totalTests: subject._count.tests,
      tests: subject.tests.map((test) => ({
        id: test.id,
        title: test.title,
        totalQuestions: test._count.questions,
        totalAttempts: test._count.attempts,
      })),
    }));

    return res(true, { subjects: subjectsWithCounts });
  } catch (error) {
    console.error("Error fetching subjects with test counts:", error);
    return res(false, {
      message: "Internal server error, during fetching subjects process",
    });
  }
};

export const getLecturerSubjectsWithTestCounts = async () => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "LECTURER") {
      return res(false, { message: "Unauthorized" });
    }

    const assignments = await prisma.userSubject.findMany({
      where: { userId: user.id },
      select: { subjectId: true },
    });

    const subjectIds = assignments.map((a) => a.subjectId);

    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: {
        _count: {
          select: { tests: true },
        },
        tests: {
          include: {
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
          },
        },
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    const subjectsWithCounts = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      totalTests: subject._count.tests,
      tests: subject.tests.map((test) => ({
        id: test.id,
        title: test.title,
        totalQuestions: test._count.questions,
        totalAttempts: test._count.attempts,
      })),
    }));

    return res(true, { subjects: subjectsWithCounts });
  } catch (error) {
    console.error("Error fetching lecturer subjects with test counts:", error);
    return res(false, {
      message: "Internal server error, during fetching subjects process",
    });
  }
};

const createQuestionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  isCorrect: z.boolean().nullable().optional(),
  order: z.number().int().positive().optional().nullable(),
  testId: z.string().min(1, "Test is required"),
});

const ensureUserCanAccessTest = async (
  userId: string,
  role: string,
  testId: string
) => {
  if (role === "ADMIN") {
    return true;
  }

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { subjectId: true },
  });

  if (!test) {
    return false;
  }

  const assignment = await prisma.userSubject.findFirst({
    where: { userId, subjectId: test.subjectId },
  });

  return Boolean(assignment);
};

export const createQuestion = async (data: {
  question: string;
  isCorrect?: boolean | null;
  order?: number | null;
  testId: string;
}) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const validated = createQuestionSchema.parse(data);

    const hasAccess = await ensureUserCanAccessTest(
      user.id,
      user.role,
      validated.testId
    );

    if (!hasAccess) {
      return res(false, { message: "Unauthorized" });
    }

    // If no order specified, get the next order number
    let order = validated.order;
    if (!order) {
      const lastQuestion = await prisma.question.findFirst({
        where: { testId: validated.testId },
        orderBy: { order: "desc" },
      });
      order = lastQuestion?.order ? lastQuestion.order + 1 : 1;
    }

    const question = await prisma.question.create({
      data: {
        question: validated.question,
        isCorrect: validated.isCorrect ?? null,
        order: order,
        testId: validated.testId,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return res(true, { question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res(false, {
        message: error.issues[0]?.message || "Validation error",
      });
    }
    console.error("Error creating question:", error);
    return res(false, {
      message: "Internal server error, during question creation process",
    });
  }
};

export const updateQuestion = async (
  questionId: string,
  data: {
    question?: string;
    isCorrect?: boolean | null;
    order?: number | null;
  }
) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const questionRecord = await prisma.question.findUnique({
      where: { id: questionId },
      select: { testId: true },
    });

    if (!questionRecord) {
      return res(false, { message: "Question not found" });
    }

    const hasAccess = await ensureUserCanAccessTest(
      user.id,
      user.role,
      questionRecord.testId
    );
    if (!hasAccess) {
      return res(false, { message: "Unauthorized" });
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(data.question !== undefined && { question: data.question }),
        ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
        ...(data.order !== undefined && { order: data.order }),
        updatedBy: user.id,
      },
    });

    return res(true, { question });
  } catch (error) {
    console.error("Error updating question:", error);
    return res(false, {
      message: "Internal server error, during question update process",
    });
  }
};

export const deleteQuestion = async (questionId: string) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const questionRecord = await prisma.question.findUnique({
      where: { id: questionId },
      select: { testId: true },
    });

    if (!questionRecord) {
      return res(false, { message: "Question not found" });
    }

    const hasAccess = await ensureUserCanAccessTest(
      user.id,
      user.role,
      questionRecord.testId
    );

    if (!hasAccess) {
      return res(false, { message: "Unauthorized" });
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return res(true, { message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res(false, {
      message: "Internal server error, during question deletion process",
    });
  }
};

export const bulkCreateQuestions = async (
  testId: string,
  questions: Array<{
    question: string;
    isCorrect?: boolean | null;
    order?: number | null;
  }>
) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    if (!questions || questions.length === 0) {
      return res(false, { message: "No questions provided" });
    }

    const hasAccess = await ensureUserCanAccessTest(user.id, user.role, testId);
    if (!hasAccess) {
      return res(false, { message: "Unauthorized" });
    }

    // Get the last order number
    const lastQuestion = await prisma.question.findFirst({
      where: { testId },
      orderBy: { order: "desc" },
    });
    const nextOrder = lastQuestion?.order ? lastQuestion.order + 1 : 1;

    // Create all questions
    const createdQuestions = await prisma.$transaction(
      questions.map((q, index) => {
        const order = q.order || nextOrder + index;
        return prisma.question.create({
          data: {
            question: q.question,
            isCorrect: q.isCorrect ?? null,
            order: order,
            testId: testId,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });
      })
    );

    return res(true, {
      questions: createdQuestions,
      count: createdQuestions.length,
    });
  } catch (error) {
    console.error("Error bulk creating questions:", error);
    return res(false, {
      message: "Internal server error, during bulk question creation process",
    });
  }
};
