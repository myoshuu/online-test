"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
} from "@/actions/Question";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { questionFormSchema, bulkQuestionsSchema } from "@/helpers/Zod";

type Question = {
  id: string;
  question: string;
  isCorrect: boolean | null;
  order: number | null;
};

type Test = {
  id: string;
  title: string;
  description: string | null;
  Subject: {
    id: string;
    name: string;
    code: string | null;
  };
  questions: Question[];
};

interface EditTestPageClientProps {
  test: Test;
  backHrefBase?: string;
}

const hasQuestionPayload = (
  payload: unknown
): payload is { question: Question } =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      "question" in payload &&
      payload.question
  );

const hasQuestionsPayload = (
  payload: unknown
): payload is { questions: Question[]; count: number } =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      "questions" in payload &&
      Array.isArray(payload.questions)
  );

const hasMessagePayload = (payload: unknown): payload is { message: string } =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
  );

export function EditTestPageClient({
  test,
  backHrefBase = "/dashboard/admin/questions",
}: EditTestPageClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(test.questions);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    questionId: string | null;
  }>({ open: false, questionId: null });
  const [formData, setFormData] = useState({
    question: "",
    isCorrect: null as boolean | null,
  });
  const [singleQuestionError, setSingleQuestionError] = useState<string | null>(
    null
  );
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkQuestions, setBulkQuestions] = useState<
    Array<{ question: string; isCorrect: boolean | null }>
  >([{ question: "", isCorrect: null }]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [questionMode, setQuestionMode] = useState<"single" | "bulk">("single");
  const [searchTerm, setSearchTerm] = useState("");

  const questionsWithOrder = useMemo(
    () =>
      questions.map((question, index) => ({
        data: question,
        displayOrder: question.order ?? index + 1,
      })),
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return questionsWithOrder;
    }
    return questionsWithOrder.filter(({ data, displayOrder }) => {
      const orderLabel = `question ${displayOrder}`.toLowerCase();
      const orderNumber = displayOrder.toString();
      return (
        orderLabel.includes(term) ||
        orderNumber.includes(term) ||
        data.question.toLowerCase().includes(term)
      );
    });
  }, [questionsWithOrder, searchTerm]);

  const handleAddQuestion = async () => {
    const validation = questionFormSchema.safeParse(formData);
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message || "Question text is required";
      setSingleQuestionError(message);
      return;
    }
    setSingleQuestionError(null);
    const parsedQuestion = validation.data;

    setLoading(true);
    try {
      const result = await createQuestion({
        question: parsedQuestion.question,
        isCorrect: parsedQuestion.isCorrect ?? null,
        testId: test.id,
      });

      const responsePayload = result.data;

      if (
        result.success &&
        responsePayload &&
        hasQuestionPayload(responsePayload)
      ) {
        setQuestions([...questions, responsePayload.question]);
        setFormData({ question: "", isCorrect: null });
        toast.success("Question Added", {
          description: "Question has been added successfully",
        });
      } else {
        toast.error("Creation Failed", {
          description:
            (responsePayload &&
              hasMessagePayload(responsePayload) &&
              responsePayload.message) ||
            "Failed to add question",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "An error occurred while adding question",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      question: question.question,
      isCorrect: question.isCorrect,
    });
  };

  const handleUpdateQuestion = async () => {
    if (!editingId) {
      setSingleQuestionError("Question selection is missing");
      return;
    }
    const validation = questionFormSchema.safeParse(formData);
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message || "Question text is required";
      setSingleQuestionError(message);
      return;
    }
    setSingleQuestionError(null);
    const parsedQuestion = validation.data;

    setLoading(true);
    try {
      const result = await updateQuestion(editingId, {
        question: parsedQuestion.question,
        isCorrect: parsedQuestion.isCorrect ?? null,
      });

      const responsePayload = result.data;

      if (
        result.success &&
        responsePayload &&
        hasQuestionPayload(responsePayload)
      ) {
        setQuestions(
          questions.map((q) =>
            q.id === editingId ? responsePayload.question : q
          )
        );
        setEditingId(null);
        setFormData({ question: "", isCorrect: null });
        toast.success("Question Updated", {
          description: "Question has been updated successfully",
        });
      } else {
        toast.error("Update Failed", {
          description:
            (responsePayload &&
              hasMessagePayload(responsePayload) &&
              responsePayload.message) ||
            "Failed to update question",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "An error occurred while updating question",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirm.questionId) return;

    setLoading(true);
    try {
      const result = await deleteQuestion(deleteConfirm.questionId);

      if (result.success) {
        setQuestions(
          questions.filter((q) => q.id !== deleteConfirm.questionId)
        );
        setDeleteConfirm({ open: false, questionId: null });
        toast.success("Question Deleted", {
          description: "Question has been deleted successfully",
        });
      } else {
        toast.error("Delete Failed", {
          description:
            (hasMessagePayload(result.data) && result.data.message) ||
            "Failed to delete question",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "An error occurred while deleting question",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ question: "", isCorrect: null });
  };

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
            <BreadcrumbLink asChild>
              <Link href={backHrefBase}>Questions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{test.title}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Question Builder</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{test.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {test.Subject.code && `${test.Subject.code} - `}
            {test.Subject.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            router.replace(
              `${backHrefBase}?subjectId=${test.Subject.id}&testId=${test.id}`
            )
          }
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Test Details
        </Button>
      </div>

      {/* Test Info */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          {test.description && (
            <p className="text-sm text-muted-foreground">{test.description}</p>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Total Questions:{" "}
            <span className="font-semibold">{questions.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Question Form */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit Question" : "Add New Question"}
          </CardTitle>
          <CardDescription>
            {editingId
              ? "Update the question details below"
              : "Add a new question to this test"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!editingId && (
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                size="sm"
                variant={questionMode === "single" ? "default" : "outline"}
                onClick={() => setQuestionMode("single")}
                className="cursor-pointer"
              >
                Single
              </Button>
              <Button
                type="button"
                size="sm"
                variant={questionMode === "bulk" ? "default" : "outline"}
                onClick={() => setQuestionMode("bulk")}
                className="cursor-pointer"
              >
                Bulk
              </Button>
            </div>
          )}

          {(editingId || questionMode === "single") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="question" className="text-sm font-medium">
                  Question <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="Enter the question"
                  disabled={loading}
                  rows={3}
                />
                {singleQuestionError && (
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-red-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{singleQuestionError}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Correct Answer</label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={
                      formData.isCorrect === true ? "default" : "outline"
                    }
                    onClick={() =>
                      setFormData({ ...formData, isCorrect: true })
                    }
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    True
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.isCorrect === false ? "default" : "outline"
                    }
                    onClick={() =>
                      setFormData({ ...formData, isCorrect: false })
                    }
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    False
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.isCorrect === null ? "default" : "outline"
                    }
                    onClick={() =>
                      setFormData({ ...formData, isCorrect: null })
                    }
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    Not Set
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                {editingId ? (
                  <>
                    <Button
                      onClick={handleUpdateQuestion}
                      disabled={loading}
                      className="cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update Question
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAddQuestion}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {!editingId && questionMode === "bulk" && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {bulkQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="p-4 border border-border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-muted-foreground">
                        Question {index + 1}
                      </div>
                      {bulkQuestions.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setBulkQuestions(
                              bulkQuestions.filter((_, i) => i !== index)
                            )
                          }
                          className="cursor-pointer text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={question.question}
                      onChange={(e) => {
                        const updated = [...bulkQuestions];
                        updated[index].question = e.target.value;
                        setBulkQuestions(updated);
                      }}
                      placeholder="Enter the question text"
                      rows={2}
                      disabled={bulkLoading}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          question.isCorrect === true ? "default" : "outline"
                        }
                        onClick={() => {
                          const updated = [...bulkQuestions];
                          updated[index].isCorrect = true;
                          setBulkQuestions(updated);
                        }}
                        disabled={bulkLoading}
                        className="cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        True
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          question.isCorrect === false ? "default" : "outline"
                        }
                        onClick={() => {
                          const updated = [...bulkQuestions];
                          updated[index].isCorrect = false;
                          setBulkQuestions(updated);
                        }}
                        disabled={bulkLoading}
                        className="cursor-pointer"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        False
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          question.isCorrect === null ? "default" : "outline"
                        }
                        onClick={() => {
                          const updated = [...bulkQuestions];
                          updated[index].isCorrect = null;
                          setBulkQuestions(updated);
                        }}
                        disabled={bulkLoading}
                        className="cursor-pointer"
                      >
                        Not Set
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setBulkQuestions([
                      ...bulkQuestions,
                      { question: "", isCorrect: null },
                    ])
                  }
                  disabled={bulkLoading}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Question
                </Button>
                <Button
                  onClick={async () => {
                    const sanitized = bulkQuestions
                      .map((q) => ({
                        question: q.question,
                        isCorrect: q.isCorrect,
                      }))
                      .filter((q) => q.question.trim().length > 0);

                    const validation = bulkQuestionsSchema.safeParse(sanitized);
                    if (!validation.success) {
                      const message =
                        validation.error.issues[0]?.message ||
                        "Please add at least one question";
                      setBulkError(message);
                      return;
                    }
                    setBulkError(null);

                    setBulkLoading(true);
                    try {
                      const result = await bulkCreateQuestions(
                        test.id,
                        validation.data.map((q) => ({
                          question: q.question,
                          isCorrect: q.isCorrect ?? null,
                        }))
                      );
                      const payload = result.data;
                      if (
                        result.success &&
                        payload &&
                        hasQuestionsPayload(payload)
                      ) {
                        toast.success("Questions Added", {
                          description: `${payload.count} question(s) added successfully`,
                        });
                        setQuestions((prev) => [...prev, ...payload.questions]);
                        setBulkQuestions([{ question: "", isCorrect: null }]);
                      } else {
                        toast.error("Creation Failed", {
                          description:
                            (payload &&
                              hasMessagePayload(payload) &&
                              payload.message) ||
                            "Failed to add questions",
                        });
                      }
                    } catch (error) {
                      console.error(error);
                      toast.error("Error", {
                        description: "An error occurred while adding questions",
                      });
                    } finally {
                      setBulkLoading(false);
                    }
                  }}
                  disabled={bulkLoading}
                  className="cursor-pointer"
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add{" "}
                      {bulkQuestions.filter((q) => q.question.trim()).length ||
                        0}{" "}
                      Question(s)
                    </>
                  )}
                </Button>
                {bulkError && (
                  <div className="mt-1 flex items-start gap-1.5 text-xs text-red-500 w-full">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{bulkError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
          <CardDescription>Manage questions for this test</CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No questions yet. Add your first question above.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  type="search"
                  placeholder="Search by question number or text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold">
                    {filteredQuestions.length}
                  </span>{" "}
                  of <span className="font-semibold">{questions.length}</span>{" "}
                  questions
                </p>
              </div>

              {filteredQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No questions match &quot;{searchTerm.trim()}&quot;. Try another
                  keyword or number.
                </p>
              ) : (
                filteredQuestions.map(({ data: question, displayOrder }) => (
                  <div
                    key={question.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-muted-foreground">
                            Question {displayOrder}:
                          </span>
                          {question.isCorrect !== null && (
                            <div className="flex items-center gap-1">
                              {question.isCorrect ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                Correct: {question.isCorrect ? "True" : "False"}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm">{question.question}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditQuestion(question)}
                          disabled={loading || editingId === question.id}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              questionId: question.id,
                            })
                          }
                          disabled={loading}
                          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, questionId: deleteConfirm.questionId })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              disabled={loading}
              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
