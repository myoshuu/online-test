"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getStudentTestAttempt,
  recordAttemptCheat,
  submitStudentAttempt,
} from "@/actions/Test";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id: string;
  question: string;
  order: number;
  isCorrect: boolean | null;
};

type AttemptQuestion = Question & {
  answer: boolean | null;
};

type StudentTestAttempt = {
  attemptId: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  subjectCode: string | null;
  questions: AttemptQuestion[];
  startDate: string | null;
  endDate: string | null;
  cheatCount: number;
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}h ${minutes}m ${seconds}s`;
};

const fetchTestAttempt = async (
  testId: string,
  code: string | null
): Promise<StudentTestAttempt | null> => {
  const result = await getStudentTestAttempt(testId, code ?? undefined);
  if (result.success && result.data && "attempt" in result.data) {
    return result.data.attempt as StudentTestAttempt;
  }
  if (result.data && "message" in result.data) {
    throw new Error(result.data.message);
  }
  throw new Error("Failed to load test");
};

const StudentExamPage = () => {
  const router = useRouter();
  const params = useParams<{ testId?: string }>();
  const searchParams = useSearchParams();
  const testId = params?.testId;
  const accessCode = searchParams.get("code");

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<StudentTestAttempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [cheatCount, setCheatCount] = useState(0);
  const [cheatDialogOpen, setCheatDialogOpen] = useState(false);
  const [cheatDialogMessage, setCheatDialogMessage] = useState("");
  const [cheatLock, setCheatLock] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const pageLoadedRef = useRef(false);

  useEffect(() => {
    if (!testId) {
      router.replace("/dashboard/student/tests");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchTestAttempt(testId, accessCode);
        if (!data) {
          router.replace("/dashboard/student/tests");
          return;
        }
        setAttempt(data);
        setCheatCount(data.cheatCount ?? 0);
        setAnswers(
          data.questions.reduce<Record<string, boolean | null>>(
            (acc, question) => {
              acc[question.id] = question.answer ?? null;
              return acc;
            },
            {}
          )
        );
        // Mark page as loaded after a short delay to prevent refresh from counting as cheating
        setTimeout(() => {
          pageLoadedRef.current = true;
        }, 2000);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load test";
        toast.error(message);
        router.replace("/dashboard/student/tests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, router, accessCode]);

  useEffect(() => {
    if (!attempt?.startDate || !attempt.endDate) {
      setTimeLeft(null);
      return;
    }
    const start = new Date(attempt.startDate).getTime();
    const end = new Date(attempt.endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      const now = Date.now();
      if (now < start) {
        setTimeLeft(formatCountdown(start - now));
      } else if (now > end) {
        setTimeLeft("Test window ended");
      } else {
        setTimeLeft(formatCountdown(end - now));
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  const currentQuestion = useMemo(() => {
    if (!attempt) return null;
    return attempt.questions[questionIndex] ?? null;
  }, [attempt, questionIndex]);

  const handleAnswer = (value: boolean) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handlePrevious = () => {
    setQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (
      answers[currentQuestion.id] === null ||
      answers[currentQuestion.id] === undefined
    ) {
      toast.error("Please answer the question before continuing.");
      return;
    }
    setQuestionIndex((prev) =>
      Math.min(prev + 1, (attempt?.questions.length || 1) - 1)
    );
  };

  const handleSubmit = () => {
    if (!attempt || submitting) {
      return;
    }
    const unanswered = attempt.questions.find(
      (question) =>
        answers[question.id] === null || answers[question.id] === undefined
    );
    if (unanswered) {
      toast.error("Please answer all questions before submitting.");
      setQuestionIndex(attempt.questions.indexOf(unanswered));
      return;
    }
    setSubmitConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (!attempt || submitting) {
      return;
    }
    setSubmitConfirmOpen(false);
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          answer: value as boolean,
        })
      );
      const result = await submitStudentAttempt({
        attemptId: attempt.attemptId,
        answers: formattedAnswers,
      });
      if (result.success) {
        toast.success("Test submitted!");
        router.replace("/dashboard/student/tests");
      } else {
        const message =
          result.data && "message" in result.data
            ? result.data.message
            : "Failed to submit test";
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit test";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const registerCheat = useCallback(async () => {
    if (!attempt || cheatLock || cheatCount >= 3 || !pageLoadedRef.current) {
      return;
    }
    setCheatLock(true);
    try {
      const result = await recordAttemptCheat(attempt.attemptId);
      if (result.success && result.data && "cheatCount" in result.data) {
        const updatedCount = (result.data.cheatCount as number) ?? 0;
        setCheatCount(updatedCount);
        const remaining = Math.max(0, 3 - updatedCount);
        setCheatDialogMessage(
          updatedCount >= 3
            ? "Cheating detected three times. The test has been submitted."
            : `Cheating detected. You have ${remaining} chance(s) left.`
        );
        setCheatDialogOpen(true);
        if (result.data.blocked) {
          toast.error("Cheating limit reached. The test has ended.");
          setTimeout(() => router.replace("/dashboard/student/tests"), 2000);
        }
      } else {
        const message =
          result.data && "message" in result.data
            ? result.data.message
            : "Failed to record cheating";
        toast.error(message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to record anti-cheat event.");
    } finally {
      setTimeout(() => setCheatLock(false), 1000);
    }
  }, [attempt, cheatLock, cheatCount, router]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        registerCheat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [registerCheat]);

  useEffect(() => {
    const handleBlur = () => {
      registerCheat();
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [registerCheat]);

  if (!testId || loading || !attempt || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p>Preparing your test...</p>
        </div>
      </div>
    );
  }

  const totalQuestions = attempt.questions.length;
  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl flex flex-col-reverse gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div>
            <Badge variant="secondary">
                {attempt.subjectCode
                  ? `${attempt.subjectCode}`
                  : attempt.subjectName}
            </Badge>
            <h1 className="text-2xl font-semibold mt-2">{attempt.testTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cheating warnings: {cheatCount}/3
            </p>
          </div>
          {timeLeft && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="py-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Time Remaining
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {timeLeft}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <Progress value={progress} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
              <CardDescription>
                Select the correct answer to proceed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={
                    answers[currentQuestion.id] === true ? "default" : "outline"
                  }
                  className="h-14 cursor-pointer"
                  onClick={() => handleAnswer(true)}
                >
                  True
                </Button>
                <Button
                  variant={
                    answers[currentQuestion.id] === false ? "default" : "outline"
                  }
                  className="h-14 cursor-pointer"
                  onClick={() => handleAnswer(false)}
                >
                  False
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                You must answer each question before moving to the next one.
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={questionIndex === 0}
                  onClick={handlePrevious}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                {questionIndex === totalQuestions - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Test"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="cursor-pointer">
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>

        <aside className="w-full lg:w-72">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question Navigator</CardTitle>
              <CardDescription>
                Tap a number to jump directly to a question.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {attempt.questions.map((question, index) => {
                  const answered =
                    answers[question.id] !== null &&
                    answers[question.id] !== undefined;
                  const isCurrent = index === questionIndex;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setQuestionIndex(index)}
                      className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : answered
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog
        open={cheatDialogOpen}
        onOpenChange={(open) => {
          if (cheatCount < 3) {
            setCheatDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cheating Detected</DialogTitle>
            <DialogDescription>{cheatDialogMessage}</DialogDescription>
          </DialogHeader>
          {cheatCount < 3 && (
            <DialogFooter>
              <Button onClick={() => setCheatDialogOpen(false)}>Continue</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to finish the exam? Once submitted, you cannot change your answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Yes, Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentExamPage;

