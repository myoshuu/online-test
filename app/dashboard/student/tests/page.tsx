import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentSubjectsWithTests } from "@/actions/Subject";
import { StudentTestsPageClient } from "./StudentTestsPageClient";

const StudentTestsPage = async () => {
  const user = await authorize(["STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const result = await getStudentSubjectsWithTests();
  const subjects =
    result.success && result.data && "subjects" in result.data
      ? result.data.subjects
      : [];

  return <StudentTestsPageClient initialSubjects={subjects} />;
};

export default StudentTestsPage;

