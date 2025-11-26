import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentSubjectsWithTests } from "@/actions/Subject";
import { StudentTestsPageClient } from "./StudentTestsPageClient";

const StudentTestsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) => {
  const user = await authorize(["STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const result = await getStudentSubjectsWithTests();
  const subjects =
    result.success && result.data && "subjects" in result.data
      ? result.data.subjects
      : [];

  const params = await searchParams;
  const errorMessage = params?.error
    ? decodeURIComponent(params.error)
    : null;

  return (
    <StudentTestsPageClient
      initialSubjects={subjects}
      errorMessage={errorMessage}
    />
  );
};

export default StudentTestsPage;

