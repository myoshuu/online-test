"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTest } from "@/actions/Test";
import { bulkCreateQuestions } from "@/actions/Question";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTestFormSchema,
  type CreateTestFormInput,
  questionFormSchema,
  bulkQuestionsSchema,
} from "@/helpers/Zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

interface CreateTestPageClientProps {
  initialSubjects: Subject[];
  homeHref?: string;
  builderBaseHref?: string;
}

export function CreateTestPageClient({
  initialSubjects,
  homeHref = "/dashboard/admin/questions",
  builderBaseHref = "/dashboard/admin/questions",
}: CreateTestPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateTestFormInput>({
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
  const [singleQuestion, setSingleQuestion] = useState<{
    question: string;
    isCorrect: boolean | null;
  }>({ question: "", isCorrect: null });
  const [bulkQuestions, setBulkQuestions] = useState<
    Array<{ question: string; isCorrect: boolean | null }>
  >([{ question: "", isCorrect: null }]);
  const [addQuestionsNow, setAddQuestionsNow] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  const handleSubmit = async (values: CreateTestFormInput) => {
    setLoading(true);
    try {
      // Combine date and time for start and end
      let startDate: string | null = null;
      let endDate: string | null = null;

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

      if (startDateObj) {
        startDate = startDateObj.toISOString();
      }
      if (endDateObj) {
        endDate = endDateObj.toISOString();
      }

      const result = await createTest({
        title: values.title.trim(),
        description: values.description?.trim() || null,
        subjectId: values.subjectId,
        startDate,
        endDate,
      });

      if (result.success && result.data && "test" in result.data) {
        const testId = result.data.test.id;

        // If questions were added, create them
        if (addQuestionsNow) {
          let questionsPayload: Array<{
            question: string;
            isCorrect: boolean | null;
          }> = [];

          if (bulkMode) {
            const sanitized = bulkQuestions
              .map((q) => ({
                question: q.question,
                isCorrect: q.isCorrect,
              }))
              .filter((q) => q.question.trim().length > 0);

            if (sanitized.length > 0) {
              const validation = bulkQuestionsSchema.safeParse(sanitized);
              if (!validation.success) {
                toast.error("Question Validation Error", {
                  description:
                    validation.error.issues[0]?.message ||
                    "Invalid question input",
                });
                setLoading(false);
                return;
              }
              questionsPayload = validation.data.map((q) => ({
                question: q.question,
                isCorrect: q.isCorrect ?? null,
              }));
            }
          } else if (singleQuestion.question.trim()) {
            const validation = questionFormSchema.safeParse(singleQuestion);
            if (!validation.success) {
              toast.error("Question Validation Error", {
                description:
                  validation.error.issues[0]?.message ||
                  "Invalid question input",
              });
              setLoading(false);
              return;
            }
            const parsed = validation.data;
            questionsPayload = [
              {
                question: parsed.question,
                isCorrect: parsed.isCorrect ?? null,
              },
            ];
          }

          if (questionsPayload.length > 0) {
            const questionsResult = await bulkCreateQuestions(
              testId,
              questionsPayload
            );

            if (questionsResult.success) {
              toast.success("Test Created", {
                description: `Test created with ${questionsPayload.length} question(s) successfully.`,
              });
            } else {
              toast.success("Test Created", {
                description:
                  "Test created successfully, but failed to add questions.",
              });
            }
          } else {
            toast.success("Test Created", {
              description:
                "Test has been created successfully. You can now add questions.",
            });
          }
        } else {
          toast.success("Test Created", {
            description:
              "Test has been created successfully. You can now add questions.",
          });
        }

        router.push(`${builderBaseHref}/${testId}/edit`);
      } else {
        const errorMessage =
          result.data && "message" in result.data
            ? result.data.message
            : "Failed to create test";
        toast.error("Creation Failed", {
          description: errorMessage,
        });
      }
    } catch {
      toast.error("Error", {
        description: "An error occurred while creating test",
      });
    } finally {
      setLoading(false);
    }
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
              <Link href={homeHref}>Questions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Create Test</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Create New Test</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create a new quiz/test for a subject
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(homeHref)}
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-primary" />
            Test Information
          </CardTitle>
          <CardDescription>Fill in the test details below</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Subject <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {initialSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.code ? `${subject.code} - ` : ""}
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Test Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter test title"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter test description (optional)"
                        rows={4}
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Questions Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Add Questions (Optional)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can add questions now or later
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={addQuestionsNow ? "default" : "outline"}
                    onClick={() => {
                      const nextState = !addQuestionsNow;
                      setAddQuestionsNow(nextState);
                      if (!nextState) {
                        setBulkMode(false);
                        setSingleQuestion({ question: "", isCorrect: null });
                        setBulkQuestions([{ question: "", isCorrect: null }]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {addQuestionsNow ? (
                      "Cancel"
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {addQuestionsNow ? "" : "Add Questions"}
                  </Button>
                </div>

                {addQuestionsNow && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={!bulkMode ? "default" : "outline"}
                        onClick={() => {
                          setBulkMode(false);
                          setSingleQuestion({ question: "", isCorrect: null });
                        }}
                        disabled={loading}
                        className="cursor-pointer"
                      >
                        Single
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={bulkMode ? "default" : "outline"}
                        onClick={() => {
                          setBulkMode(true);
                          setBulkQuestions([{ question: "", isCorrect: null }]);
                        }}
                        disabled={loading}
                        className="cursor-pointer"
                      >
                        Bulk
                      </Button>
                    </div>

                    {bulkMode ? (
                      <>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {bulkQuestions.map((q, index) => (
                            <div
                              key={index}
                              className="p-4 border border-border rounded-lg bg-muted/20 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-muted-foreground">
                                  Question {index + 1}
                                </span>
                                {bulkQuestions.length > 1 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setBulkQuestions(
                                        bulkQuestions.filter(
                                          (_, i) => i !== index
                                        )
                                      );
                                    }}
                                    className="cursor-pointer text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Textarea
                                  value={q.question}
                                  onChange={(e) => {
                                    const updated = [...bulkQuestions];
                                    updated[index].question = e.target.value;
                                    setBulkQuestions(updated);
                                  }}
                                  placeholder="Enter the question"
                                  rows={2}
                                  disabled={loading}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Correct Answer
                                </label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      q.isCorrect === true
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => {
                                      const updated = [...bulkQuestions];
                                      updated[index].isCorrect = true;
                                      setBulkQuestions(updated);
                                    }}
                                    disabled={loading}
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    True
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      q.isCorrect === false
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => {
                                      const updated = [...bulkQuestions];
                                      updated[index].isCorrect = false;
                                      setBulkQuestions(updated);
                                    }}
                                    disabled={loading}
                                    className="cursor-pointer"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    False
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      q.isCorrect === null
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => {
                                      const updated = [...bulkQuestions];
                                      updated[index].isCorrect = null;
                                      setBulkQuestions(updated);
                                    }}
                                    disabled={loading}
                                    className="cursor-pointer"
                                  >
                                    Not Set
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setBulkQuestions([
                              ...bulkQuestions,
                              { question: "", isCorrect: null },
                            ]);
                          }}
                          disabled={loading}
                          className="cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Question
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Question
                          </label>
                          <Textarea
                            value={singleQuestion.question}
                            onChange={(e) => {
                              setSingleQuestion({
                                ...singleQuestion,
                                question: e.target.value,
                              });
                            }}
                            placeholder="Enter the question"
                            rows={3}
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Correct Answer
                          </label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                singleQuestion.isCorrect === true
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => {
                                setSingleQuestion({
                                  ...singleQuestion,
                                  isCorrect: true,
                                });
                              }}
                              disabled={loading}
                              className="cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              True
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                singleQuestion.isCorrect === false
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => {
                                setSingleQuestion({
                                  ...singleQuestion,
                                  isCorrect: false,
                                });
                              }}
                              disabled={loading}
                              className="cursor-pointer"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              False
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                singleQuestion.isCorrect === null
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => {
                                setSingleQuestion({
                                  ...singleQuestion,
                                  isCorrect: null,
                                });
                              }}
                              disabled={loading}
                              className="cursor-pointer"
                            >
                              Not Set
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Test"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(homeHref)}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
