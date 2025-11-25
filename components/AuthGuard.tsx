"use client";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Middleware plus server-side redirects already protect dashboard routes.
 * This component simply renders its children, keeping the API surface
 * intact for existing layout usage without triggering client-side loops.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>;
}
