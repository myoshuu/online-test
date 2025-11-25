import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentTestsWithAccess } from "@/actions/Test";
import { StudentTestAccessPageClient } from "./student-test-access-page-client";

const StudentTestAccessPage = async () => {
  const user = await authorize(["STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const response = await getStudentTestsWithAccess();
  const data =
    response.success && response.data && "tests" in response.data
      ? response.data.tests
      : [];

  return <StudentTestAccessPageClient initialTests={data} />;
};

export default StudentTestAccessPage;

