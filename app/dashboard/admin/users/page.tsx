import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { prisma } from "@/helpers/Prisma";
import UsersPageClient from "./UsersPageClient";

type UserWithRole = {
  id: string;
  name: string;
  nim: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

// Sort function to order by role (ADMIN, LECTURER, STUDENT) then by NIM
const sortUsers = (users: UserWithRole[]): UserWithRole[] => {
  const roleOrder = { ADMIN: 0, LECTURER: 1, STUDENT: 2 };

  return [...users].sort((a, b) => {
    // First sort by role
    const roleDiff = roleOrder[a.role] - roleOrder[b.role];
    if (roleDiff !== 0) return roleDiff;

    // Then sort by NIM (extract numbers for proper numeric sorting)
    const aNum = parseInt(a.nim.replace(/\D/g, "")) || 0;
    const bNum = parseInt(b.nim.replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });
};

const UsersPage = async () => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  // Fetch all users once
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      nim: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
    },
  });

  // Remove the currently logged-in admin so they can't edit themselves
  const usersExcludingCurrent = allUsers.filter((u) => u.id !== user.id);

  // Sort users properly
  const sortedUsers = sortUsers(usersExcludingCurrent as UserWithRole[]);

  // Fetch creator and updater names
  const userIds = new Set<string>();
  sortedUsers.forEach((u) => {
    if (u.createdBy) userIds.add(u.createdBy);
    if (u.updatedBy) userIds.add(u.updatedBy);
  });

  const usersMap = new Map<string, string>();
  if (userIds.size > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true },
    });
    users.forEach((u) => usersMap.set(u.id, u.name));
  }

  // Convert dates to strings for client component
  const usersForClient = sortedUsers.map((u) => {
    // Handle updatedAt - ensure it's valid, use createdAt as fallback
    let updatedAt: Date;
    if (
      u.updatedAt &&
      u.updatedAt instanceof Date &&
      !isNaN(u.updatedAt.getTime())
    ) {
      updatedAt = u.updatedAt;
    } else {
      updatedAt = u.createdAt;
    }

    // Get creator name - if createdBy is null, it's "System"
    const createdByName = u.createdBy
      ? usersMap.get(u.createdBy) || "System"
      : "System";

    // Get updater name - if updatedBy is null, it's "System"
    const updatedByName = u.updatedBy
      ? usersMap.get(u.updatedBy) || "System"
      : "System";

    return {
      ...u,
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
      createdAt:
        u.createdAt instanceof Date && !isNaN(u.createdAt.getTime())
          ? u.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        updatedAt instanceof Date && !isNaN(updatedAt.getTime())
          ? updatedAt.toISOString()
          : u.createdAt instanceof Date && !isNaN(u.createdAt.getTime())
          ? u.createdAt.toISOString()
          : new Date().toISOString(),
      createdByName,
      updatedByName,
    };
  });

  return <UsersPageClient initialUsers={usersForClient} />;
};

export default UsersPage;
