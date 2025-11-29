"use client";

import { useEffect } from "react";

export function PolyfillsLoader() {
  useEffect(() => {
    // Load polyfills only on client side
    import("../app/polyfills");
  }, []);

  return null;
}

