import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1MB, too small for uploaded contract PDFs.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
