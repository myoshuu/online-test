import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getDashboardStats } from "@/actions/Dashboard";
import { formatDate } from "@/lib/dateUtils";
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
  Users,
  BookOpen,
  GraduationCap,
  UserCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const AdminDashboard = async () => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  const statsResult = await getDashboardStats();
  const stats =
    statsResult.success && statsResult.data && !("message" in statsResult.data)
      ? statsResult.data
      : null;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-primary/20 rounded-xl p-4 sm:p-6 bg-primary/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                Total Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-primary/15 rounded-lg shrink-0 ml-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="border border-blue-500/20 rounded-xl p-4 sm:p-6 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                Total Students
              </p>
              <p className="text-2xl sm:text-3xl font-bold">
                {stats?.totalStudents || 0}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/15 rounded-lg shrink-0 ml-2">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="border border-purple-500/20 rounded-xl p-4 sm:p-6 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                Total Lecturers
              </p>
              <p className="text-2xl sm:text-3xl font-bold">
                {stats?.totalLecturers || 0}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-500/15 rounded-lg shrink-0 ml-2">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="border border-orange-500/20 rounded-xl p-4 sm:p-6 bg-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                Total Subjects
              </p>
              <p className="text-2xl sm:text-3xl font-bold">
                {stats?.totalSubjects || 0}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-500/15 rounded-lg shrink-0 ml-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Shortcuts */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <CardTitle className="text-base sm:text-lg">
                Quick Shortcuts
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Navigate to important pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
            <Link href="/dashboard/admin/users">
              <Button
                variant="outline"
                className="w-full justify-between cursor-pointer text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Manage Users</span>
                </span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              </Button>
            </Link>
            <Link href="/dashboard/admin/subjects">
              <Button
                variant="outline"
                className="w-full justify-between cursor-pointer text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Manage Subjects</span>
                </span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <CardTitle className="text-base sm:text-lg">
                Recent Users
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Latest registered users
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                stats.recentUsers.map(
                  (recentUser: {
                    id: string;
                    name: string;
                    nim: string;
                    role: string;
                    createdAt: Date;
                  }) => (
                    <div
                      key={recentUser.id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate">
                          {recentUser.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {recentUser.nim} • {recentUser.role}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground ml-2 sm:ml-3 shrink-0">
                        {formatDate(recentUser.createdAt)}
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  No recent users
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subjects */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <CardTitle className="text-base sm:text-lg">
                Recent Subjects
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Latest created subjects
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-3">
              {stats?.recentSubjects && stats.recentSubjects.length > 0 ? (
                stats.recentSubjects.map(
                  (subject: {
                    id: string;
                    name: string;
                    code?: string;
                    createdAt: Date;
                  }) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate">
                          {subject.name}
                        </p>
                        {subject.code && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {subject.code}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground ml-2 sm:ml-3 shrink-0">
                        {formatDate(subject.createdAt)}
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  No recent subjects
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
