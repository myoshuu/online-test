"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateUser, getUserById } from "@/actions/Auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2, UserCog, Info } from "lucide-react";
import Link from "next/link";
import { useModal } from "@/components/ui/modal-provider";

const updateUserSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  nim: z.string().min(1, "Please enter a valid NIM"),
  role: z.enum(["ADMIN", "LECTURER", "STUDENT"], {
    message: "Please select a role",
  }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length === 0 || val.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
});

type UpdateUserInput = z.infer<typeof updateUserSchema>;
type UserResponseData =
  | { message: string }
  | {
      user: {
        id: string;
        name: string;
        nim: string;
        role: "ADMIN" | "LECTURER" | "STUDENT";
      };
    };

const extractMessage = (
  data: UserResponseData | undefined,
  fallback: string
) => {
  if (data && "message" in data) {
    return data.message;
  }
  return fallback;
};

const EditUserPage = () => {
  const params = useParams();
  const router = useRouter();
  const { showModal } = useModal();
  const userId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{
    name: string;
    nim: string;
    role: "ADMIN" | "LECTURER" | "STUDENT";
  } | null>(null);

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      nim: "",
      role: "STUDENT",
      password: "",
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getUserById(userId);
        if (result.success && result.data && "user" in result.data) {
          const user = result.data.user;
          setUserData({
            name: user.name,
            nim: user.nim,
            role: user.role as "ADMIN" | "LECTURER" | "STUDENT",
          });
          form.reset({
            name: user.name,
            nim: user.nim,
            role: user.role as "ADMIN" | "LECTURER" | "STUDENT",
            password: "",
          });
        } else {
          const message = extractMessage(
            result.data as UserResponseData | undefined,
            "Failed to load user"
          );
          setError(message);
          showModal({
            title: "Error",
            description: message,
            variant: "error",
          });
        }
      } catch {
        setError("Failed to load user data");
        showModal({
          title: "Error",
          description: "Failed to load user data. Please try again.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId, form, showModal]);

  const onSubmit = async (data: UpdateUserInput) => {
    setSaving(true);
    setError(null);
    try {
      const updateData: {
        name: string;
        nim: string;
        role: "ADMIN" | "LECTURER" | "STUDENT";
        password?: string;
      } = {
        name: data.name,
        nim: data.nim,
        role: data.role,
      };

      // Only include password if it's provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      const result = await updateUser(userId, updateData);
      if (result.success) {
        showModal({
          title: "User Updated Successfully",
          description: `User "${data.name}" has been updated successfully.`,
          variant: "success",
          confirmText: "Go to Users",
          onConfirm: () => router.push("/dashboard/admin/users"),
        });
      } else {
        const message = extractMessage(
          result.data as UserResponseData | undefined,
          "Failed to update user"
        );
        setError(message);
        showModal({
          title: "Update Failed",
          description: message,
          variant: "error",
        });
      }
    } catch {
      setError("An error occurred while updating the user");
      showModal({
        title: "Error",
        description: "An error occurred while updating the user",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">User Not Found</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            The user you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Link href="/dashboard/admin/users">
          <Button variant="outline" className="cursor-pointer">
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/admin/users">Users</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit User</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Edit User</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Update user information
        </p>
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            Update the user details below. Leave password empty to keep the
            current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Password Information</p>
                    <p>
                      Leave the password field empty if you don&apos;t want to
                      change it. If you provide a new password, it will replace
                      the current one.
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIM</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter NIM (e.g., 672023303)"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="LECTURER">Lecturer</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave empty to keep current password"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a new password only if you want to change it.
                      Minimum 8 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/admin/users")}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UserCog className="w-4 h-4 mr-2" />
                      Update User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUserPage;
