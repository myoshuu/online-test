import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getTestById } from "@/actions/Test";
import { EditTestPageClient } from "./EditTestPageClient";

interface EditTestPageProps {
  params: Promise<{ testId: string }>;
}

const EditTestPage = async ({ params }: EditTestPageProps) => {
  const user = await authorize(["ADMIN"]);

  if (!user) {
    redirect("/");
  }

  const { testId } = await params;
  const testResult = await getTestById(testId);

  if (!testResult.success || !testResult.data || !("test" in testResult.data)) {
    redirect("/dashboard/admin/questions");
  }

  return <EditTestPageClient test={testResult.data.test} />;
};

export default EditTestPage;

