"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { validateTestAccessCode } from "@/actions/Test";
import { CalendarClock, Clock, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

type StudentSubject = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  tests: Array<{
    id: string;
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    requiresCode: boolean;
    attemptSubmitted: boolean;
    cheatCount: number;
  }>;
};

interface StudentTestsPageClientProps {
  initialSubjects: StudentSubject[];
}

const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
};

const getDurationLabel = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  let diff = endDate.getTime() - startDate.getTime();
  const sameCalendarDay = startDate.toDateString() === endDate.toDateString();
  if (diff <= 0 && sameCalendarDay) {
    diff += 24 * 60 * 60 * 1000;
  }
  if (diff <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  const minuteLabel = `${pad(minutes)} minute${minutes === 1 ? "" : "s"}`;
  const secondLabel = `${pad(seconds)} second${seconds === 1 ? "" : "s"}`;

  return `${hourLabel}, ${minuteLabel}, ${secondLabel}`;
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

export function StudentTestsPageClient({
  initialSubjects,
}: StudentTestsPageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    initialSubjects[0]?.id || ""
  );
  const [now, setNow] = useState(() => Date.now());
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const subjectOptions = useMemo(
    () =>
      initialSubjects.map((subject) => ({
        id: subject.id,
        label: subject.name,
      })),
    [initialSubjects]
  );

  const selectedSubject = useMemo(
    () => initialSubjects.find((subject) => subject.id === selectedSubjectId),
    [initialSubjects, selectedSubjectId]
  );

  const selectedTests = selectedSubject?.tests ?? [];

  const getTimeLeftLabel = useCallback(
    (test: StudentSubject["tests"][number]) => {
      if (!test.startDate || !test.endDate) {
        return null;
      }
      const start = new Date(test.startDate).getTime();
      const end = new Date(test.endDate).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return null;
      }
      if (now < start) {
        return `Starts in ${formatCountdown(start - now)}`;
      }
      if (now > end) {
        return "Test window ended";
      }
      return `Time left: ${formatCountdown(end - now)}`;
    },
    [now]
  );

  const isTestStarted = useCallback(
    (test: StudentSubject["tests"][number]) => {
      if (!test.startDate) {
        return true; // If no start date, allow starting
      }
      const start = new Date(test.startDate).getTime();
      if (Number.isNaN(start)) {
        return true; // If invalid date, allow starting
      }
      return now >= start;
    },
    [now]
  );

  const isTestEnded = useCallback(
    (test: StudentSubject["tests"][number]) => {
      if (!test.endDate) {
        return false; // If no end date, test is not ended
      }
      const end = new Date(test.endDate).getTime();
      if (Number.isNaN(end)) {
        return false; // If invalid date, test is not ended
      }
      return now > end;
    },
    [now]
  );

  const handleStartTest = (test: StudentSubject["tests"][number]) => {
    if (test.attemptSubmitted || test.cheatCount > 0) {
      toast.error("Already attempted", {
        description:
          test.cheatCount > 0
            ? "You already did the test indicate cheating."
            : "You have already completed this test.",
      });
      return;
    }
    if (!isTestStarted(test)) {
      toast.error("Test not started", {
        description:
          "The test has not started yet. Please wait for the scheduled start time.",
      });
      return;
    }
    if (isTestEnded(test)) {
      toast.error("Test ended", {
        description:
          "The test window has ended. You can no longer start this test.",
      });
      return;
    }
    if (test.requiresCode) {
      setActiveTest({ id: test.id, title: test.title });
      setCodeDigits(["", "", "", "", "", ""]);
      setCodeDialogOpen(true);
      return;
    }
    router.push(`/exam/${test.id}`);
  };

  const handleConfirmCode = async () => {
    if (!activeTest) {
      return;
    }
    const code = codeDigits.join("");
    if (code.length !== 6) {
      toast.error("Please enter the 6-character access code.");
      return;
    }
    setCodeLoading(true);
    try {
      const validation = await validateTestAccessCode(activeTest.id, code);
      if (validation.success) {
        setCodeDialogOpen(false);
        router.push(`/exam/${activeTest.id}?code=${code}`);
      } else {
        const message =
          validation.data && "message" in validation.data
            ? validation.data.message
            : "Invalid access code";
        toast.error(message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to validate code. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-full bg-muted animate-pulse" />
        <div className="h-32 rounded-xl border border-border/60 bg-card/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">My Tests</h1>
        <p className="text-sm text-muted-foreground">
          Choose a subject to see the tests currently available to you.
        </p>
      </div>

      {initialSubjects.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No subjects assigned</CardTitle>
            <CardDescription>
              Once you are enrolled in subjects, you will see the tests here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Available Subjects
            </p>
            <Tabs
              value={selectedSubjectId || subjectOptions[0]?.id}
              onValueChange={setSelectedSubjectId}
              className="w-full"
            >
              <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-muted/60 p-1 rounded-lg">
                {subjectOptions.map((subject) => (
                  <TabsTrigger
                    key={subject.id}
                    value={subject.id}
                    className="px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {subject.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Available Tests</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSubject?.name || "Select a subject to view tests"}
                </p>
              </div>
              <Badge variant="secondary">
                {selectedTests.length} test
                {selectedTests.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {selectedTests.length === 0 ? (
              <Card className="border border-dashed">
                <CardHeader className="flex flex-row items-start gap-3">
                  <Info className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <CardTitle className="text-base">No tests yet</CardTitle>
                    <CardDescription>
                      When your lecturer publishes a test for this subject, it
                      will show up here.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {selectedTests.map((test) => {
                  const start = formatDate(test.startDate);
                  const end = formatDate(test.endDate);
                  const durationLabel = getDurationLabel(
                    test.startDate,
                    test.endDate
                  );
                  const timeLeft = getTimeLeftLabel(test);
                  const testStarted = isTestStarted(test);
                  const testEnded = isTestEnded(test);
                  const hasCheating = test.cheatCount > 0;
                  const canStart =
                    testStarted &&
                    !testEnded &&
                    !test.attemptSubmitted &&
                    !hasCheating;

                  let statusText = "Start Test";
                  let statusVariant:
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline" = "default";

                  if (test.attemptSubmitted || hasCheating) {
                    statusText = hasCheating
                      ? "Cheating Detected"
                      : "Completed";
                    statusVariant = hasCheating ? "destructive" : "secondary";
                  } else if (!testStarted) {
                    statusText = "Not Started";
                    statusVariant = "outline";
                  } else if (testEnded) {
                    statusText = "Test Ended";
                    statusVariant = "secondary";
                  }

                  return (
                    <Card
                      key={test.id}
                      className={`border border-border/70 ${
                        hasCheating || test.attemptSubmitted
                          ? "bg-muted/50 opacity-60"
                          : "bg-card/70"
                      }`}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg font-semibold">
                                {test.title}
                              </CardTitle>
                              {!canStart && (
                                <Badge
                                  variant={statusVariant}
                                  className="text-xs"
                                >
                                  {statusText}
                                </Badge>
                              )}
                            </div>
                            {test.description ? (
                              <CardDescription className="line-clamp-2">
                                {test.description}
                              </CardDescription>
                            ) : null}
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {selectedSubject?.code || "Subject"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 pt-2">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <CalendarClock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Schedule</p>
                              <p className="text-muted-foreground">
                                {start ? start : "TBA"} — {end ? end : "TBA"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Duration</p>
                              <p className="text-muted-foreground">
                                {durationLabel || "Not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium">Time Remaining</p>
                              <p className="text-muted-foreground">
                                {timeLeft || "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                        {canStart && (
                          <div className="flex items-center justify-end pt-2">
                            <Button
                              className="cursor-pointer"
                              size="sm"
                              onClick={() => handleStartTest(test)}
                            >
                              Start Test
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Access Code</DialogTitle>
            <DialogDescription>
              Provide the 6-character code from your lecturer to begin{" "}
              <span className="font-semibold">{activeTest?.title}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-center gap-2">
              {codeDigits.map((digit, index) => (
                <Input
                  key={index}
                  id={`modal-code-${index}`}
                  value={digit}
                  onChange={(event) => {
                    const normalized = event.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase();
                    const char = normalized.slice(-1);
                    const nextDigits = [...codeDigits];
                    nextDigits[index] = char;
                    setCodeDigits(nextDigits);
                    if (char && index < codeDigits.length - 1) {
                      const nextInput = document.getElementById(
                        `modal-code-${index + 1}`
                      ) as HTMLInputElement | null;
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Backspace" &&
                      !codeDigits[index] &&
                      index > 0
                    ) {
                      const prevInput = document.getElementById(
                        `modal-code-${index - 1}`
                      ) as HTMLInputElement | null;
                      prevInput?.focus();
                    }
                  }}
                  maxLength={1}
                  className="w-12 h-12 text-center text-xl font-semibold uppercase"
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCodeDialogOpen(false)}
              disabled={codeLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={handleConfirmCode}
              disabled={codeLoading}
            >
              {codeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
