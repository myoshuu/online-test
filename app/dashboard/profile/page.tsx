import { redirect } from "next/navigation";
import { authorize } from "@/helpers/Authenticate";
import { getProfile } from "@/actions/Profile";
import { ProfilePageClient } from "@/app/dashboard/profile/ProfilePageClient";

const ProfilePage = async () => {
  const user = await authorize(["ADMIN", "LECTURER", "STUDENT"]);
  if (!user) {
    redirect("/");
  }

  const profileResult = await getProfile();
  const profile =
    profileResult.success &&
    profileResult.data &&
    "profile" in profileResult.data
      ? profileResult.data.profile
      : null;

  if (!profile) {
    redirect("/dashboard");
  }

  // Format lastLogin on server to avoid hydration mismatch
  const formattedProfile = {
    ...profile,
    lastLogin: profile.lastLogin
      ? new Date(profile.lastLogin).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      : null,
  };

  return <ProfilePageClient initialProfile={formattedProfile} />;
};

export default ProfilePage;

