"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSubjectWithAssignments, assignUserToSubject, bulkAssignUsersToSubject, unassignUserFromSubject } from "@/actions/Subject";
import { getUsers } from "@/actions/Auth";
import { Button } from "@/components/ui/button";
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
  BookOpen,
  UserCheck,
  GraduationCap,
  Loader2,
  X,
  Plus,
  UserX,
  Users,
  UserPlus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { formatDateTime } from "@/lib/dateUtils";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  nim: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  isActive: boolean;
  assignedAt?: Date | string;
  assignedBy?: string;
};

type SubjectData = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function SubjectViewPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [allLecturers, setAllLecturers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [assigningLecturer, setAssigningLecturer] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkModeLecturer, setBulkModeLecturer] = useState(false);
  const [bulkModeStudent, setBulkModeStudent] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<{
    open: boolean;
    userId: string | null;
    userName: string;
    userRole: "LECTURER" | "STUDENT";
  }>({ open: false, userId: null, userName: "", userRole: "STUDENT" });

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectResult, lecturersResult, studentsResult] = await Promise.all([
        getSubjectWithAssignments(subjectId),
        getUsers({ role: "LECTURER", isActive: true, limit: 1000 }),
        getUsers({ role: "STUDENT", isActive: true, limit: 1000 }),
      ]);

      if (subjectResult.success && subjectResult.data && "subject" in subjectResult.data) {
        const data = subjectResult.data;
        setSubject({
          id: data.subject.id,
          name: data.subject.name,
          description: data.subject.description,
          code: data.subject.code,
          createdAt:
            data.subject.createdAt instanceof Date
              ? data.subject.createdAt.toISOString()
              : typeof data.subject.createdAt === "string"
              ? data.subject.createdAt
              : new Date().toISOString(),
          updatedAt:
            data.subject.updatedAt instanceof Date
              ? data.subject.updatedAt.toISOString()
              : typeof data.subject.updatedAt === "string"
              ? data.subject.updatedAt
              : new Date().toISOString(),
        });
        // Convert dates to strings for display
        setLecturers(
          data.lecturers.map((l) => ({
            ...l,
            assignedAt:
              l.assignedAt instanceof Date
                ? l.assignedAt.toISOString()
                : typeof l.assignedAt === "string"
                ? l.assignedAt
                : undefined,
          }))
        );
        setStudents(
          data.students.map((s) => ({
            ...s,
            assignedAt:
              s.assignedAt instanceof Date
                ? s.assignedAt.toISOString()
                : typeof s.assignedAt === "string"
                ? s.assignedAt
                : undefined,
          }))
        );
      }

      if (lecturersResult.success && lecturersResult.data && "users" in lecturersResult.data) {
        setAllLecturers(lecturersResult.data.users as User[]);
      }

      if (studentsResult.success && studentsResult.data && "users" in studentsResult.data) {
        setAllStudents(studentsResult.data.users as User[]);
      }
    } catch {
      toast.error("Error", {
        description: "Failed to load subject data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLecturer = async () => {
    if (bulkModeLecturer) {
      if (selectedLecturerIds.length === 0) return;
      setAssigningLecturer(true);
      try {
        const result = await bulkAssignUsersToSubject(selectedLecturerIds, subjectId);
        if (result.success) {
          toast.success("Lecturers Assigned", {
            description: `${result.data?.assigned || selectedLecturerIds.length} lecturer(s) assigned successfully.${result.data?.skipped ? ` ${result.data.skipped} already assigned.` : ""}`,
          });
          setSelectedLecturerIds([]);
          loadData();
        } else {
          toast.error("Assignment Failed", {
            description: result.data?.message || "Failed to assign lecturers",
          });
        }
      } catch {
        toast.error("Error", {
          description: "An error occurred while assigning lecturers",
        });
      } finally {
        setAssigningLecturer(false);
      }
    } else {
      if (!selectedLecturerId) return;
      setAssigningLecturer(true);
      try {
        const result = await assignUserToSubject(selectedLecturerId, subjectId);
        if (result.success) {
          toast.success("Lecturer Assigned", {
            description: "Lecturer has been assigned to this subject successfully.",
          });
          setSelectedLecturerId("");
          loadData();
        } else {
          toast.error("Assignment Failed", {
            description: result.data?.message || "Failed to assign lecturer",
          });
        }
      } catch {
        toast.error("Error", {
          description: "An error occurred while assigning lecturer",
        });
      } finally {
        setAssigningLecturer(false);
      }
    }
  };

  const handleAssignStudent = async () => {
    if (bulkModeStudent) {
      if (selectedStudentIds.length === 0) return;
      setAssigningStudent(true);
      try {
        const result = await bulkAssignUsersToSubject(selectedStudentIds, subjectId);
        if (result.success) {
          toast.success("Students Assigned", {
            description: `${result.data?.assigned || selectedStudentIds.length} student(s) assigned successfully.${result.data?.skipped ? ` ${result.data.skipped} already assigned.` : ""}`,
          });
          setSelectedStudentIds([]);
          loadData();
        } else {
          toast.error("Assignment Failed", {
            description: result.data?.message || "Failed to assign students",
          });
        }
      } catch {
        toast.error("Error", {
          description: "An error occurred while assigning students",
        });
      } finally {
        setAssigningStudent(false);
      }
    } else {
      if (!selectedStudentId) return;
      setAssigningStudent(true);
      try {
        const result = await assignUserToSubject(selectedStudentId, subjectId);
        if (result.success) {
          toast.success("Student Assigned", {
            description: "Student has been assigned to this subject successfully.",
          });
          setSelectedStudentId("");
          loadData();
        } else {
          toast.error("Assignment Failed", {
            description: result.data?.message || "Failed to assign student",
          });
        }
      } catch {
        toast.error("Error", {
          description: "An error occurred while assigning student",
        });
      } finally {
        setAssigningStudent(false);
      }
    }
  };

  const toggleLecturerSelection = (userId: string) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleStudentSelection = (userId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAllLecturers = () => {
    if (selectedLecturerIds.length === availableLecturers.length) {
      setSelectedLecturerIds([]);
    } else {
      setSelectedLecturerIds(availableLecturers.map((l) => l.id));
    }
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === availableStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(availableStudents.map((s) => s.id));
    }
  };

  const handleUnassignClick = (userId: string, userName: string, userRole: "LECTURER" | "STUDENT") => {
    setConfirmUnassign({
      open: true,
      userId,
      userName,
      userRole,
    });
  };

  const handleUnassign = async () => {
    if (!confirmUnassign.userId) return;

    setUnassigningId(confirmUnassign.userId);
    setConfirmUnassign({ open: false, userId: null, userName: "", userRole: "STUDENT" });

    try {
      const result = await unassignUserFromSubject(confirmUnassign.userId, subjectId);
      if (result.success) {
        toast.success("User Unassigned", {
          description: `"${confirmUnassign.userName}" has been unassigned from this subject.`,
        });
        loadData();
      } else {
        toast.error("Unassignment Failed", {
          description: result.data?.message || "Failed to unassign user",
        });
      }
    } catch {
      toast.error("Error", {
        description: "An error occurred while unassigning user",
      });
    } finally {
      setUnassigningId(null);
    }
  };

  // Get available lecturers/students (not already assigned)
  const availableLecturers = allLecturers.filter(
    (lecturer) => !lecturers.some((l) => l.id === lecturer.id)
  );
  const availableStudents = allStudents.filter(
    (student) => !students.some((s) => s.id === student.id)
  );

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

  if (!subject) {
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
            <BreadcrumbPage>{subject.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Subject Details */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <BookOpen className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">{subject.name}</CardTitle>
              {subject.code && (
                <CardDescription className="text-base font-mono mt-1">
                  {subject.code}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subject.description && (
            <p className="text-sm text-muted-foreground mb-4">{subject.description}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>
                {subject.createdAt && !isNaN(new Date(subject.createdAt).getTime())
                  ? formatDateTime(new Date(subject.createdAt))
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              <span>
                {subject.updatedAt && !isNaN(new Date(subject.updatedAt).getTime())
                  ? formatDateTime(new Date(subject.updatedAt))
                  : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Lecturers Section */}
        <Card className="border border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-500" />
                <CardTitle>Lecturers</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                {lecturers.length} assigned
              </span>
            </div>
            <CardDescription>Lecturers assigned to this subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assignment Mode:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={!bulkModeLecturer ? "default" : "outline"}
                  onClick={() => {
                    setBulkModeLecturer(false);
                    setSelectedLecturerIds([]);
                  }}
                  className="cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Single
                </Button>
                <Button
                  size="sm"
                  variant={bulkModeLecturer ? "default" : "outline"}
                  onClick={() => {
                    setBulkModeLecturer(true);
                    setSelectedLecturerId("");
                  }}
                  className="cursor-pointer"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Bulk
                </Button>
              </div>
            </div>

            {/* Assign Lecturer */}
            {!bulkModeLecturer ? (
              <div className="flex gap-2">
                <Select
                  value={selectedLecturerId}
                  onValueChange={setSelectedLecturerId}
                  disabled={assigningLecturer || availableLecturers.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select lecturer to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLecturers.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} ({lecturer.nim})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignLecturer}
                  disabled={!selectedLecturerId || assigningLecturer || availableLecturers.length === 0}
                  size="icon"
                  className="cursor-pointer"
                >
                  {assigningLecturer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {availableLecturers.length > 0 && (
                  <div className="flex items-center justify-between p-2 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          availableLecturers.length > 0 &&
                          selectedLecturerIds.length === availableLecturers.length
                        }
                        onCheckedChange={toggleSelectAllLecturers}
                      />
                      <span className="text-sm font-medium">
                        Select All ({availableLecturers.length} available)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedLecturerIds.length} selected
                    </span>
                  </div>
                )}
                <div className="max-h-[200px] overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                  {availableLecturers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All lecturers are already assigned
                    </p>
                  ) : (
                    availableLecturers.map((lecturer) => (
                      <div
                        key={lecturer.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedLecturerIds.includes(lecturer.id)}
                          onCheckedChange={() => toggleLecturerSelection(lecturer.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lecturer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lecturer.nim}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  onClick={handleAssignLecturer}
                  disabled={selectedLecturerIds.length === 0 || assigningLecturer}
                  className="w-full cursor-pointer"
                >
                  {assigningLecturer ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Assign {selectedLecturerIds.length > 0 ? `${selectedLecturerIds.length} ` : ""}Lecturer{selectedLecturerIds.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Lecturers List */}
            <div className="space-y-2">
              {lecturers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No lecturers assigned
                </p>
              ) : (
                lecturers.map((lecturer) => (
                  <div
                    key={lecturer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lecturer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lecturer.nim}
                      </p>
                      {lecturer.assignedAt && lecturer.assignedBy && (
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          Assigned {formatDateTime(new Date(lecturer.assignedAt))} by {lecturer.assignedBy}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUnassignClick(lecturer.id, lecturer.name, "LECTURER")
                      }
                      disabled={unassigningId === lecturer.id}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {unassigningId === lecturer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Section */}
        <Card className="border border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                <CardTitle>Students</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                {students.length} enrolled
              </span>
            </div>
            <CardDescription>Students enrolled in this subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assignment Mode:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={!bulkModeStudent ? "default" : "outline"}
                  onClick={() => {
                    setBulkModeStudent(false);
                    setSelectedStudentIds([]);
                  }}
                  className="cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Single
                </Button>
                <Button
                  size="sm"
                  variant={bulkModeStudent ? "default" : "outline"}
                  onClick={() => {
                    setBulkModeStudent(true);
                    setSelectedStudentId("");
                  }}
                  className="cursor-pointer"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Bulk
                </Button>
              </div>
            </div>

            {/* Assign Student */}
            {!bulkModeStudent ? (
              <div className="flex gap-2">
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  disabled={assigningStudent || availableStudents.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select student to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.nim})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignStudent}
                  disabled={!selectedStudentId || assigningStudent || availableStudents.length === 0}
                  size="icon"
                  className="cursor-pointer"
                >
                  {assigningStudent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {availableStudents.length > 0 && (
                  <div className="flex items-center justify-between p-2 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={
                          availableStudents.length > 0 &&
                          selectedStudentIds.length === availableStudents.length
                        }
                        onCheckedChange={toggleSelectAllStudents}
                      />
                      <span className="text-sm font-medium">
                        Select All ({availableStudents.length} available)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedStudentIds.length} selected
                    </span>
                  </div>
                )}
                <div className="max-h-[200px] overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                  {availableStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All students are already assigned
                    </p>
                  ) : (
                    availableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {student.nim}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  onClick={handleAssignStudent}
                  disabled={selectedStudentIds.length === 0 || assigningStudent}
                  className="w-full cursor-pointer"
                >
                  {assigningStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Assign {selectedStudentIds.length > 0 ? `${selectedStudentIds.length} ` : ""}Student{selectedStudentIds.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Students List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No students enrolled
                </p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.nim}
                      </p>
                      {student.assignedAt && student.assignedBy && (
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          Assigned {formatDateTime(new Date(student.assignedAt))} by {student.assignedBy}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUnassignClick(student.id, student.name, "STUDENT")
                      }
                      disabled={unassigningId === student.id}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {unassigningId === student.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassign Confirmation Dialog */}
      <AlertDialog
        open={confirmUnassign.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmUnassign({ open: false, userId: null, userName: "", userRole: "STUDENT" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign {confirmUnassign.userRole}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign "{confirmUnassign.userName}" from this
              subject? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:text-white"
            >
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

