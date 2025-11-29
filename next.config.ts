import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",

  // Configure SWC compiler for older browser support
  // Next.js will automatically use browserslist configuration
  compiler: {
    // Remove console.log in production (optional)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Transpile node_modules that might have modern JS
  // Add package names here if they cause compatibility issues
  transpilePackages: [],
};

export default nextConfig;
