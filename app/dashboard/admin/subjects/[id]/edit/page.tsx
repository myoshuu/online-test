"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateSubject, getSubjectById } from "@/actions/Subject";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useModal } from "@/components/ui/modal-provider";

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
});

type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export default function EditSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { showModal } = useModal();
  const subjectId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectData, setSubjectData] = useState<{
    name: string;
    code: string | null;
    description: string | null;
  } | null>(null);

  const form = useForm<UpdateSubjectInput>({
    resolver: zodResolver(updateSubjectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  useEffect(() => {
    const loadSubject = async () => {
      try {
        const result = await getSubjectById(subjectId);
        if (result.success && result.data && "subject" in result.data) {
          const subject = result.data.subject;
          setSubjectData({
            name: subject.name,
            code: subject.code,
            description: subject.description,
          });
          form.reset({
            name: subject.name,
            code: subject.code || "",
            description: subject.description || "",
          });
        } else {
          setError(result.data?.message || "Failed to load subject");
          showModal({
            title: "Error",
            description: result.data?.message || "Failed to load subject data. Please try again.",
            variant: "error",
          });
        }
      } catch {
        setError("Failed to load subject data");
        showModal({
          title: "Error",
          description: "Failed to load subject data. Please try again.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (subjectId) {
      loadSubject();
    }
  }, [subjectId, form, showModal]);

  const onSubmit = async (data: UpdateSubjectInput) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateSubject(subjectId, {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
      });
      if (result.success) {
        showModal({
          title: "Subject Updated Successfully",
          description: `Subject "${data.name}" has been updated successfully.`,
          variant: "success",
          confirmText: "Go to Subjects",
          onConfirm: () => router.push("/dashboard/admin/subjects"),
        });
      } else {
        setError(result.data?.message || "Failed to update subject");
        showModal({
          title: "Update Failed",
          description: result.data?.message || "Failed to update subject",
          variant: "error",
        });
      }
    } catch {
      setError("An error occurred while updating the subject");
      showModal({
        title: "Error",
        description: "An error occurred while updating the subject",
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
          <p className="mt-4 text-muted-foreground">Loading subject data...</p>
        </div>
      </div>
    );
  }

  if (!subjectData) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Subject Not Found</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            The subject you're looking for doesn't exist.
          </p>
        </div>
        <Link href="/dashboard/admin/subjects">
          <Button variant="outline" className="cursor-pointer">
            Back to Subjects
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
              <Link href="/dashboard/admin/subjects">Subjects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Subject</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Subject</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Update subject information
        </p>
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Subject Information</CardTitle>
          <CardDescription>
            Update the subject details below
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

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter subject name (e.g., Mathematics)"
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter subject code (e.g., MATH101)"
                        {...field}
                        disabled={saving}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique code for this subject (e.g., MATH101, PHYS101)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter subject description"
                        {...field}
                        disabled={saving}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/admin/subjects")}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="cursor-pointer">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Update Subject
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
}

