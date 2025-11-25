"use server";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const authenticate = async () => {
  const cookie = await cookies();
  const token = cookie.get("token")?.value;
  if (!token) {
    return null;
  }

  try {
    const decode = jwt.verify(
      token,
      process.env.SECRET_KEY || "secret-key"
    ) as {
      id: string;
      nim: string;
      role: "ADMIN" | "LECTURER" | "STUDENT";
    };

    return decode;
  } catch (error) {
    console.error("Token verification error:", error);
    if (error instanceof jwt.TokenExpiredError) return null;
    return null;
  }
};

export const authorize = async (roles: string[]) => {
  const user = await authenticate();
  if (!user) {
    return null;
  }

  if (!roles.includes(user.role)) {
    return null;
  }

  return user;
};
