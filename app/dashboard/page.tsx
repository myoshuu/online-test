import { getCurrentUser } from "@/actions/Auth";
import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import {
  getDashboardStats,
  getLecturerStats,
  getStudentStats,
} from "@/actions/Dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  FileText,
  BookOpen,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

type StatItem = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
};

export default async function Dashboard() {
  const user = await authorize(["ADMIN", "LECTURER", "STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data || !("user" in userResult.data)) {
    redirect("/login");
  }

  const userData = userResult.data.user;

  // Fetch real data based on role
  let userStats: StatItem[] = [];

  if (userData.role === "ADMIN") {
    const statsResult = await getDashboardStats();
    if (statsResult.success && statsResult.data) {
      const stats = statsResult.data;
      userStats = [
        {
          title: "Total Users",
          value: stats.totalUsers || 0,
          icon: Users,
          description: "Registered users",
        },
        {
          title: "Total Tests",
          value: stats.totalTests || 0,
          icon: FileText,
          description: "Created tests",
        },
        {
          title: "Total Subjects",
          value: stats.totalSubjects || 0,
          icon: BookOpen,
          description: "Available subjects",
        },
      ];
    }
  } else if (userData.role === "LECTURER") {
    const statsResult = await getLecturerStats();
    if (statsResult.success && statsResult.data) {
      const stats = statsResult.data;
      userStats = [
        {
          title: "My Tests",
          value: stats.myTests || 0,
          icon: FileText,
          description: "Tests created",
        },
        {
          title: "Total Attempts",
          value: stats.totalAttempts || 0,
          icon: ClipboardList,
          description: "Student attempts",
        },
        {
          title: "Subjects",
          value: stats.subjects || 0,
          icon: BookOpen,
          description: "Subjects with tests",
        },
      ];
    }
  } else if (userData.role === "STUDENT") {
    const statsResult = await getStudentStats();
    if (statsResult.success && statsResult.data) {
      const stats = statsResult.data;
      userStats = [
        {
          title: "Available Tests",
          value: stats.availableTests || 0,
          icon: FileText,
          description: "Tests to take",
        },
        {
          title: "Completed Tests",
          value: stats.completedTests || 0,
          icon: ClipboardList,
          description: "Tests completed",
        },
        {
          title: "My Subjects",
          value: stats.mySubjects || 0,
          icon: BookOpen,
          description: "Enrolled subjects",
        },
      ];
    }
  }

  // Fallback to empty stats if no data
  if (userStats.length === 0) {
    userStats = [
      {
        title: "Loading...",
        value: 0,
        icon: FileText,
        description: "Fetching data",
      },
    ];
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userStats.map((stat: StatItem) => {
            const Icon = stat.icon;
            return (
            <Card key={stat.title} className="border border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">
                  {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

      <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium">{userData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">NIM:</span>
                <span className="text-sm font-medium">{userData.nim}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="text-sm font-medium">{userData.role}</span>
              </div>
              {userData.lastLogin && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Login:
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(userData.lastLogin).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
