import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getSubjectsWithTestCounts } from "@/actions/Question";
import { QuestionsPageClient } from "./QuestionsPageClient";

const QuestionsPage = async () => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  const subjectsResult = await getSubjectsWithTestCounts();
  const subjects =
    subjectsResult.success && subjectsResult.data && "subjects" in subjectsResult.data
      ? subjectsResult.data.subjects
      : [];

  return <QuestionsPageClient initialSubjects={subjects} />;
};

export default QuestionsPage;
