import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { prisma } from "@/helpers/Prisma";
import { SubjectsPageClient } from "./SubjectsPageClient";

const SubjectsPage = async () => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  // Fetch all subjects
  const allSubjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      code: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  // Fetch creator and updater names
  const userIds = new Set<string>();
  allSubjects.forEach((s) => {
    if (s.createdBy) userIds.add(s.createdBy);
    if (s.updatedBy) userIds.add(s.updatedBy);
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
  const subjectsForClient = allSubjects.map((s) => {
    // Handle updatedAt - ensure it's valid, use createdAt as fallback
    let updatedAt: Date;
    if (
      s.updatedAt &&
      s.updatedAt instanceof Date &&
      !isNaN(s.updatedAt.getTime())
    ) {
      updatedAt = s.updatedAt;
    } else {
      updatedAt = s.createdAt;
    }

    // Get creator name - if createdBy is null, it's "System"
    const createdByName = s.createdBy
      ? usersMap.get(s.createdBy) || "System"
      : "System";

    // Get updater name - if updatedBy is null, it's "System"
    const updatedByName = s.updatedBy
      ? usersMap.get(s.updatedBy) || "System"
      : "System";

    return {
      ...s,
      createdAt:
        s.createdAt instanceof Date && !isNaN(s.createdAt.getTime())
          ? s.createdAt.toISOString()
          : new Date().toISOString(),
      updatedAt:
        updatedAt instanceof Date && !isNaN(updatedAt.getTime())
          ? updatedAt.toISOString()
          : s.createdAt instanceof Date && !isNaN(s.createdAt.getTime())
          ? s.createdAt.toISOString()
          : new Date().toISOString(),
      createdByName,
      updatedByName,
    };
  });

  return <SubjectsPageClient initialSubjects={subjectsForClient} />;
};

export default SubjectsPage;
