import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentTestsWithAccess } from "@/actions/Test";
import { StudentTestAccessPageClient } from "./student-test-access-page-client";

type StudentTestSummary = {
  testId: string;
  title: string;
  subjectName: string;
  subjectCode: string | null;
  hasAccessCode: boolean;
};

const StudentTestAccessPage = async () => {
  const user = await authorize(["STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const response = await getStudentTestsWithAccess();
  const data: StudentTestSummary[] =
    response.success && response.data && "tests" in response.data
      ? response.data.tests.map((test) => ({
          ...test,
          hasAccessCode: test.hasAccessCode ?? true,
        }))
      : [];

  return <StudentTestAccessPageClient initialTests={data} />;
};

export default StudentTestAccessPage;
