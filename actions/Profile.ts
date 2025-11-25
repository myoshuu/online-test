"use server";

import bcrypt from "bcryptjs";
import path from "path";
import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { prisma } from "@/helpers/Prisma";
import { authenticate } from "@/helpers/Authenticate";
import { res } from "@/helpers/Response";
import {
  updateProfilePasswordSchema,
  type UpdateProfilePasswordInput,
} from "@/helpers/Zod";

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

const ensureAvatarDir = async () => {
  await mkdir(AVATAR_DIR, { recursive: true });
};

const removeExistingAvatar = async (avatarUrl?: string | null) => {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) {
    return;
  }

  try {
    const absolutePath = path.join(process.cwd(), "public", avatarUrl);
    await stat(absolutePath);
    await unlink(absolutePath);
  } catch {
    // File does not exist or cannot be removed; ignore silently.
  }
};

export const getProfile = async () => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER" && user.role !== "STUDENT")) {
      return res(false, { message: "Unauthorized" });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        nim: true,
        role: true,
        avatarUrl: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return res(false, { message: "User not found" });
    }

    return res(true, {
      profile: {
        ...profile,
        lastLogin: profile.lastLogin?.toISOString() ?? null,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res(false, { message: "Failed to load profile" });
  }
};

export const updateProfilePassword = async (
  data: UpdateProfilePasswordInput
) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER")) {
      return res(false, { message: "Unauthorized" });
    }

    const parsed = updateProfilePasswordSchema.safeParse(data);
    if (!parsed.success) {
      return res(false, {
        message: "Invalid input",
        err: parsed.error.flatten(),
      });
    }

    const { currentPassword, newPassword } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!existingUser) {
      return res(false, { message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isMatch) {
      return res(false, { message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedBy: user.id,
      },
    });

    return res(true, { message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res(false, { message: "Failed to update password" });
  }
};

export const updateProfileAvatar = async (formData: FormData) => {
  try {
    const user = await authenticate();
    if (!user || (user.role !== "ADMIN" && user.role !== "LECTURER" && user.role !== "STUDENT")) {
      return res(false, { message: "Unauthorized" });
    }

    const file = formData.get("avatar");
    if (!file || !(file instanceof File)) {
      return res(false, { message: "No image uploaded" });
    }

    if (!file.type.startsWith("image/")) {
      return res(false, { message: "Only image files are allowed" });
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return res(false, { message: "Image must be 2MB or smaller" });
    }

    await ensureAvatarDir();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extensionFromType = file.type.split("/")[1];
    const originalExt = file.name?.split(".").pop();
    const extension = extensionFromType || originalExt || "png";

    const fileName = `${user.id}-${Date.now()}.${extension}`;
    const absolutePath = path.join(AVATAR_DIR, fileName);
    await writeFile(absolutePath, buffer);

    const relativePath = `/uploads/avatars/${fileName}`;

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: relativePath,
        updatedBy: user.id,
      },
    });

    await removeExistingAvatar(currentUser?.avatarUrl);

    return res(true, {
      message: "Profile picture updated successfully",
      avatarUrl: relativePath,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return res(false, { message: "Failed to update profile picture" });
  }
};

