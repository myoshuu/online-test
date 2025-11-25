import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/";
const ACTIVE_EXAM_COOKIE = "activeExam";

const secret = new TextEncoder().encode(
  process.env.SECRET_KEY || "secret-key"
);

async function isTokenValid(token?: string | null) {
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, secret);
    return true;
  } catch (error) {
    console.warn("JWT verification failed in middleware:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value ?? null;
  const activeExamCookie = request.cookies.get(ACTIVE_EXAM_COOKIE)?.value;
  const isDashboardRoute = pathname.startsWith(DASHBOARD_PATH);

  let cachedTokenValid: boolean | null = null;
  const ensureTokenValid = async () => {
    if (!token) {
      return false;
    }
    if (cachedTokenValid === null) {
      cachedTokenValid = await isTokenValid(token);
    }
    return cachedTokenValid;
  };

  if (token && activeExamCookie) {
    try {
      const parsed = JSON.parse(activeExamCookie) as { testId?: string };
      if (
        parsed?.testId &&
        !pathname.startsWith(`/exam/${parsed.testId}`) &&
        (await ensureTokenValid())
      ) {
        return NextResponse.redirect(
          new URL(`/exam/${parsed.testId}`, request.url)
        );
      }
    } catch (error) {
      console.warn("Failed to parse active exam cookie:", error);
    }
  }

  if (isDashboardRoute) {
    const valid = await ensureTokenValid();
    if (!valid) {
      const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
      response.cookies.delete("token");
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};

