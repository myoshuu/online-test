import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getSubjectsWithTestCounts } from "@/actions/Question";
import { CreateTestPageClient } from "./CreateTestPageClient";

const CreateTestPage = async () => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  const subjectsResult = await getSubjectsWithTestCounts();
  const subjects =
    subjectsResult.success && subjectsResult.data && "subjects" in subjectsResult.data
      ? subjectsResult.data.subjects
      : [];

  return <CreateTestPageClient initialSubjects={subjects} />;
};

export default CreateTestPage;

