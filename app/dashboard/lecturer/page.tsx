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
  Plus,
  ArrowRight,
} from "lucide-react";

export default async function LecturerDashboard() {
  const user = await authorize(["LECTURER"]);

  if (!user) {
    redirect("/");
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Welcome Section */}
      <div className="border border-border rounded-xl p-4 sm:p-6 bg-card">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, Lecturer!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your tests and monitor student progress.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">My Tests</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              View and manage your test questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <Link href="/dashboard/lecturer/tests">
              <Button
                variant="outline"
                className="w-full justify-between cursor-pointer text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">View Tests</span>
                </span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </Button>
            </Link>
            <Link href="/dashboard/lecturer/tests/create">
              <Button
                className="w-full justify-between cursor-pointer text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Create New Test</span>
                </span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Your recent test activities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg">Statistics</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Overview of your tests
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Total Tests</span>
                <span className="text-lg sm:text-xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Active Tests</span>
                <span className="text-lg sm:text-xl font-bold">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

