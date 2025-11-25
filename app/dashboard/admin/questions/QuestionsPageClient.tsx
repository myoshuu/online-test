"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getTestDetails } from "@/actions/Question";
import {
  updateTest,
  regenerateTestAccessCode,
  clearStudentCheating,
} from "@/actions/Test";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  FileQuestion,
  CheckCircle,
  XCircle,
  Users,
  Loader2,
  ArrowLeft,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTestFormSchema, type CreateTestFormInput } from "@/helpers/Zod";

type Subject = {
  id: string;
  name: string;
  code: string | null;
  totalTests: number;
  tests: Array<{
    id: string;
    title: string;
    totalQuestions: number;
    totalAttempts: number;
  }>;
};

const computeDurationMinutes = (
  start?: Date | string | null,
  end?: Date | string | null
) => {
  if (!start || !end) {
    return null;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  let diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs <= 0) {
    const sameCalendarDay = startDate.toDateString() === endDate.toDateString();
    if (sameCalendarDay) {
      diffMs += 24 * 60 * 60 * 1000;
    }
  }

  if (diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / (1000 * 60));
};

const toLocalInputDate = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toLocalInputTime = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(11, 16);
};

type TestDetails = {
  test: {
    id: string;
    title: string;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    subject: {
      id: string;
      name: string;
      code: string | null;
    };
  };
  questions: Array<{
    id: string;
    question: string;
    correctAnswer: boolean | null;
    order: number | null;
  }>;
  respondents: Array<{
    attemptId: string;
    userId: string;
    userName: string;
    userNim: string;
    overallScore: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: Date | string | null;
    startedAt: Date | string | null;
    endAt: Date | string | null;
    cheatCount: number;
    questionAnswers: Array<{
      questionId: string;
      question: string;
      correctAnswer: boolean | null;
      studentAnswer: boolean | null;
      isCorrect: boolean;
      order: number | null;
    }>;
  }>;
  totalQuestions: number;
  totalRespondents: number;
};

interface QuestionsPageClientProps {
  initialSubjects: Subject[];
  createHref?: string;
  builderBaseHref?: string;
  canEditTestInfo?: boolean;
}

export function QuestionsPageClient({
  initialSubjects,
  createHref = "/dashboard/admin/questions/create",
  builderBaseHref = "/dashboard/admin/questions",
  canEditTestInfo = true,
}: QuestionsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Initialize from URL params to prevent blinking
  const initialSubjectId = searchParams.get("subjectId") || "";
  const initialTestId = searchParams.get("testId") || "";
  const [selectedSubjectId, setSelectedSubjectId] =
    useState<string>(initialSubjectId);
  const [selectedTestId, setSelectedTestId] = useState<string>(initialTestId);
  const [loading, setLoading] = useState(false);
  const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
  // Initialize viewMode based on URL params to prevent blinking
  const [viewMode, setViewMode] = useState<"list" | "details">(() => {
    const testId = searchParams.get("testId");
    return testId ? "details" : "list";
  });
  const [editingTestInfo, setEditingTestInfo] = useState(false);
  const [updatingTest, setUpdatingTest] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [clearingCheating, setClearingCheating] = useState<string | null>(null);
  const isNavigatingBackRef = useRef(false);
  const editForm = useForm<CreateTestFormInput>({
    resolver: zodResolver(createTestFormSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
    },
  });
  const {
    control,
    register,
    handleSubmit: handleEditFormSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = editForm;
  const selectedSubject = initialSubjects.find(
    (s) => s.id === selectedSubjectId
  );
  const availableTests = selectedSubject?.tests || [];

  const populateTestForm = useCallback(
    (test: TestDetails["test"]) => {
      resetEditForm({
        title: test.title || "",
        description: test.description || "",
        subjectId: test.subject.id,
        startDate: toLocalInputDate(test.startDate),
        startTime: toLocalInputTime(test.startDate),
        endDate: toLocalInputDate(test.endDate),
        endTime: toLocalInputTime(test.endDate),
      });
    },
    [resetEditForm]
  );

  const loadTestDetails = useCallback(
    async (testId: string) => {
      setLoading(true);
      try {
        const result = await getTestDetails(testId);
        if (result.success && result.data && "test" in result.data) {
          const testSubjectId = result.data.test.subject.id;
          const currentSubjectId = searchParams.get("subjectId");

          // If a subject is explicitly selected and the test belongs to a different subject,
          // don't load it (user has changed subject)
          if (
            selectedSubjectId &&
            selectedSubjectId !== testSubjectId &&
            currentSubjectId !== testSubjectId
          ) {
            setLoading(false);
            setSelectedTestId("");
            setTestDetails(null);
            setViewMode("list");
            return;
          }

          setTestDetails(result.data);
          setViewMode("details");
          populateTestForm(result.data.test);
          setAccessCode(result.data.test.accessCode || null);

          // Set the subject ID from the test data to preserve it on refresh
          // Only update if URL already has this subjectId (preserving on refresh)
          // or if no subject is currently selected
          if (
            testSubjectId &&
            (currentSubjectId === testSubjectId || !selectedSubjectId)
          ) {
            if (testSubjectId !== selectedSubjectId) {
              setSelectedSubjectId(testSubjectId);
            }
          }

          // Update URL params to preserve state on refresh
          const urlSubjectId = selectedSubjectId || testSubjectId;
          const currentTestId = searchParams.get("testId");
          if (currentSubjectId !== urlSubjectId || currentTestId !== testId) {
            const params = new URLSearchParams();
            params.set("subjectId", urlSubjectId);
            params.set("testId", testId);
            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load test details:", error);
      } finally {
        setLoading(false);
      }
    },
    [populateTestForm, selectedSubjectId, router, pathname, searchParams]
  );

  const handleTestSelect = async (testId: string) => {
    if (!testId) {
      setTestDetails(null);
      setViewMode("list");
      return;
    }

    setSelectedTestId(testId);
    await loadTestDetails(testId);
  };

  const handleBackToList = () => {
    // Mark that we're intentionally navigating back
    isNavigatingBackRef.current = true;

    // Clear state immediately
    setViewMode("list");
    setTestDetails(null);
    setSelectedTestId("");
    setEditingTestInfo(false);

    // Update URL to match the cleared state
    const params = new URLSearchParams();
    if (selectedSubjectId) {
      params.set("subjectId", selectedSubjectId);
    }
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      {
        scroll: false,
      }
    );

    // Reset the flag after navigation
    setTimeout(() => {
      isNavigatingBackRef.current = false;
    }, 100);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Skip if we're intentionally navigating back
    if (isNavigatingBackRef.current) {
      return;
    }

    const subjectFromParams = searchParams.get("subjectId");
    const testFromParams = searchParams.get("testId");

    if (subjectFromParams) {
      setSelectedSubjectId(subjectFromParams);
    }

    if (testFromParams) {
      // Set viewMode to details immediately to prevent blinking
      setViewMode("details");
      setSelectedTestId(testFromParams);
      loadTestDetails(testFromParams);
    } else {
      // Clear test details immediately if testId is not in URL
      if (testFromParams === null) {
        setSelectedTestId("");
        setTestDetails(null);
        setViewMode("list");
        setEditingTestInfo(false);
      }
    }
  }, [searchParams, loadTestDetails, selectedTestId]);

  const handleUpdateTest = handleEditFormSubmit(async (values) => {
    if (!testDetails) return;
    setUpdatingTest(true);
    try {
      const dayInMs = 24 * 60 * 60 * 1000;
      let startDateObj: Date | null = null;
      let endDateObj: Date | null = null;

      if (values.startDate) {
        const startTime = values.startTime || "00:00";
        startDateObj = new Date(`${values.startDate}T${startTime}`);
      }

      if (values.endDate) {
        const endTime = values.endTime || "23:59:59";
        endDateObj = new Date(`${values.endDate}T${endTime}`);
      }

      if (
        startDateObj &&
        endDateObj &&
        endDateObj.getTime() <= startDateObj.getTime() &&
        values.startDate === values.endDate
      ) {
        endDateObj = new Date(endDateObj.getTime() + dayInMs);
      }

      const startDate = startDateObj ? startDateObj.toISOString() : null;
      const endDate = endDateObj ? endDateObj.toISOString() : null;

      const result = await updateTest(testDetails.test.id, {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        subjectId: values.subjectId,
        startDate,
        endDate,
      });

      if (result.success) {
        const refreshed = await getTestDetails(testDetails.test.id);
        if (refreshed.success && refreshed.data && "test" in refreshed.data) {
          setTestDetails(refreshed.data);
          setEditingTestInfo(false);
          populateTestForm(refreshed.data.test);
          toast.success("Test updated", {
            description: "Test information has been updated successfully.",
          });
        }
      } else {
        const message =
          result.data && "message" in result.data
            ? result.data.message
            : "Failed to update test";
        toast.error("Update failed", { description: message });
      }
    } finally {
      setUpdatingTest(false);
    }
  });

  const handleRegenerateCode = useCallback(async () => {
    if (!testDetails) return;
    setRegeneratingCode(true);
    try {
      const result = await regenerateTestAccessCode(testDetails.test.id);
      if (result.success && result.data && "accessCode" in result.data) {
        const newCode = result.data.accessCode;
        setAccessCode(newCode);
        toast.success("Access code regenerated", {
          description: "Share this code with students to start the test.",
        });
      } else {
        const message =
          result.data && "message" in result.data
            ? result.data.message
            : "Failed to regenerate code";
        toast.error("Error", { description: message });
      }
    } catch (error) {
      console.error(error);
      toast.error("Unexpected error while regenerating the access code.");
    } finally {
      setRegeneratingCode(false);
    }
  }, [testDetails]);

  const handleClearCheating = useCallback(
    async (attemptId: string) => {
      if (!testDetails) return;
      setClearingCheating(attemptId);
      try {
        const result = await clearStudentCheating(attemptId);
        if (result.success) {
          const refreshed = await getTestDetails(testDetails.test.id);
          if (refreshed.success && refreshed.data && "test" in refreshed.data) {
            setTestDetails(refreshed.data);
            toast.success("Cheating cleared", {
              description: "The student can now retake the test.",
            });
          }
        } else {
          const message =
            result.data && "message" in result.data
              ? result.data.message
              : "Failed to clear cheating";
          toast.error("Error", { description: message });
        }
      } catch (error) {
        console.error(error);
        toast.error("Unexpected error while clearing cheating.");
      } finally {
        setClearingCheating(null);
      }
    },
    [testDetails]
  );

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-xl border border-border/60 bg-card/50 animate-pulse" />
      </div>
    );
  }

  // Show loading state when navigating to details view
  if (viewMode === "details" && !testDetails && (loading || selectedTestId)) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-96 rounded-xl border border-border/60 bg-card/50 animate-pulse" />
      </div>
    );
  }

  if (viewMode === "details" && testDetails) {
    return (
      <>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button
                    onClick={handleBackToList}
                    className="cursor-pointer hover:underline"
                  >
                    Questions
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{testDetails.test.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {testDetails.test.title}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {testDetails.test.subject.code &&
                  `${testDetails.test.subject.code} - `}
                {testDetails.test.subject.name}
              </p>
            </div>
          </div>

          {/* Test Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Test Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testDetails.test.description && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm">{testDetails.test.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Questions
                    </p>
                    <p className="text-2xl font-bold">
                      {testDetails.totalQuestions}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Respondents
                    </p>
                    <p className="text-2xl font-bold">
                      {testDetails.totalRespondents}
                    </p>
                  </div>
                </div>
                {testDetails.test.startDate && testDetails.test.endDate && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-xs font-semibold text-muted-foreground">
                        Test Duration
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {(() => {
                        const minutes = computeDurationMinutes(
                          testDetails.test.startDate,
                          testDetails.test.endDate
                        );
                        return minutes ? `${minutes} min` : "Not available";
                      })()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Schedule</CardTitle>
                  <CardDescription>
                    Start and end dates for this test
                  </CardDescription>
                </div>
                {canEditTestInfo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!testDetails) return;
                      populateTestForm(testDetails.test);
                      setEditingTestInfo(true);
                    }}
                    className="cursor-pointer"
                  >
                    {editingTestInfo ? "Close Edit" : "Edit Test Info"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {testDetails.test.startDate ? (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Start Date & Time
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDateTime(new Date(testDetails.test.startDate))}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground">
                      No start date set
                    </p>
                  </div>
                )}
                {testDetails.test.endDate ? (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      End Date & Time
                    </p>
                    <p className="text-sm font-semibold">
                      {formatDateTime(new Date(testDetails.test.endDate))}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground">
                      No end date set
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Created
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDateTime(new Date(testDetails.test.createdAt))}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border bg-card">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Access Code</CardTitle>
                  <CardDescription>
                    Students must enter this code to start the test.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                  className="cursor-pointer"
                >
                  {regeneratingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate"
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {accessCode ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Share this 6-character code with your students.
                    </p>
                    <div className="text-3xl font-mono font-bold tracking-[0.5em]">
                      {accessCode}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No access code set yet. Click regenerate to create one.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Questions and Respondents Tabs */}
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-primary" />
                Test Details
              </CardTitle>
              <CardDescription>
                View questions, correct answers, and student responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="questions"
                    className="flex items-center gap-2"
                  >
                    <FileQuestion className="w-4 h-4" />
                    Questions ({testDetails.totalQuestions})
                  </TabsTrigger>
                  <TabsTrigger
                    value="respondents"
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Respondents ({testDetails.totalRespondents})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="mt-4 space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Questions</h3>
                      <p className="text-sm text-muted-foreground">
                        View or edit the question bank for this test
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        router.push(
                          `${builderBaseHref}/${testDetails.test.id}/edit`
                        )
                      }
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Open Question Builder
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden border border-border rounded-lg">
                          <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16 border-r border-border">
                                  No.
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Question
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-48">
                                  Correct Answer
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                              {testDetails.questions.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-4 py-10 text-center text-muted-foreground text-sm"
                                  >
                                    No questions found
                                  </td>
                                </tr>
                              ) : (
                                testDetails.questions.map((question, index) => (
                                  <tr
                                    key={question.id}
                                    className="hover:bg-muted/40 transition-colors"
                                  >
                                    <td className="px-4 py-3 text-sm font-semibold text-muted-foreground border-r border-border">
                                      {question.order ?? index + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm border-r border-border">
                                      {question.question}
                                    </td>
                                    <td className="px-4 py-3">
                                      {question.correctAnswer !== null ? (
                                        <div className="flex items-center gap-2">
                                          {question.correctAnswer ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                          )}
                                          <span className="text-sm font-semibold">
                                            {question.correctAnswer
                                              ? "True"
                                              : "False"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          Not set
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="respondents" className="mt-6">
                  <div className="relative">
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden border border-border rounded-lg">
                          <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="sticky left-0 z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Student
                                </th>
                                <th className="sticky left-[140px] z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  NIM
                                </th>
                                <th className="sticky left-[240px] z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Score
                                </th>
                                <th className="sticky left-[320px] z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Correct
                                </th>
                                <th className="sticky left-[420px] z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Submitted
                                </th>
                                <th className="sticky left-[520px] z-10 bg-muted/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border">
                                  Cheat Count
                                </th>
                                {testDetails.questions.map((q, idx) => (
                                  <th
                                    key={q.id}
                                    className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[60px] border-l border-border"
                                    title={q.question}
                                  >
                                    Q{q.order ?? idx + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                              {testDetails.respondents.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6 + testDetails.questions.length}
                                    className="px-4 py-10 text-center text-muted-foreground text-sm"
                                  >
                                    No respondents yet
                                  </td>
                                </tr>
                              ) : (
                                testDetails.respondents.map((respondent) => (
                                  <tr
                                    key={respondent.attemptId}
                                    className="hover:bg-muted/40 transition-colors"
                                  >
                                    <td className="sticky left-0 z-10 bg-card px-4 py-3 text-sm font-semibold border-r border-border">
                                      {respondent.userName}
                                    </td>
                                    <td className="sticky left-[140px] z-10 bg-card px-4 py-3 text-sm text-muted-foreground border-r border-border">
                                      {respondent.userNim}
                                    </td>
                                    <td className="sticky left-[240px] z-10 bg-card px-4 py-3 border-r border-border">
                                      <span
                                        className={`text-sm font-bold ${
                                          respondent.overallScore >= 70
                                            ? "text-emerald-600"
                                            : respondent.overallScore >= 50
                                            ? "text-orange-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {respondent.overallScore.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="sticky left-[320px] z-10 bg-card px-4 py-3 text-sm text-muted-foreground border-r border-border">
                                      {respondent.correctCount} /{" "}
                                      {respondent.totalQuestions}
                                    </td>
                                    <td className="sticky left-[420px] z-10 bg-card px-4 py-3 text-sm text-muted-foreground border-r border-border">
                                      {respondent.submittedAt
                                        ? formatDateTime(
                                            new Date(respondent.submittedAt)
                                          )
                                        : "Not submitted"}
                                    </td>
                                    <td className="sticky left-[520px] z-10 bg-card px-4 py-3 text-sm font-semibold border-r border-border">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={
                                            respondent.cheatCount > 0
                                              ? "text-destructive"
                                              : ""
                                          }
                                        >
                                          {respondent.cheatCount || 0}
                                        </span>
                                        {respondent.cheatCount > 0 && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() =>
                                              handleClearCheating(
                                                respondent.attemptId
                                              )
                                            }
                                            disabled={
                                              clearingCheating ===
                                              respondent.attemptId
                                            }
                                          >
                                            {clearingCheating ===
                                            respondent.attemptId ? (
                                              <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Clearing...
                                              </>
                                            ) : (
                                              "Clear"
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                    {respondent.questionAnswers.map((qa) => (
                                      <td
                                        key={qa.questionId}
                                        className="px-2 py-3 text-center border-l border-border"
                                      >
                                        {qa.studentAnswer !== null ? (
                                          <div className="flex items-center justify-center gap-0.5">
                                            {qa.isCorrect ? (
                                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                                            )}
                                            <span className="text-xs font-semibold">
                                              {qa.studentAnswer ? "T" : "F"}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    {testDetails.questions.length > 10 && (
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        Scroll horizontally to view all questions
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {canEditTestInfo && (
          <Dialog
            open={editingTestInfo}
            onOpenChange={(open) => {
              setEditingTestInfo(open);
              if (open && testDetails) {
                populateTestForm(testDetails.test);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Test Information</DialogTitle>
                <DialogDescription>
                  Update the basic details for this test.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateTest} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    {...register("title")}
                    placeholder="Enter test title"
                    disabled={updatingTest}
                  />
                  {editErrors.title && (
                    <p className="text-xs text-red-500">
                      {editErrors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    {...register("description")}
                    placeholder="Enter description"
                    rows={3}
                    disabled={updatingTest}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Controller
                    name="subjectId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={updatingTest}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {initialSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.code ? `${subject.code} - ` : ""}
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editErrors.subjectId && (
                    <p className="text-xs text-red-500">
                      {editErrors.subjectId.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      {...register("startDate")}
                      disabled={updatingTest}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="time"
                      {...register("startTime")}
                      disabled={updatingTest}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      {...register("endDate")}
                      disabled={updatingTest}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      {...register("endTime")}
                      disabled={updatingTest}
                    />
                  </div>
                </div>
                {(editErrors.startDate || editErrors.endDate) && (
                  <p className="text-xs text-red-500">
                    {editErrors.startDate?.message ||
                      editErrors.endDate?.message}
                  </p>
                )}
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTestInfo(false)}
                    disabled={updatingTest}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatingTest}
                    className="cursor-pointer"
                  >
                    {updatingTest ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Questions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Questions Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View quiz details, questions, answers, and student scores
          </p>
        </div>
        <Button
          onClick={() => router.push(createHref)}
          className="cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Subject Selector */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Select Subject</CardTitle>
          <CardDescription>
            Choose a subject to view its tests and quizzes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedSubjectId}
            onValueChange={(value) => {
              setSelectedSubjectId(value);
              setSelectedTestId("");
              setTestDetails(null);
              setViewMode("list");
              // Update URL to only include subjectId, clear testId
              const params = new URLSearchParams();
              params.set("subjectId", value);
              router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
              });
            }}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {initialSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} - ` : ""}
                  {subject.name} ({subject.totalTests} test
                  {subject.totalTests !== 1 ? "s" : ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Test Selector */}
      {selectedSubjectId && availableTests.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Select Test/Quiz</CardTitle>
            <CardDescription>
              Choose a test to view details, questions, and respondents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedTestId}
              onValueChange={handleTestSelect}
              disabled={loading}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a test" />
              </SelectTrigger>
              <SelectContent>
                {availableTests.map((test) => (
                  <SelectItem key={test.id} value={test.id}>
                    {test.title} ({test.totalQuestions} questions,{" "}
                    {test.totalAttempts} attempts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              Loading test details...
            </p>
          </div>
        </div>
      )}

      {/* Empty States */}
      {selectedSubjectId && availableTests.length === 0 && (
        <Card className="border border-border bg-card">
          <CardContent className="py-12 text-center">
            <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No tests found for this subject
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedSubjectId && (
        <Card className="border border-border bg-card">
          <CardContent className="py-12 text-center">
            <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please select a subject to view tests
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
