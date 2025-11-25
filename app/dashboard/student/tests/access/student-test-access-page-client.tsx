"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type StudentTestSummary = {
  testId: string;
  title: string;
  subjectName: string;
  subjectCode: string | null;
  hasAccessCode: boolean;
};

interface StudentTestAccessPageClientProps {
  initialTests: StudentTestSummary[];
}

export function StudentTestAccessPageClient({
  initialTests,
}: StudentTestAccessPageClientProps) {
  const router = useRouter();
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const handleDigitChange = (index: number, value: string) => {
    const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!normalized) {
      const nextDigits = [...codeDigits];
      nextDigits[index] = "";
      setCodeDigits(nextDigits);
      return;
    }
    const char = normalized.slice(-1);
    const nextDigits = [...codeDigits];
    nextDigits[index] = char;
    setCodeDigits(nextDigits);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
      const prevIndex = Math.max(0, index - 1);
      const prevInput = document.getElementById(
        `code-digit-${prevIndex}`
      ) as HTMLInputElement | null;
      prevInput?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      const prevInput = document.getElementById(
        `code-digit-${index - 1}`
      ) as HTMLInputElement | null;
      prevInput?.focus();
    }
    if (event.key === "ArrowRight" && index < codeDigits.length - 1) {
      const nextInput = document.getElementById(
        `code-digit-${index + 1}`
      ) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = codeDigits.join("");
    if (code.length !== 6) {
      toast.error("Please enter the 6-character access code.");
      return;
    }
    setLoading(true);
    try {
      router.push(
        `/dashboard/student/tests/start?code=${encodeURIComponent(code)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter Access Code</CardTitle>
          <CardDescription>
            Your lecturer or admin will give you a 6-character code to start a
            test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {codeDigits.map((digit, index) => (
                <Input
                  key={index}
                  value={digit}
                  onChange={(event) =>
                    handleDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  maxLength={1}
                  id={`code-digit-${index}`}
                  className="w-12 h-12 text-center text-xl font-semibold uppercase"
                />
              ))}
            </div>
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={loading}
                className="cursor-pointer min-w-[140px]"
              >
                {loading ? "Checking..." : "Start Test"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tests Requiring Access Codes</CardTitle>
          <CardDescription>
            These are the tests assigned to your subjects that currently use
            access codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tests require access codes at the moment.
            </p>
          ) : (
            initialTests.map((test) => (
              <div
                key={test.testId}
                className="flex flex-col gap-2 rounded-lg border border-border/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{test.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {test.subjectCode ? `${test.subjectCode} • ` : ""}
                      {test.subjectName}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[0.65rem]">
                    Access code required
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the code provided by your lecturer/admin and paste it
                  above to begin.
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
