export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/actions/Auth";
import { type LoginInput } from "@/helpers/Zod";
import LoginPageClient from "./login-page-client";

const loginFormDefaults = Object.freeze({
  nim: "",
  password: "",
} satisfies LoginInput);

const Home = async () => {
  const currentUserResult = await getCurrentUser();

  if (
    currentUserResult.success &&
    currentUserResult.data &&
    "user" in currentUserResult.data
  ) {
    redirect("/dashboard");
  }

  return <LoginPageClient initialValues={loginFormDefaults} />;
};

export default Home;
