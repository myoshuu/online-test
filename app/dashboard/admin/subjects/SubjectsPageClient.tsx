"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  Users,
} from "lucide-react";
import { formatDateTime } from "@/lib/dateUtils";
import { deleteSubject } from "@/actions/Subject";
import { toast } from "sonner";

type SubjectWithMeta = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  updatedByName: string;
};

interface SubjectsPageClientProps {
  initialSubjects: SubjectWithMeta[];
}

export function SubjectsPageClient({
  initialSubjects,
}: SubjectsPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState<SubjectWithMeta[]>(initialSubjects);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState<string>(
    initialSubjects[0]?.id ?? ""
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    subjectId: string | null;
    subjectName: string;
  }>({ open: false, subjectId: null, subjectName: "" });

  // Client-side filtering
  const filteredSubjects = useMemo(() => {
    if (!search.trim()) {
      return subjects;
    }

    const searchLower = search.toLowerCase().trim();
    return subjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(searchLower) ||
        (subject.code && subject.code.toLowerCase().includes(searchLower)) ||
        (subject.description &&
          subject.description.toLowerCase().includes(searchLower))
    );
  }, [subjects, search]);

  const handleDeleteClick = useCallback(
    (subjectId: string) => {
      const subject = subjects.find((s) => s.id === subjectId);
      if (subject) {
        setConfirmDelete({
          open: true,
          subjectId,
          subjectName: subject.name,
        });
      }
    },
    [subjects]
  );

  const handleAssign = () => {
    if (assignSubjectId) {
      router.push(`/dashboard/admin/subjects/${assignSubjectId}`);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!confirmDelete.subjectId) return;

    setDeletingId(confirmDelete.subjectId);
    setConfirmDelete({ open: false, subjectId: null, subjectName: "" });

    try {
      const result = await deleteSubject(confirmDelete.subjectId);
      if (result.success) {
        setSubjects((prev) =>
          prev.filter((s) => s.id !== confirmDelete.subjectId)
        );
        toast.success("Subject Deleted", {
          description: `"${confirmDelete.subjectName}" has been deleted successfully.`,
        });
      } else {
        toast.error("Delete Failed", {
          description: result.data?.message || "Failed to delete subject",
        });
      }
    } catch {
      toast.error("Error", {
        description: "An error occurred while deleting subject",
      });
    } finally {
      setDeletingId(null);
    }
  }, [confirmDelete]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Subjects Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and manage all subjects
        </p>
      </div>

      {/* Search Bar and Create Button */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search subjects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setAssignModalOpen(true)}
            disabled={subjects.length === 0}
          >
            <Users className="w-4 h-4 mr-2" />
            Assign Users
          </Button>
          <Button
            onClick={() => router.push("/dashboard/admin/subjects/create")}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Subject
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredSubjects.length} of {subjects.length} subject
        {subjects.length === 1 ? "" : "s"}
      </div>

      {/* Subjects Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSubjects.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  {search
                    ? "No subjects found. Try adjusting your search."
                    : "No subjects found. There are no subjects registered in the system yet."}
                </td>
              </tr>
            ) : (
              filteredSubjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 shrink-0">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                      </div>
                      <p className="font-semibold text-sm">{subject.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-mono">
                    {subject.code || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {subject.description || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>
                        {subject.createdAt &&
                        !isNaN(new Date(subject.createdAt).getTime())
                          ? formatDateTime(new Date(subject.createdAt))
                          : "N/A"}
                      </span>
                      <span className="text-xs text-muted-foreground/80">
                        by {subject.createdByName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>
                        {subject.updatedAt &&
                        !isNaN(new Date(subject.updatedAt).getTime())
                          ? formatDateTime(new Date(subject.updatedAt))
                          : "N/A"}
                      </span>
                      <span className="text-xs text-muted-foreground/80">
                        by {subject.updatedByName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                        onClick={() =>
                          router.push(`/dashboard/admin/subjects/${subject.id}`)
                        }
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                        onClick={() =>
                          router.push(
                            `/dashboard/admin/subjects/${subject.id}/edit`
                          )
                        }
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer border-red-200 text-red-700 hover:bg-red-100 hover:text-red-700"
                        disabled={deletingId === subject.id}
                        onClick={() => handleDeleteClick(subject.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deletingId === subject.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={confirmDelete.open}
        onOpenChange={(open) =>
          !open && setConfirmDelete({ open: false, subjectId: null, subjectName: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{confirmDelete.subjectName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Users Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Subject</DialogTitle>
            <DialogDescription>
              Choose a subject to open the assignment page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={assignSubjectId}
              onValueChange={setAssignSubjectId}
              disabled={subjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code ? `${subject.code} - ` : ""}
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAssign();
                setAssignModalOpen(false);
              }}
              disabled={!assignSubjectId}
              className="cursor-pointer"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

