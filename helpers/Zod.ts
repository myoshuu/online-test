import { z } from "zod";

export const loginSchema = z.object({
  nim: z.string().min(1, "Please enter a valid NIM"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  nim: z.string().min(1, "Please enter a valid NIM"),
  role: z.enum(["ADMIN", "LECTURER", "STUDENT"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const createTestFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    subjectId: z.string().min(1, "Subject is required"),
    startDate: z.string().optional(),
    startTime: z.string().optional(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine(
    (values) => {
      if (values.startTime && !values.startDate) {
        return false;
      }
      if (values.endTime && !values.endDate) {
        return false;
      }
      return true;
    },
    {
      message: "Start/end time requires a corresponding date",
      path: ["startDate"],
    }
  );

export type CreateTestFormInput = z.infer<typeof createTestFormSchema>;

export const questionFormSchema = z.object({
  question: z.string().trim().min(1, "Question text is required"),
  isCorrect: z.boolean().nullable().optional(),
});

export const bulkQuestionsSchema = z
  .array(questionFormSchema)
  .min(1, "Please add at least one question");

export type QuestionFormInput = z.infer<typeof questionFormSchema>;

export const updateProfilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

export type UpdateProfilePasswordInput = z.infer<
  typeof updateProfilePasswordSchema
>;

export const updateProfileAvatarSchema = z.object({
  avatar: z
    .any()
    .refine(
      (files) => files instanceof FileList && files.length > 0,
      "Please select an image file"
    )
    .refine((files) => {
      if (!files || !(files instanceof FileList) || files.length === 0) {
        return false;
      }
      const file = files.item(0);
      if (!file) return false;
      return file.type.startsWith("image/");
    }, "Only image files are allowed")
    .refine((files) => {
      if (!files || !(files instanceof FileList) || files.length === 0) {
        return false;
      }
      const file = files.item(0);
      if (!file) return false;
      const maxSize = 2 * 1024 * 1024; // 2MB
      return file.size <= maxSize;
    }, "Image must be 2MB or smaller"),
});

export type UpdateProfileAvatarInput = z.infer<
  typeof updateProfileAvatarSchema
>;
