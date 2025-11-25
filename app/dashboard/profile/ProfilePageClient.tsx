"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateProfilePasswordSchema,
  updateProfileAvatarSchema,
  type UpdateProfilePasswordInput,
  type UpdateProfileAvatarInput,
} from "@/helpers/Zod";
import { updateProfilePassword, updateProfileAvatar } from "@/actions/Profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Lock, Upload } from "lucide-react";

type ProfilePageClientProps = {
  initialProfile: {
    id: string;
    name: string;
    nim: string;
    role: "ADMIN" | "LECTURER" | "STUDENT";
    avatarUrl?: string | null;
    lastLogin?: string | null;
  };
};

export const ProfilePageClient = ({
  initialProfile,
}: ProfilePageClientProps) => {
  const router = useRouter();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialProfile.avatarUrl ?? null
  );
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (tempPreview) {
        URL.revokeObjectURL(tempPreview);
      }
    };
  }, [tempPreview]);

  const avatarForm = useForm<UpdateProfileAvatarInput>({
    resolver: zodResolver(updateProfileAvatarSchema),
    defaultValues: {
      avatar: undefined as unknown as FileList,
    },
  });

  const passwordForm = useForm<UpdateProfilePasswordInput>({
    resolver: zodResolver(updateProfilePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleAvatarSubmit = async (values: UpdateProfileAvatarInput) => {
    if (!values.avatar || values.avatar.length === 0) {
      return;
    }
    setUpdatingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", values.avatar[0]);
      const result = await updateProfileAvatar(formData);
      if (result.success) {
        if (
          result.data &&
          "avatarUrl" in result.data &&
          typeof result.data.avatarUrl === "string"
        ) {
          setAvatarPreview(result.data.avatarUrl);
        }
        setTempPreview(null);
        avatarForm.reset();
        toast.success(
          (result.data && "message" in result.data && result.data.message) ||
            "Profile picture updated"
        );
        // Refresh the layout to update the avatar in header and sidebar
        router.refresh();
      } else {
        toast.error(
          (result.data && "message" in result.data && result.data.message) ||
            "Failed to update profile picture"
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile picture");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (values: UpdateProfilePasswordInput) => {
    setUpdatingPassword(true);
    try {
      const result = await updateProfilePassword(values);
      if (result.success) {
        toast.success(
          (result.data && "message" in result.data && result.data.message) ||
            "Password updated"
        );
        passwordForm.reset();
      } else {
        // Apply field errors from server validation if available
        if (
          result.data &&
          "err" in result.data &&
          result.data.err &&
          typeof result.data.err === "object" &&
          "fieldErrors" in result.data.err &&
          result.data.err.fieldErrors &&
          typeof result.data.err.fieldErrors === "object"
        ) {
          const fieldErrors = result.data.err.fieldErrors as Record<
            string,
            string[] | undefined
          >;
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            if (messages && Array.isArray(messages) && messages[0]) {
              passwordForm.setError(field as keyof UpdateProfilePasswordInput, {
                type: "server",
                message: messages[0],
              });
            }
          });
        }
        toast.error(
          (result.data && "message" in result.data && result.data.message) ||
            "Failed to update password"
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const displayAvatar = tempPreview || avatarPreview;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">
          {initialProfile.role === "STUDENT"
            ? "Update your profile picture."
            : "Manage your password and keep your avatar up to date."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
        <Card className="shadow-none border border-border/80">
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>
              Basic information about your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border bg-muted">
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt={initialProfile.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground bg-muted/50">
                    {initialProfile.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold">{initialProfile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {initialProfile.role} • {initialProfile.nim}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{initialProfile.role}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Last Login</span>
                <span className="font-medium">
                  {initialProfile.lastLogin || "Never"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-border/80">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Upload a square image (max 2MB) for best results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <Form {...avatarForm}>
                <form
                  onSubmit={avatarForm.handleSubmit(handleAvatarSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={avatarForm.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload new picture</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            disabled={updatingAvatar}
                            onChange={(event) => {
                              const files = event.target.files as FileList;
                              field.onChange(files);
                              if (files && files[0]) {
                                const previewUrl = URL.createObjectURL(
                                  files[0]
                                );
                                if (tempPreview) {
                                  URL.revokeObjectURL(tempPreview);
                                }
                                setTempPreview(previewUrl);
                              } else {
                                setTempPreview(null);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={updatingAvatar}
                  >
                    {updatingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Update Picture
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
            {!mounted && (
              <div className="space-y-4">
                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Only show password change for ADMIN and LECTURER */}
      {initialProfile.role !== "STUDENT" && (
        <Card className="shadow-none border border-border/80">
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>
              Use a strong password that you don&apos;t reuse on other sites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                  className="grid gap-4 md:grid-cols-3"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              className="pl-9"
                              placeholder="••••••••"
                              disabled={updatingPassword}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              className="pl-9"
                              placeholder="At least 8 characters"
                              disabled={updatingPassword}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              className="pl-9"
                              placeholder="Repeat new password"
                              disabled={updatingPassword}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      className="w-full md:w-auto cursor-pointer"
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
            {!mounted && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                <div className="md:col-span-3 h-10 w-full md:w-auto rounded-md bg-muted animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
