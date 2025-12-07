"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getStudentTestAttempt,
  recordAttemptCheat,
  submitStudentAttempt,
  clearActiveExamCookie,
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

// Helper function for padding (compatible with older browsers)
const padStart = (str: string, length: number, padString: string): string => {
  if (String.prototype.padStart) {
    return str.padStart(length, padString);
  }
  // Fallback for older browsers
  const strValue = String(str);
  if (strValue.length >= length) {
    return strValue;
  }
  const padding = padString.repeat(length - strValue.length);
  return padding + strValue;
};

// Helper function for safe URL encoding (compatible with older browsers)
const safeEncodeURIComponent = (str: string): string => {
  try {
    if (typeof encodeURIComponent === "function") {
      return encodeURIComponent(str);
    }
    // Fallback: basic encoding
    return str
      .replace(/%/g, "%25")
      .replace(/ /g, "%20")
      .replace(/&/g, "%26")
      .replace(/=/g, "%3D")
      .replace(/\?/g, "%3F");
  } catch (error) {
    console.error("Error encoding URI component:", error);
    return str;
  }
};

// Helper function for safe redirects
const safeRedirect = (url: string) => {
  try {
    if (typeof window !== "undefined" && window.location) {
      window.location.href = url;
    } else {
      console.error("Cannot redirect: window.location not available");
    }
  } catch (error) {
    console.error("Error redirecting:", error);
  }
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = padStart(Math.floor(totalSeconds / 3600).toString(), 2, "0");
  const minutes = padStart(
    Math.floor((totalSeconds % 3600) / 60).toString(),
    2,
    "0"
  );
  const seconds = padStart(
    Math.floor(totalSeconds % 60).toString(),
    2,
    "0"
  );
  return `${hours}h ${minutes}m ${seconds}s`;
};

const fetchTestAttempt = async (
  testId: string,
  code: string | null
): Promise<StudentTestAttempt | null> => {
  // Replace nullish coalescing with explicit check
  const codeValue = code !== null && code !== undefined ? code : undefined;
  const result = await getStudentTestAttempt(testId, codeValue);
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
  // Replace optional chaining with explicit check
  const testId = params && params.testId ? params.testId : undefined;
  const accessCode = searchParams ? searchParams.get("code") : null;

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
  const isInitializingRef = useRef(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const isTimeOverRef = useRef(false);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) {
      return; // Prevent multiple redirects
    }
    if (!testId) {
      hasRedirectedRef.current = true;
      router.replace("/dashboard/student/tests");
      return;
    }
    const load = async () => {
      if (hasRedirectedRef.current) {
        return; // Prevent loading if already redirected
      }
      setLoading(true);
      isLoadingRef.current = true;
      isInitializingRef.current = true;
      pageLoadedRef.current = false;

      // Set a timeout to prevent infinite loading (30 seconds)
      if (typeof setTimeout === "function") {
        loadTimeoutRef.current = setTimeout(() => {
          if (isLoadingRef.current) {
            console.error("Test load timeout - redirecting to dashboard");
            isLoadingRef.current = false;
            setLoading(false);
            toast.error("Failed to load test. Please try again.");
            try {
              router.replace("/dashboard/student/tests");
            } catch (error) {
              console.error("Error redirecting:", error);
              if (typeof window !== "undefined" && window.location) {
                window.location.href = "/dashboard/student/tests";
              }
            }
          }
        }, 30000);
      }

      try {
        const data = await fetchTestAttempt(testId, accessCode);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }

        if (!data) {
          isLoadingRef.current = false;
          setLoading(false);
          hasRedirectedRef.current = true;
          // Clear the active exam cookie to prevent middleware redirect loop
          await clearActiveExamCookie();
          safeRedirect(
            "/dashboard/student/tests?error=" +
              safeEncodeURIComponent("Failed to load test")
          );
          return;
        }

        // Validate that we have questions BEFORE setting attempt
        if (!data.questions || data.questions.length === 0) {
          isLoadingRef.current = false;
          setLoading(false);
          hasRedirectedRef.current = true;
          // Clear the active exam cookie to prevent middleware redirect loop
          await clearActiveExamCookie();
          safeRedirect(
            "/dashboard/student/tests?error=" +
              safeEncodeURIComponent(
                "This test has no questions available. Please contact your lecturer."
              )
          );
          return;
        }

        // Only set attempt if we have questions
        setAttempt(data);
        // Replace nullish coalescing with explicit check
        setCheatCount(
          data.cheatCount !== null && data.cheatCount !== undefined
            ? data.cheatCount
            : 0
        );
        setAnswers(
          data.questions.reduce<Record<string, boolean | null>>(
            (acc, question) => {
              // Replace nullish coalescing with explicit check
              acc[question.id] =
                question.answer !== null && question.answer !== undefined
                  ? question.answer
                  : null;
              return acc;
            },
            {}
          )
        );

        // Check if time is already over
        if (data.endDate) {
          try {
            // Check if Date constructor and Date.now exist
            if (
              typeof Date !== "undefined" &&
              typeof Date.now === "function"
            ) {
              const end = new Date(data.endDate).getTime();
              if (!Number.isNaN(end) && Date.now() > end) {
                isTimeOverRef.current = true;
              }
            }
          } catch (error) {
            console.error("Error checking end date:", error);
          }
        }

        isLoadingRef.current = false;
        setLoading(false);
        // Mark page as loaded after a short delay to prevent initial navigation/load
        // from counting as cheating. Reduced to 2s for faster detection once the
        // test is visible and stable.
        if (typeof setTimeout === "function") {
          setTimeout(() => {
            isInitializingRef.current = false;
            pageLoadedRef.current = true;
          }, 2000);
        } else {
          // Fallback if setTimeout is not available (very unlikely)
          isInitializingRef.current = false;
          pageLoadedRef.current = true;
        }
      } catch (error) {
        if (hasRedirectedRef.current) {
          return; // Already redirected, don't do it again
        }
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load test";
        isLoadingRef.current = false;
        setLoading(false);
        hasRedirectedRef.current = true;
        // Clear the active exam cookie to prevent middleware redirect loop
        await clearActiveExamCookie();
        // Pass error message as URL parameter to show toast on dashboard
        safeRedirect(
          "/dashboard/student/tests?error=" + safeEncodeURIComponent(message)
        );
      }
    };
    load();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      isLoadingRef.current = false;
    };
  }, [testId, router]); // Removed accessCode from dependencies to prevent re-running on URL changes

  // Auto-submit function
  const autoSubmit = useCallback(async () => {
    if (!attempt || submitting || hasAutoSubmittedRef.current) {
      return;
    }
    hasAutoSubmittedRef.current = true;
    isTimeOverRef.current = true;
    setSubmitting(true);
    try {
      // Save all current answers (even if not all questions are answered)
      const formattedAnswers = Object.entries(answers)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([questionId, value]) => ({
          questionId,
          answer: value as boolean,
        }));

      // Only submit if we have at least some answers
      if (formattedAnswers.length > 0) {
        const result = await submitStudentAttempt({
          attemptId: attempt.attemptId,
          answers: formattedAnswers,
        });
        if (result.success) {
          toast.success("Test automatically submitted. Time is up!");
        } else {
          const message =
            result.data && "message" in result.data
              ? result.data.message
              : "Failed to submit test";
          toast.error(message);
        }
      } else {
        // No answers to save, just mark as submitted
        const result = await submitStudentAttempt({
          attemptId: attempt.attemptId,
          answers: [],
        });
        if (result.success) {
          toast.info("Test time expired. No answers were saved.");
        }
      }

      // Clear cookie and redirect
      await clearActiveExamCookie();
      safeRedirect("/dashboard/student/tests");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit test";
      toast.error(message);
      await clearActiveExamCookie();
      safeRedirect("/dashboard/student/tests");
    } finally {
      setSubmitting(false);
    }
  }, [attempt, submitting, answers]);

  useEffect(() => {
    if (
      !attempt ||
      !attempt.startDate ||
      !attempt.endDate
    ) {
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
      try {
        // Check if Date.now exists (should be available, but defensive check)
        if (typeof Date === "undefined" || typeof Date.now !== "function") {
          setTimeLeft(null);
          return;
        }
        const now = Date.now();
        if (now < start) {
          setTimeLeft(formatCountdown(start - now));
        } else if (now > end) {
          setTimeLeft("Test window ended");
          isTimeOverRef.current = true;
          // Auto-submit when time is over
          if (!hasAutoSubmittedRef.current) {
            autoSubmit();
          }
        } else {
          setTimeLeft(formatCountdown(end - now));
          // Check if time is very close to ending (less than 1 second)
          if (end - now <= 1000 && !hasAutoSubmittedRef.current) {
            isTimeOverRef.current = true;
            autoSubmit();
          }
        }
      } catch (error) {
        console.error("Error updating timer:", error);
        setTimeLeft(null);
      }
    };
    update();
    // Check if setInterval exists before using it
    if (typeof setInterval === "function") {
      const timer = setInterval(update, 1000);
      return () => {
        if (typeof clearInterval === "function") {
          clearInterval(timer);
        }
      };
    }
  }, [attempt, autoSubmit]);

  const currentQuestion = useMemo(() => {
    if (!attempt || !attempt.questions) return null;
    const question = attempt.questions[questionIndex];
    return question !== null && question !== undefined ? question : null;
  }, [attempt, questionIndex]);

  const handleAnswer = (value: boolean) => {
    try {
      if (!currentQuestion || !currentQuestion.id) return;
      setAnswers((prev) => {
        if (!prev) return { [currentQuestion.id]: value };
        return {
          ...prev,
          [currentQuestion.id]: value,
        };
      });
    } catch (error) {
      console.error("Error handling answer:", error);
      toast.error("Failed to save answer. Please try again.");
    }
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
    setQuestionIndex((prev) => {
      const questionsLength =
        attempt && attempt.questions ? attempt.questions.length : 1;
      return Math.min(prev + 1, questionsLength - 1);
    });
  };

  const handleSubmit = () => {
    try {
      if (!attempt || submitting) {
        return;
      }
      if (!attempt.questions || !Array.isArray(attempt.questions)) {
        toast.error("Invalid test data. Please refresh the page.");
        return;
      }
      const unanswered = attempt.questions.find(
        (question) =>
          !question ||
          !question.id ||
          answers[question.id] === null ||
          answers[question.id] === undefined
      );
      if (unanswered) {
        toast.error("Please answer all questions before submitting.");
        const index = attempt.questions.indexOf(unanswered);
        if (index >= 0) {
          setQuestionIndex(index);
        }
        return;
      }
      setSubmitConfirmOpen(true);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const confirmSubmit = async () => {
    if (!attempt || submitting || hasAutoSubmittedRef.current) {
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
        hasAutoSubmittedRef.current = true;
        toast.success("Test submitted!");
        await clearActiveExamCookie();
        safeRedirect("/dashboard/student/tests");
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
    if (
      !attempt ||
      cheatLock ||
      cheatCount >= 3 ||
      !pageLoadedRef.current ||
      isInitializingRef.current ||
      loading ||
      isTimeOverRef.current // Don't count as cheat if time is over
    ) {
      return;
    }
    setCheatLock(true);
    try {
      const result = await recordAttemptCheat(attempt.attemptId);
      if (result.success && result.data && "cheatCount" in result.data) {
        // Replace nullish coalescing with explicit check
        const cheatCountValue = result.data.cheatCount as number;
        const updatedCount =
          cheatCountValue !== null && cheatCountValue !== undefined
            ? cheatCountValue
            : 0;
        setCheatCount(updatedCount);
        const remaining = Math.max(0, 3 - updatedCount);
        setCheatDialogMessage(
          updatedCount >= 3
            ? "Cheating detected three times. The test has been submitted."
            : `Cheating detected. You have ${remaining} chance(s) left.`
        );
        setCheatDialogOpen(true);
        if (result.data.blocked) {
          // Clear the active exam cookie to prevent middleware redirect loop
          clearActiveExamCookie().then(() => {
            // Use safe redirect for immediate navigation
            safeRedirect(
              "/dashboard/student/tests?error=" +
                safeEncodeURIComponent(
                  "Cheating limit reached. The test has ended."
                )
            );
          });
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
      // Short lock to avoid multiple rapid cheat events, but keep it small so
      // repeated app switches are still detected quickly.
      if (typeof setTimeout === "function") {
        setTimeout(() => setCheatLock(false), 1000);
      } else {
        setCheatLock(false);
      }
    }
  }, [attempt, cheatLock, cheatCount, router, loading]);

  useEffect(() => {
    if (!attempt || loading) return;

    const handleVisibility = () => {
      try {
        // Only register cheat when page becomes hidden, not when it becomes visible
        // Check if document.visibilityState exists (older browsers might not support it)
        if (
          typeof document !== "undefined" &&
          document.visibilityState &&
          document.visibilityState === "hidden"
        ) {
          registerCheat();
        }
      } catch (error) {
        console.error("Error in visibility change handler:", error);
      }
    };

    // Check if addEventListener exists before using it
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        if (document.removeEventListener) {
          document.removeEventListener("visibilitychange", handleVisibility);
        }
      };
    }
  }, [registerCheat, attempt, loading]);

  // Also detect when the browser window loses focus (e.g. switching apps)
  useEffect(() => {
    if (!attempt || loading) return;

    const handleBlur = () => {
      try {
        registerCheat();
      } catch (error) {
        console.error("Error in blur handler:", error);
      }
    };

    // Check if window and addEventListener exist before using them
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("blur", handleBlur);
      return () => {
        if (window.removeEventListener) {
          window.removeEventListener("blur", handleBlur);
        }
      };
    }
  }, [registerCheat, attempt, loading]);

  // If attempt exists but has no questions, redirect immediately (safety check)
  useEffect(() => {
    if (attempt && attempt.questions && attempt.questions.length === 0) {
      setLoading(false);
      // Clear the active exam cookie to prevent middleware redirect loop
      clearActiveExamCookie().then(() => {
        safeRedirect(
          "/dashboard/student/tests?error=" +
            safeEncodeURIComponent(
              "This test has no questions available. Please contact your lecturer."
            )
        );
      });
    }
  }, [attempt]);

  // Early return if no questions detected
  if (attempt && attempt.questions && attempt.questions.length === 0) {
    return null; // Don't render anything while redirecting
  }

  if (!testId || loading || !attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p>Preparing your test...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null; // Don't render anything while redirecting
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
                  ? attempt.subjectCode
                  : attempt.subjectName || ""}
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
                  <p className="text-3xl font-bold text-primary">{timeLeft}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Progress value={progress} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
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
                    answers[currentQuestion.id] === false
                      ? "default"
                      : "outline"
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
              <Button onClick={() => setCheatDialogOpen(false)}>
                Continue
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to finish the exam? Once submitted, you
              cannot change your answers.
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
            <Button onClick={confirmSubmit} disabled={submitting}>
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
