import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getCurrentUser, logout } from "@/actions/Auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await authorize(["ADMIN", "LECTURER", "STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data || !("user" in userResult.data)) {
    await logout();
    redirect("/");
  }

  const userData = userResult.data.user;

  return (
    <DashboardShell
      currentUser={{
        id: userData.id,
        name: userData.name,
        nim: userData.nim,
        role: userData.role,
        avatarUrl: userData.avatarUrl,
      }}
    >
      {children}
    </DashboardShell>
  );
}
