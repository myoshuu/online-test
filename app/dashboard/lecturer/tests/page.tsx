import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getLecturerSubjectsWithTestCounts } from "@/actions/Question";
import { QuestionsPageClient } from "@/app/dashboard/admin/questions/QuestionsPageClient";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LecturerTestsPage = async () => {
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

  if (!subjects.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">No subjects assigned</CardTitle>
          <CardDescription>
            You don’t have any subjects yet. Once an admin assigns you to a
            subject, you’ll be able to create and manage tests here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <QuestionsPageClient
      initialSubjects={subjects}
      createHref="/dashboard/lecturer/tests/create"
      builderBaseHref="/dashboard/lecturer/tests"
      canEditTestInfo
    />
  );
};

export default LecturerTestsPage;

