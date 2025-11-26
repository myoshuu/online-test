import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getStudentScores } from "@/actions/Test";
import { StudentScoresPageClient } from "./StudentScoresPageClient";

const StudentScoresPage = async () => {
  const user = await authorize(["STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const result = await getStudentScores();
  const scores =
    result.success && result.data && "scores" in result.data
      ? result.data.scores
      : [];

  return <StudentScoresPageClient initialScores={scores} />;
};

export default StudentScoresPage;

