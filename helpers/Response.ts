/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Response<T = any> {
  success: boolean;
  data?: T;
}

export const res = <T>(success: boolean, data?: T): Response<T> => {
  return {
    success,
    ...(data !== undefined && { data }),
  };
};
