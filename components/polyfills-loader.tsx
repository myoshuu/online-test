"use client";

import { useEffect } from "react";

export function PolyfillsLoader() {
  useEffect(() => {
    // Polyfills for older browser support
    // Object.assign polyfill (for very old browsers)
    if (typeof Object.assign !== "function") {
      Object.assign = function (target: any, ...sources: any[]) {
        if (target == null) {
          throw new TypeError("Cannot convert undefined or null to object");
        }
        const to = Object(target);
        for (let index = 0; index < sources.length; index++) {
          const nextSource = sources[index];
          if (nextSource != null) {
            for (const nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      };
    }

    // Array.from polyfill (for IE11 and older)
    if (!Array.from) {
      Array.from = function <T>(arrayLike: ArrayLike<T> | Iterable<T>): T[] {
        if (arrayLike == null) {
          throw new TypeError("Array.from requires an array-like object - not null or undefined");
        }
        const items = Object(arrayLike);
        const len = parseInt(String(items.length), 10) || 0;
        const A = new Array(len);
        let k = 0;
        while (k < len) {
          k += 1;
          if (k in items) {
            A[k - 1] = items[k];
          }
        }
        return A;
      };
    }

    // Promise polyfill check (Next.js includes this, but we ensure it's available)
    if (typeof Promise === "undefined") {
      console.warn("Promise is not available. Please include a Promise polyfill.");
    }

    // Fetch polyfill check
    if (typeof fetch === "undefined") {
      console.warn("Fetch is not available. Please include a fetch polyfill.");
    }

    // Ensure console methods exist
    if (typeof console === "undefined") {
      (window as any).console = {
        log: () => {},
        warn: () => {},
        error: () => {},
        info: () => {},
      };
    }

    // Object.entries polyfill (for very old browsers)
    if (!Object.entries) {
      Object.entries = function (obj: any): [string, any][] {
        const ownProps = Object.keys(obj);
        let i = ownProps.length;
        const resArray = new Array(i);
        while (i--) {
          resArray[i] = [ownProps[i], obj[ownProps[i]]];
        }
        return resArray;
      };
    }
  }, []);

  return null;
}

