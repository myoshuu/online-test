import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getLecturerSubjectsWithStudents } from "@/actions/Subject";
import { LecturerStudentsPageClient } from "./LecturerStudentsPageClient";

const LecturerStudentsPage = async () => {
  const user = await authorize(["LECTURER"]);
  if (!user) {
    redirect("/");
  }

  const result = await getLecturerSubjectsWithStudents();
  const subjects =
    result.success && result.data && "subjects" in result.data
      ? result.data.subjects
      : [];

  return <LecturerStudentsPageClient initialSubjects={subjects} />;
};

export default LecturerStudentsPage;

