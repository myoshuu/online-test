import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getLecturerSubjectsWithTestCounts } from "@/actions/Question";
import { CreateTestPageClient } from "@/app/dashboard/admin/questions/create/CreateTestPageClient";

const LecturerCreateTestPage = async () => {
  const user = await authorize(["LECTURER"]);
  if (!user) {
    redirect("/");
  }

  const subjectsResult = await getLecturerSubjectsWithTestCounts();
  const subjects =
    subjectsResult.success &&
    subjectsResult.data &&
    "subjects" in subjectsResult.data
      ? subjectsResult.data.subjects
      : [];

  return (
    <CreateTestPageClient
      initialSubjects={subjects}
      homeHref="/dashboard/lecturer/tests"
      builderBaseHref="/dashboard/lecturer/tests"
    />
  );
};

export default LecturerCreateTestPage;

