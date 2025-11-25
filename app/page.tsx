export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/actions/Auth";
import LoginPageClient from "./login-page-client";

const Home = async () => {
  const currentUserResult = await getCurrentUser();

  if (
    currentUserResult.success &&
    currentUserResult.data &&
    "user" in currentUserResult.data
  ) {
    redirect("/dashboard");
  }

  return <LoginPageClient />;
};

export default Home;
