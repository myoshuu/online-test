import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentSubjectsWithTests } from "@/actions/Subject";
import { StudentTestsPageClient } from "./StudentTestsPageClient";

const StudentTestsPage = async ({
  searchParams,
}: {
  searchParams: { error?: string };
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

  const errorMessage = searchParams?.error
    ? decodeURIComponent(searchParams.error)
    : null;

  return (
    <StudentTestsPageClient
      initialSubjects={subjects}
      errorMessage={errorMessage}
    />
  );
};

export default StudentTestsPage;

