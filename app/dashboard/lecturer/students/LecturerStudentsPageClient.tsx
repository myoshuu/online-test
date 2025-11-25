"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dateUtils";
import {
  Search,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  nim: string;
  isActive: boolean;
  assignedAt: string | null;
  assignedBy: string;
  attempts: AttemptSummary[];
};

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

type SubjectWithStudents = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  students: Student[];
};

interface LecturerStudentsPageClientProps {
  initialSubjects: SubjectWithStudents[];
}

export function LecturerStudentsPageClient({
  initialSubjects,
}: LecturerStudentsPageClientProps) {
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) {
      return initialSubjects;
    }
    const searchLower = search.toLowerCase();
    return initialSubjects.filter((subject) => {
      const subjectMatch =
        subject.name.toLowerCase().includes(searchLower) ||
        (subject.code && subject.code.toLowerCase().includes(searchLower));
      const studentMatch = subject.students.some(
        (student) =>
          student.name.toLowerCase().includes(searchLower) ||
          student.nim.toLowerCase().includes(searchLower)
      );
      return subjectMatch || studentMatch;
    });
  }, [initialSubjects, search]);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Subject Students</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Review which students are assigned to your subjects
        </p>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search subject or student..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredSubjects.length === 0 ? (
        <Card className="border border-dashed border-border bg-card/30">
          <CardHeader>
            <CardTitle>No Subjects Found</CardTitle>
            <CardDescription>
              {initialSubjects.length === 0
                ? "You are not assigned to any subjects yet."
                : "Try adjusting your search to find a specific subject or student."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubjects.map((subject) => (
            <Card
              key={subject.id}
              className="border border-border bg-card shadow-sm rounded-2xl"
            >
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <span>{subject.name}</span>
                    {subject.code && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({subject.code})
                      </span>
                    )}
                  </CardTitle>
                  {subject.description && (
                    <CardDescription className="mt-1">
                      {subject.description}
                    </CardDescription>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {subject.students.length} student
                  {subject.students.length === 1 ? "" : "s"}
                </div>
              </CardHeader>
              <CardContent>
                {subject.students.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No students assigned to this subject yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-full divide-y divide-border overflow-hidden rounded-2xl">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Student
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            NIM
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Assigned
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Attempts
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {subject.students.map((student) => {
                          const rowKey = `${subject.id}-${student.id}`;
                          return (
                            <Fragment key={rowKey}>
                              <tr className="hover:bg-muted/30">
                                <td className="px-4 py-3 text-sm font-semibold">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono">
                                  {student.nim}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      student.isActive
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                    }`}
                                  >
                                    {student.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                  {student.assignedAt
                                    ? formatDateTime(new Date(student.assignedAt))
                                    : "Unknown"}
                                  <span className="block text-xs text-muted-foreground/80">
                                    by {student.assignedBy}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {student.attempts.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      No attempts
                                    </span>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="cursor-pointer"
                                      onClick={() => toggleRow(rowKey)}
                                    >
                                      {expandedRows[rowKey] ? (
                                        <>
                                          <ChevronUp className="w-4 h-4 mr-1" />
                                          Hide
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-4 h-4 mr-1" />
                                          View
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                              {expandedRows[rowKey] && student.attempts.length > 0 && (
                                <tr>
                                  <td colSpan={5} className="bg-muted/10">
                                    <div className="p-4 space-y-4">
                                      {student.attempts.map((attempt) => (
                                        <div
                                          key={`${rowKey}-${attempt.testId}`}
                                          className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm"
                                        >
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                              <p className="text-sm font-semibold">
                                                {attempt.testTitle}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {attempt.totalQuestions}{" "}
                                                questions attempted
                                              </p>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {attempt.submittedAt
                                                ? `Submitted ${formatDateTime(
                                                    new Date(attempt.submittedAt)
                                                  )}`
                                                : "Not submitted"}
                                            </div>
                                          </div>
                                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                                            <div className="rounded-xl border border-border/60 p-3">
                                              <p className="text-xs text-muted-foreground">
                                                Score
                                              </p>
                                              <p className="text-lg font-semibold">
                                                {typeof attempt.score === "number"
                                                  ? `${attempt.score.toFixed(1)}`
                                                  : "N/A"}
                                              </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 p-3">
                                              <p className="text-xs text-muted-foreground">
                                                Correct Answers
                                              </p>
                                              <p className="text-lg font-semibold text-emerald-600">
                                                {attempt.correctCount}
                                              </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 p-3">
                                              <p className="text-xs text-muted-foreground">
                                                Wrong Answers
                                              </p>
                                              <p className="text-lg font-semibold text-red-600">
                                                {attempt.wrongCount}
                                              </p>
                                            </div>
                                            <div className="rounded-xl border border-border/60 p-3">
                                              <p className="text-xs text-muted-foreground">
                                                Duration
                                              </p>
                                              <p className="text-lg font-semibold">
                                                {typeof attempt.durationMinutes === "number"
                                                  ? `${attempt.durationMinutes} min`
                                                  : "N/A"}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

