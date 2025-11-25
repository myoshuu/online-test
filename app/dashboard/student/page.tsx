import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default async function StudentDashboard() {
  const user = await authorize(["STUDENT"]);

  if (!user) {
    redirect("/");
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Welcome Section */}
      <div className="border border-border rounded-xl p-4 sm:p-6 bg-card">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, Student!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Take tests and view your results.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">Available Tests</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Tests you can take now
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <Link href="/dashboard/student/tests">
              <Button
                className="w-full justify-between cursor-pointer text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">View Tests</span>
                </span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">My Results</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              View your test results
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                No results yet
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">Statistics</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Your test statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Tests Taken</span>
                <span className="text-lg sm:text-xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Average Score</span>
                <span className="text-lg sm:text-xl font-bold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

