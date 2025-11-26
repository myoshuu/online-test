"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Info, Eye } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dateUtils";

type Score = {
  attemptId: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  subjectCode: string | null;
  score: number | null;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  submittedAt: string | null;
  questionAnswers: Array<{
    questionId: string;
    question: string;
    correctAnswer: boolean | null;
    studentAnswer: boolean | null;
    isCorrect: boolean | null;
    order: number;
  }>;
};

interface StudentScoresPageClientProps {
  initialScores: Score[];
}

export function StudentScoresPageClient({
  initialScores,
}: StudentScoresPageClientProps) {
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Group scores by subject
  const scoresBySubject = useMemo(() => {
    const grouped = new Map<string, Score[]>();
    initialScores.forEach((score) => {
      const key = score.subjectName;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(score);
    });
    return Array.from(grouped.entries()).map(([subjectName, scores]) => ({
      subjectName,
      scores: scores.sort(
        (a, b) =>
          new Date(b.submittedAt ?? 0).getTime() -
          new Date(a.submittedAt ?? 0).getTime()
      ),
    }));
  }, [initialScores]);

  const [selectedSubject, setSelectedSubject] = useState(
    scoresBySubject[0]?.subjectName || ""
  );

  const selectedScores = useMemo(() => {
    return scoresBySubject.find((s) => s.subjectName === selectedSubject)
      ?.scores || [];
  }, [scoresBySubject, selectedSubject]);

  const handleViewDetails = (score: Score) => {
    setSelectedScore(score);
    setDetailDialogOpen(true);
  };

  const formatScore = (score: number | null) => {
    if (score === null) return "N/A";
    return `${score.toFixed(1)}%`;
  };

  if (initialScores.length === 0) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">My Scores</h1>
          <p className="text-sm text-muted-foreground">
            View your test results and scores.
          </p>
        </div>
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No scores available</CardTitle>
            <CardDescription>
              Your test scores will appear here once they are announced by your
              lecturer.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">My Scores</h1>
        <p className="text-sm text-muted-foreground">
          View your test results and scores.
        </p>
      </div>

      {scoresBySubject.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">
            Subjects
          </p>
          <Tabs
            value={selectedSubject || scoresBySubject[0]?.subjectName}
            onValueChange={setSelectedSubject}
            className="w-full"
          >
            <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-muted/60 p-1 rounded-lg">
              {scoresBySubject.map(({ subjectName }) => (
                <TabsTrigger
                  key={subjectName}
                  value={subjectName}
                  className="px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {subjectName}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {selectedScores.map((score) => (
          <Card
            key={score.attemptId}
            className="border border-border/70 bg-card/70"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg font-semibold">
                      {score.testTitle}
                    </CardTitle>
                    {score.subjectCode && (
                      <Badge variant="secondary" className="text-xs">
                        {score.subjectCode}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {score.subjectName}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="text-2xl font-bold text-primary">
                  {formatScore(score.score)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Correct</p>
                  <p className="text-lg font-semibold text-green-600">
                    {score.correctCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                  <p className="text-lg font-semibold text-red-600">
                    {score.wrongCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">
                    {score.totalQuestions}
                  </p>
                </div>
              </div>
              {score.submittedAt && (
                <div className="text-xs text-muted-foreground">
                  Submitted: {mounted ? formatDateTime(score.submittedAt) : "Loading..."}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleViewDetails(score)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedScore?.testTitle}</DialogTitle>
            <DialogDescription>
              {selectedScore?.subjectName}
              {selectedScore?.subjectCode && ` (${selectedScore.subjectCode})`}
            </DialogDescription>
          </DialogHeader>
          {selectedScore && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatScore(selectedScore.score)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {selectedScore.correctCount} / {selectedScore.totalQuestions}{" "}
                    correct
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedScore.wrongCount} incorrect
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Question Details</h3>
                {selectedScore.questionAnswers.map((qa, index) => (
                  <Card key={qa.questionId} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {qa.order || index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm">{qa.question}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Correct Answer:
                            </span>
                            {qa.correctAnswer === true ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : qa.correctAnswer === false ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <Info className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Your Answer:
                            </span>
                            {qa.studentAnswer === true ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            ) : qa.studentAnswer === false ? (
                              <XCircle className="w-4 h-4 text-blue-600" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                          {qa.isCorrect !== null && (
                            <Badge
                              variant={qa.isCorrect ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {qa.isCorrect ? "Correct" : "Wrong"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

