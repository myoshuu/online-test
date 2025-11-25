import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getTestById } from "@/actions/Test";
import { EditTestPageClient } from "@/app/dashboard/admin/questions/[testId]/edit/EditTestPageClient";

interface LecturerEditTestPageProps {
  params: Promise<{ testId: string }>;
}

const LecturerEditTestPage = async ({ params }: LecturerEditTestPageProps) => {
  const user = await authorize(["LECTURER"]);
  if (!user) {
    redirect("/");
  }

  const { testId } = await params;
  const testResult = await getTestById(testId);

  if (!testResult.success || !testResult.data || !("test" in testResult.data)) {
    redirect("/dashboard/lecturer/tests");
  }

  return <EditTestPageClient test={testResult.data.test} backHrefBase="/dashboard/lecturer/tests" />;
};

export default LecturerEditTestPage;

