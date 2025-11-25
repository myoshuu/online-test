"use server";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/helpers/Prisma";
import { res } from "@/helpers/Response";
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "@/helpers/Zod";
import { authenticate } from "@/helpers/Authenticate";

interface GetUsersParams {
  search?: string;
  role?: "ADMIN" | "LECTURER" | "STUDENT" | "ALL";
  isActive?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export const register = async (
  req: RegisterInput,
  createdByUserId?: string
) => {
  try {
    const parsed = registerSchema.safeParse(req);
    if (!parsed.success)
      return res(false, {
        message: "Invalid input",
        err: parsed.error.flatten(),
      });

    const { name, nim, password, role } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { nim },
    });

    if (existing)
      return res(false, {
        message: `User with NIM: ${nim} already exists`,
      });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        nim,
        password: hashedPassword,
        role: role || "STUDENT",
        ...(createdByUserId && {
          createdBy: createdByUserId,
          updatedBy: createdByUserId,
        }),
      },
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res(true, {
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res(false, {
      message: "Internal server error, during registration process",
    });
  }
};

export const login = async (req: LoginInput) => {
  try {
    const parsed = loginSchema.safeParse(req);
    if (!parsed.success)
      return res(false, {
        message: "Invalid input",
        err: parsed.error.flatten(),
      });

    const { nim, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { nim },
    });

    if (!user)
      return res(false, {
        message: `Oops! There's no account with NIM: ${nim}`,
      });

    if (!user.isActive)
      return res(false, {
        message: `Your account has been deactivated by System! Please contact the administrator!`,
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res(false, { message: "Invalid credentials. Please try again" });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      {
        id: user.id,
        nim: user.nim,
        role: user.role,
      },
      process.env.SECRET_KEY || "secret-key",
      {
        expiresIn: "7d",
      }
    );

    const cookie = await cookies();
    cookie.set("token", token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res(true, {
      message: `Login success! Welcome, ${user.name}`,
      role: user.role,
    });
  } catch {
    return res(false, {
      message: "Internal server error, during login process",
    });
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await authenticate();
    if (!user) {
      return res(false, { message: "Unauthorized" });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        avatarUrl: true,
      },
    });

    if (!userData) {
      return res(false, { message: "User not found" });
    }

    return res(true, { user: userData });
  } catch {
    return res(false, {
      message: "Internal server error, during fetching user process",
    });
  }
};

export const logout = async () => {
  try {
    const cookie = await cookies();
    cookie.delete("token");

    return res(true, { message: "Logout successful" });
  } catch {
    return res(false, { message: "Failed to logout" });
  }
};

// User Management Functions

export const getUsers = async (params: GetUsersParams = {}) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const {
      search = "",
      role = "ALL",
      isActive = "ALL",
      page = 1,
      limit = 10,
    } = params;

    // Build where clause
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        nim?: { contains: string; mode: "insensitive" };
      }>;
      role?: "ADMIN" | "LECTURER" | "STUDENT";
      isActive?: boolean;
    } = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { nim: { contains: search, mode: "insensitive" as const } },
      ];
    }

    // Role filter
    if (role !== "ALL") {
      where.role = role;
    }

    // Active status filter
    if (isActive !== "ALL") {
      where.isActive = isActive;
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get users with role-based ordering (ADMIN, LECTURER, STUDENT)
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: [
        {
          role: "asc", // Orders by enum definition: ADMIN, LECTURER, STUDENT
        },
        {
          createdAt: "desc", // Then by creation date (newest first)
        },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get unique creator and updater IDs
    const creatorIds = users
      .map((u) => u.createdBy)
      .filter((id): id is string => id !== null);
    const updaterIds = users
      .map((u) => u.updatedBy)
      .filter((id): id is string => id !== null);
    const allUserIds = [...new Set([...creatorIds, ...updaterIds])];

    // Fetch creator/updater user info
    const userMap: Record<string, { name: string; nim: string }> = {};
    if (allUserIds.length > 0) {
      const relatedUsers = await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, name: true, nim: true },
      });
      relatedUsers.forEach((u) => {
        userMap[u.id] = { name: u.name, nim: u.nim };
      });
    }

    // Attach creator/updater info to users
    const usersWithInfo = users.map((user) => ({
      ...user,
      createdByName: user.createdBy
        ? userMap[user.createdBy]?.name || "Unknown"
        : "System",
      updatedByName: user.updatedBy
        ? userMap[user.updatedBy]?.name || "Unknown"
        : "System",
    }));

    return res(true, {
      users: usersWithInfo,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res(false, {
      message: "Internal server error, during fetching users process",
    });
  }
};

export const createUser = async (
  data: Omit<RegisterInput, "password"> & { password?: string }
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Auto-generate password from NIM if password is not provided
    const password = data.password || data.nim;

    // Use the register function with auto-generated password
    return await register({ ...data, password }, user.id);
  } catch (error) {
    console.error("Error creating user:", error);
    return res(false, {
      message: "Internal server error, during user creation process",
    });
  }
};

export const updateUser = async (
  userId: string,
  data: Partial<RegisterInput & { isActive?: boolean }>
) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res(false, { message: "User not found" });
    }

    // If NIM is being updated, check for duplicates
    if (data.nim && data.nim !== existingUser.nim) {
      const duplicate = await prisma.user.findFirst({
        where: { nim: data.nim },
      });

      if (duplicate) {
        return res(false, {
          message: `User with NIM: ${data.nim} already exists`,
        });
      }
    }

    const updateData: {
      updatedBy: string;
      name?: string;
      nim?: string;
      role?: "ADMIN" | "LECTURER" | "STUDENT";
      password?: string;
      isActive?: boolean;
    } = {
      updatedBy: user.id,
    };

    if (data.name) updateData.name = data.name;
    if (data.nim) updateData.nim = data.nim;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return res(true, {
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res(false, {
      message: "Internal server error, during user update process",
    });
  }
};

export const getUserById = async (userId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    const foundUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!foundUser) {
      return res(false, { message: "User not found" });
    }

    return res(true, { user: foundUser });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res(false, {
      message: "Internal server error, during user fetch process",
    });
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return res(false, { message: "You cannot delete your own account" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res(false, { message: "User not found" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res(true, {
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res(false, {
      message: "Internal server error, during user deletion process",
    });
  }
};

export const toggleUserStatus = async (userId: string) => {
  try {
    const user = await authenticate();
    if (!user || user.role !== "ADMIN") {
      return res(false, { message: "Unauthorized" });
    }

    // Prevent deactivating yourself
    if (userId === user.id) {
      return res(false, { message: "You cannot deactivate your own account" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!existingUser) {
      return res(false, { message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !existingUser.isActive,
        updatedBy: user.id,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    return res(true, {
      message: `User ${
        updatedUser.isActive ? "activated" : "deactivated"
      } successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return res(false, {
      message: "Internal server error, during user status toggle process",
    });
  }
};
