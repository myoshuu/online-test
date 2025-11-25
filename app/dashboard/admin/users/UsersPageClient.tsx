"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  Users,
  Shield,
  GraduationCap,
  UserCheck,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { toggleUserStatus, deleteUser } from "@/actions/Auth";
import { useModal } from "@/components/ui/modal-provider";
import { toast } from "sonner";

type UserWithRole = {
  id: string;
  name: string;
  nim: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  updatedByName: string;
};

const getRoleIcon = (role: "ADMIN" | "LECTURER" | "STUDENT") => {
  switch (role) {
    case "ADMIN":
      return Shield;
    case "LECTURER":
      return UserCheck;
    case "STUDENT":
      return GraduationCap;
    default:
      return Users;
  }
};

const getRoleColor = (role: "ADMIN" | "LECTURER" | "STUDENT") => {
  switch (role) {
    case "ADMIN":
      return "text-red-500";
    case "LECTURER":
      return "text-blue-500";
    case "STUDENT":
      return "text-purple-500";
    default:
      return "text-muted-foreground";
  }
};

interface UsersPageClientProps {
  initialUsers: UserWithRole[];
}

const UsersPageClient = ({ initialUsers }: UsersPageClientProps) => {
  const router = useRouter();
  const { showModal } = useModal();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserWithRole[]>(initialUsers);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{
    open: boolean;
    userId: string | null;
    isActive: boolean;
  }>({ open: false, userId: null, isActive: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    userId: string | null;
    userName: string;
  }>({ open: false, userId: null, userName: "" });

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    if (!search.trim()) {
      return users;
    }

    const searchLower = search.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.nim.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  // Group filtered users by role
  const usersByRole = useMemo(() => {
    return {
      ADMIN: filteredUsers.filter((u) => u.role === "ADMIN"),
      LECTURER: filteredUsers.filter((u) => u.role === "LECTURER"),
      STUDENT: filteredUsers.filter((u) => u.role === "STUDENT"),
    };
  }, [filteredUsers]);

  const handleToggleStatusClick = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setConfirmToggle({
          open: true,
          userId,
          isActive: user.isActive,
        });
      }
    },
    [users]
  );

  const handleToggleStatus = useCallback(async () => {
    if (!confirmToggle.userId) return;

    setTogglingId(confirmToggle.userId);
    setConfirmToggle({ open: false, userId: null, isActive: false });

    try {
      const result = await toggleUserStatus(confirmToggle.userId);
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmToggle.userId ? { ...u, isActive: !u.isActive } : u
          )
        );
        showModal({
          title: "Status Updated",
          description: `User has been ${
            confirmToggle.isActive ? "deactivated" : "activated"
          } successfully.`,
          variant: "success",
        });
      } else {
        showModal({
          title: "Update Failed",
          description: result.data?.message || "Failed to update user status",
          variant: "error",
        });
      }
    } catch {
      showModal({
        title: "Error",
        description: "An error occurred while updating user status",
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }, [confirmToggle, showModal]);

  const handleDeleteClick = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setConfirmDelete({
          open: true,
          userId,
          userName: user.name,
        });
      }
    },
    [users]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDelete.userId) return;

    setDeletingId(confirmDelete.userId);
    setConfirmDelete({ open: false, userId: null, userName: "" });

    try {
      const result = await deleteUser(confirmDelete.userId);
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.userId));
        toast.success("User Deleted", {
          description: `"${confirmDelete.userName}" has been deleted successfully.`,
        });
      } else {
        toast.error("Delete Failed", {
          description: result.data?.message || "Failed to delete user",
        });
      }
    } catch {
      toast.error("Error", {
        description: "An error occurred while deleting user",
      });
    } finally {
      setDeletingId(null);
    }
  }, [confirmDelete]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Users Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and manage all platform users
        </p>
      </div>

      {/* Search Bar and Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} user
            {users.length === 1 ? "" : "s"}
          </div>
          <Button
            onClick={() => router.push("/dashboard/admin/users/create")}
            className="cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NIM
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Login
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-muted-foreground text-sm"
                >
                  {search
                    ? "No users found. Try adjusting your search."
                    : "No users found. There are no users registered in the system yet."}
                </td>
              </tr>
            ) : (
              <>
                {/* ADMIN Users */}
                {usersByRole.ADMIN.map((user) => {
                  const Icon = getRoleIcon(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
                            <Icon
                              className={`w-4 h-4 ${getRoleColor(user.role)}`}
                            />
                          </div>
                          <p className="font-semibold text-sm">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono">
                        {user.nim}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {user.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            title={
                              user.isActive
                                ? "Deactivate user"
                                : "Activate user"
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                              user.isActive
                                ? "border-orange-200 text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                            } ${
                              togglingId === user.id
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            disabled={togglingId === user.id}
                            onClick={() => handleToggleStatusClick(user.id)}
                          >
                            {togglingId === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : user.isActive ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatDate(new Date(user.lastLogin))
                          : "Never"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.createdAt &&
                            !isNaN(new Date(user.createdAt).getTime())
                              ? formatDateTime(new Date(user.createdAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.createdByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.updatedAt &&
                            !isNaN(new Date(user.updatedAt).getTime())
                              ? formatDateTime(new Date(user.updatedAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.updatedByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() =>
                              router.push(`/dashboard/admin/users/${user.id}`)
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
                                `/dashboard/admin/users/${user.id}/edit`
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
                            disabled={deletingId === user.id}
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* LECTURER Users */}
                {usersByRole.LECTURER.map((user) => {
                  const Icon = getRoleIcon(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                            <Icon
                              className={`w-4 h-4 ${getRoleColor(user.role)}`}
                            />
                          </div>
                          <p className="font-semibold text-sm">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono">
                        {user.nim}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {user.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            title={
                              user.isActive
                                ? "Deactivate user"
                                : "Activate user"
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                              user.isActive
                                ? "border-orange-200 text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                            } ${
                              togglingId === user.id
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            disabled={togglingId === user.id}
                            onClick={() => handleToggleStatusClick(user.id)}
                          >
                            {togglingId === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : user.isActive ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatDate(new Date(user.lastLogin))
                          : "Never"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.createdAt &&
                            !isNaN(new Date(user.createdAt).getTime())
                              ? formatDateTime(new Date(user.createdAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.createdByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.updatedAt &&
                            !isNaN(new Date(user.updatedAt).getTime())
                              ? formatDateTime(new Date(user.updatedAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.updatedByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() =>
                              router.push(`/dashboard/admin/users/${user.id}`)
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
                                `/dashboard/admin/users/${user.id}/edit`
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
                            disabled={deletingId === user.id}
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* STUDENT Users */}
                {usersByRole.STUDENT.map((user) => {
                  const Icon = getRoleIcon(user.role);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                            <Icon
                              className={`w-4 h-4 ${getRoleColor(user.role)}`}
                            />
                          </div>
                          <p className="font-semibold text-sm">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono">
                        {user.nim}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {user.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            type="button"
                            title={
                              user.isActive
                                ? "Deactivate user"
                                : "Activate user"
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                              user.isActive
                                ? "border-orange-200 text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                            } ${
                              togglingId === user.id
                                ? "opacity-60 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            disabled={togglingId === user.id}
                            onClick={() => handleToggleStatusClick(user.id)}
                          >
                            {togglingId === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : user.isActive ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatDate(new Date(user.lastLogin))
                          : "Never"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.createdAt &&
                            !isNaN(new Date(user.createdAt).getTime())
                              ? formatDateTime(new Date(user.createdAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.createdByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>
                            {user.updatedAt &&
                            !isNaN(new Date(user.updatedAt).getTime())
                              ? formatDateTime(new Date(user.updatedAt))
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            by {user.updatedByName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() =>
                              router.push(`/dashboard/admin/users/${user.id}`)
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
                                `/dashboard/admin/users/${user.id}/edit`
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
                            disabled={deletingId === user.id}
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog
        open={confirmToggle.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmToggle({ open: false, userId: null, isActive: false })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle.isActive ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              {confirmToggle.isActive ? "deactivate" : "activate"} this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className="cursor-pointer"
            >
              {confirmToggle.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={confirmDelete.open}
        onOpenChange={(open) =>
          !open && setConfirmDelete({ open: false, userId: null, userName: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{confirmDelete.userName}
              &quot;? This action cannot be undone.
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
    </div>
  );
};

export default UsersPageClient;
