/* eslint-disable @typescript-eslint/no-explicit-any */
import { authorize } from "./Authenticate";
import { res } from "./Response";

const Restriction = <T extends (...args: any[]) => Promise<any>>(
  handler: T,
  roles: string[]
) => {
  return async (...args: Parameters<T>) => {
    try {
      const user = await authorize(roles);
      if (!user) {
        return res(false, {
          message:
            "Forbidden: Unauthorized access. Please ensure you are logged in with the required role.",
        });
      }
      return handler(...args);
    } catch {
      return res(false, { message: "Authorization error occurred" });
    }
  };
};

export { Restriction };
